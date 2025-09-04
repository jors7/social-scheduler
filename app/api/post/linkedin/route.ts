import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { LinkedInService } from '@/lib/linkedin/service';

export async function POST(request: NextRequest) {
  try {
    // Get current user
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get LinkedIn account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('access_token, username, expires_at')
      .eq('user_id', user.id)
      .eq('platform', 'linkedin')
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'LinkedIn account not connected' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (account.expires_at) {
      const expiresAt = new Date(account.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'LinkedIn access token has expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { content, mediaUrl, mediaType } = body;

    console.log('LinkedIn post request:', { 
      hasContent: !!content, 
      mediaUrl, 
      mediaType,
      contentLength: content?.length 
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Create LinkedIn service
    const linkedinService = new LinkedInService(account.access_token, user.id);

    // Validate token
    const isValid = await linkedinService.validateToken();
    if (!isValid) {
      return NextResponse.json(
        { error: 'LinkedIn access token is invalid. Please reconnect your account.' },
        { status: 401 }
      );
    }

    let result;

    // Handle media if provided
    if (mediaUrl && mediaType === 'image') {
      console.log('Processing LinkedIn image post, mediaUrl:', mediaUrl);
      
      // Fetch the image from Supabase storage
      // The URL format is: /storage/v1/object/public/post-media/filename
      const pathToDownload = mediaUrl.replace('/storage/v1/object/public/post-media/', '');
      console.log('Downloading from path:', pathToDownload);
      
      const { data: mediaData, error: mediaError } = await supabase
        .storage
        .from('post-media')
        .download(pathToDownload);

      if (mediaError || !mediaData) {
        console.error('Failed to download media:', mediaError);
        console.error('Media URL was:', mediaUrl);
        // Post without media if download fails
        result = await linkedinService.shareContent({
          text: LinkedInService.formatContent(content)
        });
      } else {
        console.log('Successfully downloaded media, size:', mediaData.size);
        // Convert blob to buffer
        const buffer = Buffer.from(await mediaData.arrayBuffer());
        
        // Determine mime type from file extension
        let mimeType = 'image/jpeg';
        if (mediaUrl.includes('.png')) mimeType = 'image/png';
        else if (mediaUrl.includes('.gif')) mimeType = 'image/gif';
        else if (mediaUrl.includes('.webp')) mimeType = 'image/webp';

        // Post with image
        result = await linkedinService.postWithImage(content, buffer, mimeType);
      }
    } else {
      // Post text only
      result = await linkedinService.shareContent({
        text: LinkedInService.formatContent(content)
      });
    }

    // Log successful post
    await supabase
      .from('post_history')
      .insert({
        user_id: user.id,
        platform: 'linkedin',
        content: content,
        media_urls: mediaUrl ? [mediaUrl] : null,
        posted_at: new Date().toISOString(),
        status: 'success',
        platform_post_id: result.id,
      });

    return NextResponse.json({
      success: true,
      postId: result.id,
      message: 'Successfully posted to LinkedIn'
    });

  } catch (error: any) {
    console.error('LinkedIn posting error:', error);
    
    // Check for specific error types
    if (error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'LinkedIn authentication failed. Please reconnect your account.' },
        { status: 401 }
      );
    }

    if (error?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'LinkedIn rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to LinkedIn' },
      { status: 500 }
    );
  }
}