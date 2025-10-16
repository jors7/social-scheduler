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

    // Define all schedules to create
    const schedulesToCreate = [
      {
        name: 'process-scheduled-posts',
        destination: `${baseUrl}/api/cron/process-scheduled-posts`,
        cron: '* * * * *', // Every minute
        description: 'Posts scheduled content every minute'
      },
      {
        name: 'snapshot-analytics',
        destination: `${baseUrl}/api/cron/snapshot-analytics`,
        cron: '0 0 * * *', // Daily at midnight UTC
        description: 'Takes analytics snapshots daily for trend comparison'
      }
    ]

    // Check existing schedules
    const existingSchedules = await client.schedules.list()
    const createdSchedules = []
    const skippedSchedules = []

    // Create or skip each schedule
    for (const scheduleConfig of schedulesToCreate) {
      const existingSchedule = existingSchedules.find(
        (schedule: any) => schedule.destination === scheduleConfig.destination
      )

      if (existingSchedule) {
        console.log(`⏭️  Schedule already exists: ${scheduleConfig.name}`)
        skippedSchedules.push({
          name: scheduleConfig.name,
          id: existingSchedule.scheduleId,
          cron: existingSchedule.cron,
          destination: existingSchedule.destination,
          created: existingSchedule.createdAt,
          status: 'already_exists'
        })
        continue
      }

      // Create new schedule
      try {
        const scheduleId = await client.schedules.create({
          destination: scheduleConfig.destination,
          cron: scheduleConfig.cron,
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: 'qstash',
            timestamp: new Date().toISOString()
          })
        })

        console.log(`✅ Created schedule: ${scheduleConfig.name} (${scheduleId})`)
        createdSchedules.push({
          name: scheduleConfig.name,
          id: scheduleId,
          cron: scheduleConfig.cron,
          destination: scheduleConfig.destination,
          description: scheduleConfig.description,
          status: 'created'
        })
      } catch (error) {
        console.error(`❌ Failed to create schedule ${scheduleConfig.name}:`, error)
        createdSchedules.push({
          name: scheduleConfig.name,
          destination: scheduleConfig.destination,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const allSchedules = [...createdSchedules, ...skippedSchedules]

    return NextResponse.json({
      success: true,
      message: `QStash schedules setup complete. Created: ${createdSchedules.filter(s => s.status === 'created').length}, Skipped: ${skippedSchedules.length}`,
      schedules: allSchedules,
      instructions: {
        monitor: 'Visit https://console.upstash.com/qstash to monitor executions',
        pause: 'Use QStash dashboard to pause/resume schedules',
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

    // Define all schedule endpoints
    const cronEndpoints = [
      `${baseUrl}/api/cron/process-scheduled-posts`,
      `${baseUrl}/api/cron/snapshot-analytics`
    ]

    // Find and delete all matching schedules
    const existingSchedules = await client.schedules.list()
    const schedulesToDelete = existingSchedules.filter(
      (schedule: any) => cronEndpoints.includes(schedule.destination)
    )

    if (schedulesToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No schedules found to delete'
      })
    }

    const deletedSchedules = []
    for (const schedule of schedulesToDelete) {
      await client.schedules.delete(schedule.scheduleId)
      deletedSchedules.push({
        id: schedule.scheduleId,
        destination: schedule.destination
      })
      console.log(`✅ Deleted QStash schedule: ${schedule.scheduleId}`)
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedSchedules.length} QStash schedule(s)`,
      deletedSchedules
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

    // Define expected schedule endpoints
    const expectedEndpoints: Record<string, string> = baseUrl ? {
      'process-scheduled-posts': `${baseUrl}/api/cron/process-scheduled-posts`,
      'snapshot-analytics': `${baseUrl}/api/cron/snapshot-analytics`
    } : {}

    // Categorize schedules
    const ourSchedules = allSchedules.filter((s: any) =>
      Object.values(expectedEndpoints).includes(s.destination)
    )

    const otherSchedules = allSchedules.filter((s: any) =>
      !Object.values(expectedEndpoints).includes(s.destination)
    )

    return NextResponse.json({
      success: true,
      configured: !!process.env.QSTASH_TOKEN,
      totalSchedules: allSchedules.length,
      ourSchedules: ourSchedules.map((s: any) => {
        const name = Object.keys(expectedEndpoints).find(
          (key: string) => expectedEndpoints[key] === s.destination
        )
        return {
          name,
          id: s.scheduleId,
          destination: s.destination,
          cron: s.cron,
          created: s.createdAt
        }
      }),
      otherSchedules: otherSchedules.map((s: any) => ({
        id: s.scheduleId,
        destination: s.destination,
        cron: s.cron,
        created: s.createdAt
      })),
      expectedEndpoints
    })

  } catch (error) {
    console.error('QStash status error:', error)
    return NextResponse.json({
      error: 'Failed to get QStash status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
