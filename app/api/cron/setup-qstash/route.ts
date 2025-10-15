import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@upstash/qstash'

export const dynamic = 'force-dynamic'

/**
 * QStash Setup Endpoint
 *
 * This endpoint creates a QStash schedule that triggers the cron job every minute.
 * Run this once to set up the schedule, then QStash will handle the rest automatically.
 *
 * Usage:
 *   POST /api/cron/setup-qstash
 *
 * Security:
 *   Protected by CRON_SECRET - only authorized users can set up schedules
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check environment variables
    if (!process.env.QSTASH_TOKEN) {
      return NextResponse.json({
        error: 'QSTASH_TOKEN not configured'
      }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL) {
      return NextResponse.json({
        error: 'APP_URL not configured. Set NEXT_PUBLIC_APP_URL or deploy to Vercel'
      }, { status: 500 })
    }

    // Initialize QStash client
    const client = new Client({ token: process.env.QSTASH_TOKEN })

    // Determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    if (!baseUrl) {
      return NextResponse.json({
        error: 'Could not determine base URL'
      }, { status: 500 })
    }

    const cronEndpoint = `${baseUrl}/api/cron/process-scheduled-posts`

    console.log('Setting up QStash schedule...')
    console.log('Target endpoint:', cronEndpoint)

    // Check if schedule already exists
    const existingSchedules = await client.schedules.list()
    const existingSchedule = existingSchedules.find(
      (schedule: any) => schedule.destination === cronEndpoint
    )

    if (existingSchedule) {
      return NextResponse.json({
        success: true,
        message: 'Schedule already exists',
        schedule: {
          id: existingSchedule.scheduleId,
          cron: existingSchedule.cron,
          destination: existingSchedule.destination,
          created: existingSchedule.createdAt
        }
      })
    }

    // Create new schedule to run every minute
    const schedule = await client.schedules.create({
      destination: cronEndpoint,
      cron: '* * * * *', // Every minute
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'qstash',
        timestamp: new Date().toISOString()
      })
    })

    console.log('✅ QStash schedule created successfully')
    console.log('Schedule ID:', schedule)

    return NextResponse.json({
      success: true,
      message: 'QStash schedule created successfully',
      schedule: {
        id: schedule,
        cron: '* * * * *',
        destination: cronEndpoint,
        note: 'This will trigger your cron job every minute'
      },
      instructions: {
        monitor: 'Visit https://console.upstash.com/qstash to monitor executions',
        pause: 'Use QStash dashboard to pause/resume the schedule',
        delete: 'Use QStash dashboard or call DELETE /api/cron/setup-qstash to remove'
      }
    })

  } catch (error) {
    console.error('QStash setup error:', error)
    return NextResponse.json({
      error: 'Failed to set up QStash schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Delete QStash Schedule
 *
 * Removes the scheduled cron job from QStash
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.QSTASH_TOKEN) {
      return NextResponse.json({
        error: 'QSTASH_TOKEN not configured'
      }, { status: 500 })
    }

    const client = new Client({ token: process.env.QSTASH_TOKEN })

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    if (!baseUrl) {
      return NextResponse.json({
        error: 'Could not determine base URL'
      }, { status: 500 })
    }

    const cronEndpoint = `${baseUrl}/api/cron/process-scheduled-posts`

    // Find and delete the schedule
    const existingSchedules = await client.schedules.list()
    const scheduleToDelete = existingSchedules.find(
      (schedule: any) => schedule.destination === cronEndpoint
    )

    if (!scheduleToDelete) {
      return NextResponse.json({
        success: true,
        message: 'No schedule found to delete'
      })
    }

    await client.schedules.delete(scheduleToDelete.scheduleId)

    console.log('✅ QStash schedule deleted')

    return NextResponse.json({
      success: true,
      message: 'QStash schedule deleted successfully',
      deletedScheduleId: scheduleToDelete.scheduleId
    })

  } catch (error) {
    console.error('QStash delete error:', error)
    return NextResponse.json({
      error: 'Failed to delete QStash schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get Schedule Status
 *
 * Check if QStash schedule exists and its details
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.QSTASH_TOKEN) {
      return NextResponse.json({
        error: 'QSTASH_TOKEN not configured'
      }, { status: 500 })
    }

    const client = new Client({ token: process.env.QSTASH_TOKEN })

    // Get all schedules
    const allSchedules = await client.schedules.list()

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

    const cronEndpoint = baseUrl ? `${baseUrl}/api/cron/process-scheduled-posts` : null

    return NextResponse.json({
      success: true,
      configured: !!process.env.QSTASH_TOKEN,
      totalSchedules: allSchedules.length,
      schedules: allSchedules.map((s: any) => ({
        id: s.scheduleId,
        destination: s.destination,
        cron: s.cron,
        created: s.createdAt,
        isPrimarySchedule: cronEndpoint ? s.destination === cronEndpoint : false
      })),
      targetEndpoint: cronEndpoint
    })

  } catch (error) {
    console.error('QStash status error:', error)
    return NextResponse.json({
      error: 'Failed to get QStash status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
