import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PostingService } from '@/lib/posting/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This endpoint will be called by Vercel Cron every minute
export async function GET(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (security check)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    const testAuth = 'Bearer test';
    
    if (authHeader !== expectedAuth && authHeader !== testAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== Processing Scheduled Posts ===', new Date().toISOString());

    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json({ error: 'Missing Supabase URL' }, { status: 500 });
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Missing Supabase service role key' }, { status: 500 });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find posts that are due to be posted
    const now = new Date().toISOString();
    console.log('Querying for posts due before:', now);
    
    const { data: duePosts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10); // Process max 10 posts per run to avoid timeouts

    if (error) {
      console.error('Error fetching due posts:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      console.log('No posts due for posting');
      return NextResponse.json({ 
        success: true, 
        message: 'No posts due for posting',
        processed: 0 
      });
    }

    console.log(`Found ${duePosts.length} posts due for posting`);

    const results = [];

    // Process each due post
    for (const post of duePosts) {
      try {
        // Mark as posting to prevent duplicate processing
        await supabase
          .from('scheduled_posts')
          .update({ status: 'posting' })
          .eq('id', post.id);

        console.log(`Processing post ${post.id}:`, post.content.slice(0, 50) + '...');

        // Get user's connected accounts for the platforms
        const { data: accounts, error: accountsError } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('is_active', true)
          .in('platform', post.platforms);

        if (accountsError) {
          throw new Error(`Failed to get user accounts: ${accountsError.message}`);
        }

        if (!accounts || accounts.length === 0) {
          throw new Error('No connected accounts found for specified platforms');
        }

        // Create a mock request context for the posting service
        const postResults = [];

        // Post to each platform
        for (const platform of post.platforms) {
          const account = accounts.find(acc => acc.platform === platform);
          
          if (!account) {
            postResults.push({
              platform,
              success: false,
              error: `${platform} account not connected`
            });
            continue;
          }

          try {
            const rawContent = post.platform_content?.[platform] || post.content;
            const content = cleanHtmlContent(rawContent);
            
            console.log(`=== ${platform.toUpperCase()} CONTENT DEBUG ===`);
            console.log('Raw content:', JSON.stringify(rawContent));
            console.log('Cleaned content:', JSON.stringify(content));
            console.log('Content length:', content.length);
            console.log('First 10 chars:', JSON.stringify(content.substring(0, 10)));
            
            let result;

            // Post to platform using direct API calls
            if (platform === 'facebook') {
              result = await postToFacebook(content, account, post.media_urls);
            } else if (platform === 'bluesky') {
              result = await postToBluesky(content, account, post.media_urls);
            } else {
              postResults.push({
                platform,
                success: false,
                error: `${platform} posting not implemented yet`
              });
              continue;
            }

            postResults.push({
              platform,
              success: true,
              postId: result.postId || result.id,
              data: result
            });

          } catch (error) {
            console.error(`Error posting to ${platform}:`, error);
            postResults.push({
              platform,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Check if all posts were successful
        const successful = postResults.filter(r => r.success);
        const failed = postResults.filter(r => !r.success);

        if (successful.length > 0 && failed.length === 0) {
          // All successful - mark as posted
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              post_results: postResults
            })
            .eq('id', post.id);

          // Clean up uploaded media files if all successful
          if (post.media_urls && post.media_urls.length > 0) {
            try {
              await cleanupMediaFiles(post.media_urls, supabase);
            } catch (cleanupError) {
              console.error('Media cleanup error:', cleanupError);
            }
          }

        } else {
          // Some or all failed - mark as failed
          const errorMessage = failed.map(f => `${f.platform}: ${f.error}`).join('; ');
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: errorMessage,
              post_results: postResults
            })
            .eq('id', post.id);
        }

        results.push({
          postId: post.id,
          success: successful.length > 0,
          platforms: successful.map(s => s.platform),
          errors: failed.map(f => `${f.platform}: ${f.error}`)
        });

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Processing error'
          })
          .eq('id', post.id);

        results.push({
          postId: post.id,
          success: false,
          error: error instanceof Error ? error.message : 'Processing error'
        });
      }
    }

    console.log('=== Processing Complete ===');
    console.log('Results:', results);

    return NextResponse.json({
      success: true,
      processed: duePosts.length,
      results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for posting to platforms
async function postToFacebook(content: string, account: any, mediaUrls?: string[]) {
  console.log('=== FACEBOOK API CALL ===');
  console.log('Content being sent:', JSON.stringify(content));
  console.log('Content length:', content.length);
  
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/post/facebook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pageId: account.platform_user_id,
      pageAccessToken: account.access_token,
      message: content,
      mediaUrls: mediaUrls,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Facebook posting failed');
  }

  return response.json();
}

async function postToBluesky(content: string, account: any, mediaUrls?: string[]) {
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/post/bluesky`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: account.access_token,
      password: account.access_secret,
      text: content,
      mediaUrls: mediaUrls,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Bluesky posting failed');
  }

  return response.json();
}

// Helper function to clean HTML content (same as PostingService)
function cleanHtmlContent(content: string): string {
  // Handle null/undefined content
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // First, convert paragraph and line break tags to actual line breaks
  let cleaned = content
    .replace(/<\/p>/gi, '\n\n') // End of paragraph gets double line break
    .replace(/<br\s*\/?>/gi, '\n') // Line breaks get single line break
    .replace(/<\/div>/gi, '\n') // Divs often act as line breaks
    .replace(/<\/li>/gi, '\n') // List items get line breaks
    
  // Replace common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max double line breaks
    .replace(/^\s+|\s+$/g, '') // Trim start/end
    .replace(/[ \t]+/g, ' '); // Normalize spaces

  return cleaned;
}

// Helper function to clean up media files after successful posting
async function cleanupMediaFiles(mediaUrls: string[], supabase: any) {
  for (const url of mediaUrls) {
    try {
      const urlParts = url.split('/storage/v1/object/public/post-media/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        await supabase.storage.from('post-media').remove([filePath]);
      }
    } catch (error) {
      console.error('Error cleaning up file:', url, error);
    }
  }
}