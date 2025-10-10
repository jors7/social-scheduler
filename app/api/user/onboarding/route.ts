import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('onboarding_completed, onboarding_completed_at, onboarding_skipped')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching onboarding status:', error)
      return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 })
    }

    // If no record exists, create one
    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_preferences')
        .insert({ user_id: user.id })
        .select('onboarding_completed, onboarding_completed_at, onboarding_skipped')
        .single()

      if (insertError) {
        console.error('Error creating user preferences:', insertError)
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }

      return NextResponse.json({
        onboarding_completed: newData?.onboarding_completed || false,
        onboarding_completed_at: newData?.onboarding_completed_at || null,
        onboarding_skipped: newData?.onboarding_skipped || false,
      })
    }

    return NextResponse.json({
      onboarding_completed: data.onboarding_completed,
      onboarding_completed_at: data.onboarding_completed_at,
      onboarding_skipped: data.onboarding_skipped,
    })
  } catch (error) {
    console.error('Unexpected error in onboarding GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { completed, skipped } = body

    const updateData: any = {}

    if (completed !== undefined) {
      updateData.onboarding_completed = completed
      if (completed) {
        updateData.onboarding_completed_at = new Date().toISOString()
      }
    }

    if (skipped !== undefined) {
      updateData.onboarding_skipped = skipped
      if (skipped) {
        updateData.onboarding_skipped_at = new Date().toISOString()
      }
    }

    // Try to update first
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updateData)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Error updating onboarding status:', error)
      return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
    }

    // If no rows were updated, insert a new record
    if (!data || data.length === 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...updateData
        })
        .select()

      if (insertError) {
        console.error('Error inserting onboarding status:', insertError)
        return NextResponse.json({ error: 'Failed to save onboarding status' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: insertData[0] })
    }

    return NextResponse.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Unexpected error in onboarding POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
