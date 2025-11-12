/**
 * Email Queue Processing Cron Job
 *
 * This endpoint processes pending emails from the queue with retry logic.
 * Should be called periodically (every 5-15 minutes) via cron.
 *
 * Vercel Cron Configuration: Add to vercel.json
 * Configure path as "/api/cron/process-email-queue"
 * Schedule: Every 10 minutes (cron expression: star-slash-10 space star space star space star space star)
 *
 * OR use an external cron service (e.g., cron-job.org) to call:
 * POST https://www.socialcal.app/api/cron/process-email-queue
 * Header: Authorization: Bearer YOUR_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email/queue';

// Disable static optimization for cron endpoints
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.STRIPE_WEBHOOK_SECRET; // Fallback to webhook secret for convenience

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Check Bearer token
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('=== Email Queue Processing Started ===', new Date().toISOString());

    // Process the queue
    const stats = await processEmailQueue();

    const duration = Date.now() - startTime;

    console.log('=== Email Queue Processing Completed ===', {
      duration: `${duration}ms`,
      ...stats,
    });

    return NextResponse.json({
      success: true,
      stats,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ Email queue processing failed:', {
      error: errorMessage,
      duration_ms: duration,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual triggering (with auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
