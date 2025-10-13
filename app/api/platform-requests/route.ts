import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all platform requests with aggregated vote counts
    const { data: requests, error } = await supabase
      .from('platform_requests')
      .select('platform_name, vote_count, is_custom')
      .order('vote_count', { ascending: false })

    if (error) {
      console.error('Error fetching platform requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Fetch platforms the current user has voted for
    const { data: userVotes, error: votesError } = await supabase
      .from('platform_votes')
      .select('platform_name')
      .eq('user_id', user.id)

    if (votesError) {
      console.error('Error fetching user votes:', votesError)
      // Continue without user votes rather than failing entirely
    }

    const votedPlatforms = userVotes?.map(v => v.platform_name) || []

    return NextResponse.json({
      requests: requests || [],
      votedPlatforms
    })
  } catch (error) {
    console.error('Error in platform requests API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
