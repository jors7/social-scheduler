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

    const { draftIds } = await request.json()

    if (!draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json({ error: 'No drafts selected' }, { status: 400 })
    }

    // Delete all selected drafts
    const { error: deleteError } = await supabase
      .from('drafts')
      .delete()
      .eq('user_id', user.id)
      .in('id', draftIds)

    if (deleteError) {
      console.error('Bulk delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete drafts' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: draftIds.length 
    })
  } catch (error) {
    console.error('Bulk delete drafts error:', error)
    return NextResponse.json(
      { error: 'Failed to delete drafts' },
      { status: 500 }
    )
  }
}