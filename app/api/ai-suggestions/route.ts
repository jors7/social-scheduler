import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkAndIncrementUsage } from '@/lib/subscription/usage'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { content, platforms, tone, includeHashtags, includeEmojis, context } = await request.json()

    // Initialize OpenAI only when needed
    const openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Check authentication - moved inside the handler
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if we can use AI suggestions (check limit for +1 but don't increment yet)
    const { checkUsageOnly } = await import('@/lib/subscription/usage')
    const usageCheck = await checkUsageOnly('ai_suggestions')
    console.log('AI suggestions usage check:', usageCheck)
    
    if (!usageCheck.allowed) {
      return NextResponse.json({ 
        error: 'AI suggestion limit exceeded',
        message: usageCheck.message,
        usage: {
          current: usageCheck.currentUsage,
          limit: usageCheck.limit
        }
      }, { status: 403 })
    }

    const platformInfo = platforms.map((p: string) => {
      const limits: Record<string, number> = {
        twitter: 280,
        instagram: 2200,
        facebook: 63206,
        linkedin: 3000,
        youtube: 5000,
        tiktok: 2200,
        threads: 500,
        bluesky: 300,
        pinterest: 500
      }
      return `${p} (${limits[p] || 2200} char limit)`
    }).join(', ')

    const toneInstructions: Record<string, string> = {
      professional: 'professional, business-focused, authoritative',
      casual: 'friendly, conversational, approachable',
      inspiring: 'motivational, uplifting, encouraging'
    }

    // Build detailed context
    const contextParts = []

    if (context) {
      contextParts.push(`**Topic:** ${context.topic}`)

      if (context.keyMessage) {
        contextParts.push(`**Key Message:** ${context.keyMessage}`)
      }

      if (context.audience) {
        contextParts.push(`**Target Audience:** ${context.audience}`)
      }

      if (context.cta && context.cta.length > 0) {
        const ctaMap: Record<string, string> = {
          'visit': 'Visit our website',
          'comment': 'Comment below with your thoughts',
          'share': 'Share this post',
          'signup': 'Sign up now',
          'learn-more': 'Learn more',
          'shop': 'Shop now',
        }
        const ctaTexts = context.cta.map((c: string) => ctaMap[c] || c)
        contextParts.push(`**Desired Call-to-Action:** ${ctaTexts.join(', ')}`)
      }
    }

    const contextSection = contextParts.length > 0 ? contextParts.join('\n') : ''

    const prompt = `You are a social media caption specialist, known for crafting engaging, authentic, and scroll-stopping captions.

Write ONE captivating social media caption based on the details provided below:

${contextSection}

**Tone:** ${toneInstructions[tone] || 'casual'}
**Platform(s):** ${platforms.join(', ')}
${content ? `**Additional Context:** ${content}` : ''}

Instructions:

1. **Length:** 150-200 words
2. **Structure:**
   - **Hook** (first line that grabs attention immediately)
   - **Body** (value-driven story, tips, insights, or information that resonates with the audience)
   - **CTA** (clear, compelling call-to-action)
3. **Formatting:**
   - Use line breaks for readability
   - Include emojis sparingly (1-3 max) where they add value
   - Use bullet points if presenting a list
4. **Hashtags:** Include 3-5 relevant, searchable hashtags at the end
5. **Make it:** Authentic, relatable, and valuable to the target audience

Return your response as a JSON object with this exact structure:
{
  "content": "The complete caption with line breaks as \\n",
  "tone": "${tone}",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "platforms": ["${platforms.join('", "')}"],
  "characterCount": number
}

Important: Return ONLY the JSON object, no additional text or markdown.`

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a social media caption specialist, known for crafting engaging, authentic, and scroll-stopping captions. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 1000,
    })

    const responseContent = completion.choices[0]?.message?.content?.trim()
    
    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response (expecting single object now)
    let suggestion: any
    try {
      suggestion = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Convert to array format for compatibility (single item)
    const formattedSuggestions = [{
      id: `openai-${Date.now()}`,
      content: suggestion.content,
      tone: suggestion.tone,
      hashtags: suggestion.hashtags || [],
      platforms: suggestion.platforms || platforms,
      characterCount: suggestion.characterCount || suggestion.content.length
    }]

    // Increment usage after successful generation
    console.log('Incrementing AI suggestions usage...')
    const incrementResult = await checkAndIncrementUsage('ai_suggestions', 1, false)
    console.log('AI usage incremented:', incrementResult)

    return NextResponse.json({ suggestions: formattedSuggestions })

  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}