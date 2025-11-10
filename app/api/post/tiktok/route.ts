import { NextRequest, NextResponse } from 'next/server';
import { TikTokService } from '@/lib/tiktok/service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureTikTokTokenValid } from '@/lib/tiktok/token-manager';

export const maxDuration = 60; // 60 seconds for video download and upload
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('TikTok POST request received');
    const { content, videoUrl, thumbnailUrl, privacyLevel, options } = body;

    // Log thumbnail if provided (for debugging)
    if (thumbnailUrl) {
      console.log('TikTok post includes thumbnail:', thumbnailUrl);
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'TikTok requires a video URL' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Caption/content required' },
        { status: 400 }
      );
    }

    // Get authenticated user and their TikTok account
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get TikTok account for this user
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, access_token')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'TikTok account not connected. Please connect your TikTok account first.' },
        { status: 404 }
      );
    }

    // Ensure token is valid and refresh if needed
    const { valid, token, error: tokenError } = await ensureTikTokTokenValid(account.id);

    if (!valid || !token) {
      console.error('[TikTok Post] Token validation failed:', tokenError);
      return NextResponse.json(
        { error: tokenError || 'TikTok token is invalid. Please reconnect your account.' },
        { status: 401 }
      );
    }

    // Format content for TikTok's requirements
    const formattedContent = TikTokService.formatContent(content);

    // Create TikTok service with validated token
    const tiktokService = new TikTokService(token);

    try {
      // Download video from URL to use FILE_UPLOAD method
      console.log('Downloading video for TikTok FILE_UPLOAD:', videoUrl);
      
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        console.error('Failed to download video:', videoResponse.status);
        throw new Error('Failed to download video. Please ensure the video is accessible.');
      }
      
      const videoArrayBuffer = await videoResponse.arrayBuffer();
      const videoBuffer = Buffer.from(videoArrayBuffer);
      const videoSize = videoBuffer.length;
      
      console.log('Video downloaded:', {
        size: videoSize,
        sizeMB: (videoSize / (1024 * 1024)).toFixed(2) + ' MB'
      });
      
      // Use FILE_UPLOAD method for reliable upload
      const result = await tiktokService.createPostWithFileUpload(
        formattedContent,
        videoBuffer,
        videoSize,
        privacyLevel || 'PUBLIC_TO_EVERYONE',
        options
      );

      // Pass through the sandbox flag and message if present
      return NextResponse.json({
        success: result.success,
        sandbox: result.sandbox,
        publishId: result.publishId,
        message: result.message || 'TikTok video upload initiated successfully',
      });
    } catch (postError: any) {
      console.error('TikTok posting error:', postError);
      
      // Check for specific error types
      if (postError.message.includes('401')) {
        return NextResponse.json(
          { 
            error: 'TikTok authentication failed. Please reconnect your account.',
            details: postError.message 
          },
          { status: 401 }
        );
      }

      if (postError.message.includes('video')) {
        return NextResponse.json(
          { 
            error: 'Video upload failed. Please ensure the video meets TikTok requirements.',
            details: postError.message 
          },
          { status: 400 }
        );
      }

      throw postError;
    }

  } catch (error) {
    console.error('TikTok posting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to TikTok' },
      { status: 500 }
    );
  }
}