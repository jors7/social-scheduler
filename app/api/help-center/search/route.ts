import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { searchArticles, FAQArticle } from '@/lib/help-center/articles'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Build context from only the most relevant articles
function buildRelevantContext(articles: FAQArticle[]): string {
  // Only use top 5 most relevant articles to reduce tokens and improve accuracy
  const relevantArticles = articles.slice(0, 5)

  return relevantArticles.map((article, index) =>
    `[Article ${index + 1}: "${article.title}" (ID: ${article.id})]\n${article.content}`
  ).join('\n\n---\n\n')
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // First, find matching articles
    const matchingArticles = searchArticles(query)

    // If OpenAI is not configured, return just the matching articles
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        answer: null,
        articles: matchingArticles.slice(0, 5),
        sourceArticleId: null,
        followUpQuestions: [],
      })
    }

    // Build context from only relevant articles (more efficient than all articles)
    const faqContext = buildRelevantContext(matchingArticles)

    const systemPrompt = `You are a friendly and helpful support assistant for SocialCal, a social media scheduling application that helps users post to Instagram, Facebook, TikTok, Threads, Pinterest, Bluesky, LinkedIn, X (Twitter), and YouTube.

Your tone is:
- Friendly and conversational, but professional
- Concise and to-the-point
- Helpful and supportive

IMPORTANT INSTRUCTIONS:
1. Answer ONLY based on the knowledge base articles provided below
2. If the answer isn't in the articles, say: "I don't have specific information about that. Please contact our support team for help."
3. Keep your answer concise (2-3 sentences max)
4. Use bullet points only if listing 3+ items
5. Don't repeat the question back

Your response MUST be valid JSON with this exact structure:
{
  "answer": "Your concise answer here",
  "sourceArticleId": "article-id-from-the-most-relevant-article-or-null",
  "followUpQuestions": ["Related question 1?", "Related question 2?"]
}

Rules for the JSON response:
- "answer": The direct answer to the user's question (2-3 sentences)
- "sourceArticleId": The ID of the most relevant article used (from the [Article X: ... (ID: xxx)] header), or null if none applies
- "followUpQuestions": 2 related questions the user might want to ask next (based on the topic)

KNOWLEDGE BASE:
${faqContext || 'No relevant articles found for this query.'}`

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}'

    let parsedResponse: {
      answer?: string
      sourceArticleId?: string | null
      followUpQuestions?: string[]
    } = {}

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      // If JSON parsing fails, use the raw text as the answer
      parsedResponse = {
        answer: responseText,
        sourceArticleId: null,
        followUpQuestions: []
      }
    }

    return NextResponse.json({
      answer: parsedResponse.answer || null,
      articles: matchingArticles.slice(0, 5),
      sourceArticleId: parsedResponse.sourceArticleId || null,
      followUpQuestions: parsedResponse.followUpQuestions || [],
    })
  } catch (error) {
    console.error('Help center search error:', error)

    // Fallback to just returning matching articles
    try {
      const body = await request.clone().json()
      const matchingArticles = searchArticles(body.query || '')
      return NextResponse.json({
        answer: null,
        articles: matchingArticles.slice(0, 5),
        sourceArticleId: null,
        followUpQuestions: [],
      })
    } catch {
      return NextResponse.json(
        { error: 'Failed to search' },
        { status: 500 }
      )
    }
  }
}
