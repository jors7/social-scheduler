import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platformName } = await request.json()

    if (!platformName) {
      return NextResponse.json({ error: 'Platform name is required' }, { status: 400 })
    }

    // Check if platform request already exists
    const { data: existing, error: fetchError } = await supabase
      .from('platform_requests')
      .select('id, vote_count')
      .eq('platform_name', platformName)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching existing request:', fetchError)
      return NextResponse.json({ error: 'Failed to process vote' }, { status: 500 })
    }

    if (existing) {
      // Increment vote count
      const { error: updateError } = await supabase
        .from('platform_requests')
        .update({ vote_count: existing.vote_count + 1 })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating vote count:', updateError)
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
      }
    } else {
      // Create new request
      const { error: insertError } = await supabase
        .from('platform_requests')
        .insert({
          platform_name: platformName,
          vote_count: 1,
          is_custom: false,
          requested_by: user.id
        })

      if (insertError) {
        console.error('Error creating platform request:', insertError)
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in vote API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
