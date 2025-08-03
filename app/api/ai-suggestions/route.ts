import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { content, platforms, tone, includeHashtags, includeEmojis } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
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
      professional: 'Use professional, business-focused language. Be authoritative and credible.',
      casual: 'Use friendly, conversational language. Be approachable and relatable.',
      funny: 'Use humor and wit. Be entertaining and engaging.',
      inspiring: 'Use motivational and uplifting language. Be encouraging and positive.',
      educational: 'Use informative and helpful language. Be clear and instructive.',
      mixed: 'Provide a variety of tones - some professional, some casual, some funny, etc.'
    }

    const hashtagGuidance = includeHashtags 
      ? `Include relevant hashtags at the end. Use 3-8 hashtags depending on the platform (fewer for Twitter/LinkedIn, more for Instagram/TikTok).`
      : 'Do not include hashtags.'

    const emojiGuidance = includeEmojis
      ? 'Include appropriate emojis to make the content more engaging.'
      : 'Do not include emojis.'

    const prompt = `
Create 5 engaging social media captions based on this content: "${content}"

Requirements:
- Platforms: ${platformInfo}
- Tone: ${toneInstructions[tone] || toneInstructions.casual}
- ${hashtagGuidance}
- ${emojiGuidance}
- Each caption should be unique and engaging
- Respect character limits for each platform
- Make content shareable and engaging

Format your response as a JSON array of objects with this structure:
[
  {
    "content": "The caption text here",
    "tone": "${tone === 'mixed' ? 'professional|casual|funny|inspiring|educational' : tone}",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "platforms": ["${platforms.join('", "')}"],
    "characterCount": number
  }
]

Important: Return ONLY the JSON array, no additional text.
`

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional social media content creator. Generate engaging captions that perform well across different platforms. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 2000,
    })

    const responseContent = completion.choices[0]?.message?.content?.trim()
    
    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let suggestions: any[]
    try {
      suggestions = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Convert to proper format
    const formattedSuggestions = suggestions.map((suggestion, index) => ({
      id: `openai-${Date.now()}-${index}`,
      content: suggestion.content,
      tone: suggestion.tone,
      hashtags: suggestion.hashtags || [],
      platforms: suggestion.platforms || platforms,
      characterCount: suggestion.characterCount || suggestion.content.length
    }))

    return NextResponse.json({ suggestions: formattedSuggestions })

  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}