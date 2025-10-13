import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Use service role client to bypass RLS for admin queries
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get filter from query params
    const searchParams = request.nextUrl.searchParams
    const typeFilter = searchParams.get('type') || 'all'

    // Build query using admin client
    let query = supabaseAdmin
      .from('platform_requests')
      .select('id, platform_name, vote_count, is_custom, requested_by, created_at, updated_at')
      .order('vote_count', { ascending: false })

    // Apply type filter
    if (typeFilter === 'custom') {
      query = query.eq('is_custom', true)
    } else if (typeFilter === 'suggested') {
      query = query.eq('is_custom', false)
    }

    const { data: requests, error } = await query

    console.log('[Admin Platform Requests] Query result:', {
      requestCount: requests?.length || 0,
      error: error,
      requests: requests
    })

    if (error) {
      console.error('Error fetching platform requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Calculate stats
    const totalRequests = requests?.length || 0
    const customRequests = requests?.filter(r => r.is_custom).length || 0
    const suggestedRequests = requests?.filter(r => !r.is_custom).length || 0
    const totalVotes = requests?.reduce((sum, r) => sum + r.vote_count, 0) || 0

    console.log('[Admin Platform Requests] Stats:', {
      totalRequests,
      customRequests,
      suggestedRequests,
      totalVotes
    })

    return NextResponse.json({
      requests: requests || [],
      stats: {
        totalRequests,
        customRequests,
        suggestedRequests,
        totalVotes
      }
    })
  } catch (error) {
    console.error('Error in admin platform requests API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
