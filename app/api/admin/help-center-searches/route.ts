import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!subscription || !['admin', 'super_admin'].includes(subscription.role || '')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const hadAnswer = searchParams.get('had_answer')
    const search = searchParams.get('search')

    // Build query for searches
    let query = supabase
      .from('help_center_searches')
      .select(`
        id,
        query,
        results_count,
        had_ai_answer,
        source_article_id,
        user_id,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (hadAnswer === 'true') {
      query = query.eq('had_ai_answer', true)
    } else if (hadAnswer === 'false') {
      query = query.eq('had_ai_answer', false)
    }

    if (search) {
      query = query.ilike('query', `%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: searches, count, error } = await query

    if (error) {
      console.error('Error fetching help center searches:', error)
      return NextResponse.json(
        { error: 'Failed to fetch searches' },
        { status: 500 }
      )
    }

    // Get stats - count total and answered
    const { count: totalCount } = await supabase
      .from('help_center_searches')
      .select('*', { count: 'exact', head: true })

    const { count: answeredCount } = await supabase
      .from('help_center_searches')
      .select('*', { count: 'exact', head: true })
      .eq('had_ai_answer', true)

    const totalSearches = totalCount || 0
    const answeredSearches = answeredCount || 0
    const unansweredSearches = totalSearches - answeredSearches

    return NextResponse.json({
      searches: searches || [],
      total: count || 0,
      stats: {
        totalSearches,
        answeredSearches,
        unansweredSearches,
        answerRate: totalSearches > 0 ? Math.round((answeredSearches / totalSearches) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Error in help center searches API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
