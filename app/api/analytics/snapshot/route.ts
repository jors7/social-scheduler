import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSnapshot } from '@/lib/analytics/comparison'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, accountId, metrics, snapshotDate } = body

    // Validate required fields
    if (!platform || !accountId || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, accountId, metrics' },
        { status: 400 }
      )
    }

    // Validate platform
    const validPlatforms = ['facebook', 'instagram', 'threads', 'tiktok', 'pinterest', 'bluesky']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Create the snapshot
    const date = snapshotDate ? new Date(snapshotDate) : undefined
    const snapshot = await createSnapshot(user.id, platform, accountId, metrics, date)

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Failed to create snapshot' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      snapshot
    })

  } catch (error) {
    console.error('Error creating analytics snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to create analytics snapshot' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const platform = searchParams.get('platform')
    const accountId = searchParams.get('accountId')
    const daysAgo = searchParams.get('daysAgo') ? parseInt(searchParams.get('daysAgo')!) : 7

    if (!platform || !accountId) {
      return NextResponse.json(
        { error: 'Missing required parameters: platform, accountId' },
        { status: 400 }
      )
    }

    // Calculate target date
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - daysAgo)
    const targetDateString = targetDate.toISOString().split('T')[0]

    // Get snapshot for the target date
    const { data: snapshot, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('account_id', accountId)
      .eq('snapshot_date', targetDateString)
      .single()

    if (error || !snapshot) {
      // Try to get the closest snapshot before the target date
      const { data: closestSnapshot } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('account_id', accountId)
        .lte('snapshot_date', targetDateString)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      if (!closestSnapshot) {
        return NextResponse.json(
          { error: 'No historical snapshot found', daysAgo },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        snapshot: closestSnapshot,
        note: `Closest snapshot is from ${closestSnapshot.snapshot_date}`
      })
    }

    return NextResponse.json({
      success: true,
      snapshot
    })

  } catch (error) {
    console.error('Error fetching analytics snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics snapshot' },
      { status: 500 }
    )
  }
}
