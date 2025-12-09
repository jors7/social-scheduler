import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, platforms } = await request.json()

    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const prompt = `
Generate 10-15 relevant hashtags for this social media content: "${content}"

Requirements:
- Platforms: ${platforms.join(', ')}
- Mix of popular and niche hashtags
- Relevant to the content topic
- Include trending hashtags when appropriate
- Format: Return as a simple array of hashtags with # symbols

Return ONLY a JSON array of hashtag strings, like: ["#hashtag1", "#hashtag2", "#hashtag3"]
`

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a social media hashtag expert. Generate relevant, trending hashtags that will help content reach the right audience. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 300,
    })

    const responseContent = completion.choices[0]?.message?.content?.trim()
    
    if (!responseContent) {
      throw new Error('No hashtag response from OpenAI')
    }

    try {
      const hashtags = JSON.parse(responseContent)
      return NextResponse.json({ hashtags })
    } catch (parseError) {
      console.error('Failed to parse hashtag response:', responseContent)
      throw new Error('Invalid hashtag JSON response from OpenAI')
    }

  } catch (error) {
    console.error('OpenAI hashtag generation error:', error)
    return NextResponse.json({ error: 'Failed to generate hashtags' }, { status: 500 })
  }
}