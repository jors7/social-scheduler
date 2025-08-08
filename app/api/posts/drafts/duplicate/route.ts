import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
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

    const { draftId } = await request.json()

    // Get original draft
    const { data: originalDraft, error: fetchError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !originalDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Create duplicate
    const { data: newDraft, error: createError } = await supabase
      .from('drafts')
      .insert({
        user_id: user.id,
        title: `${originalDraft.title} (Copy)`,
        content: originalDraft.content,
        platforms: originalDraft.platforms,
        platform_content: originalDraft.platform_content,
        media_urls: originalDraft.media_urls,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Create draft error:', createError)
      return NextResponse.json({ error: 'Failed to duplicate draft' }, { status: 500 })
    }

    return NextResponse.json(newDraft)
  } catch (error) {
    console.error('Duplicate draft error:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate draft' },
      { status: 500 }
    )
  }
}