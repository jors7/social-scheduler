import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Get status of a thread job
 * GET /api/queue/threads/status/[jobId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId' },
        { status: 400 }
      );
    }

    // Create service role client (for reading across users)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load thread job
    const { data: job, error: jobError } = await supabase
      .from('thread_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Thread job not found' },
        { status: 404 }
      );
    }

    const posts = job.posts as string[];
    const publishedPostIds = (job.published_post_ids || []) as string[];

    // Calculate progress
    const totalPosts = posts.length;
    const completedPosts = publishedPostIds.length;
    const progress = totalPosts > 0 ? (completedPosts / totalPosts) * 100 : 0;

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: Math.round(progress),
      currentIndex: job.current_index,
      totalPosts,
      completedPosts,
      publishedPostIds,
      error: job.error_message,
      retryCount: job.retry_count,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at
    });

  } catch (error) {
    console.error('[Thread Job Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
