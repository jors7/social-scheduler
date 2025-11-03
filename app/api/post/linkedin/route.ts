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
    const { content, mediaUrl, mediaType, visibility = 'PUBLIC' } = body;

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
      
      // Construct the full public URL for the image
      // The mediaUrl is already a public URL from Supabase
      const fullMediaUrl = mediaUrl.startsWith('http') 
        ? mediaUrl 
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}${mediaUrl}`;
      
      console.log('Fetching image from public URL:', fullMediaUrl);
      
      try {
        // Fetch the image directly from the public URL
        const imageResponse = await fetch(fullMediaUrl);
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('Successfully fetched image, size:', buffer.length);
        
        // Determine mime type from content-type header or file extension
        let mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
          // Fallback to extension-based detection
          if (mediaUrl.includes('.png')) mimeType = 'image/png';
          else if (mediaUrl.includes('.gif')) mimeType = 'image/gif';
          else if (mediaUrl.includes('.webp')) mimeType = 'image/webp';
          else mimeType = 'image/jpeg';
        }
        
        console.log('Image MIME type:', mimeType);

        // Post with image
        result = await linkedinService.postWithImage(content, buffer, mimeType, visibility);
      } catch (fetchError) {
        console.error('Failed to fetch image from URL:', fetchError);
        console.error('Media URL was:', mediaUrl);
        // Post without media if fetch fails
        result = await linkedinService.shareContent({
          text: LinkedInService.formatContent(content)
        }, visibility);
      }
    } else {
      // Post text only
      result = await linkedinService.shareContent({
        text: LinkedInService.formatContent(content)
      }, visibility);
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