import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime for better compatibility
export const maxDuration = 60; // Allow up to 60 seconds for large videos

export async function GET(request: NextRequest) {
  try {
    // Get the media URL from query params
    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');
    
    console.log('Proxy request for:', mediaUrl);
    
    if (!mediaUrl) {
      return NextResponse.json({ error: 'No media URL provided' }, { status: 400 });
    }
    
    // Decode the URL
    const decodedUrl = decodeURIComponent(mediaUrl);
    
    // Validate that it's a Supabase URL for security
    if (!decodedUrl.includes('supabase.co/storage/v1/object/public/')) {
      console.error('Invalid media URL:', decodedUrl);
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }
    
    console.log('Fetching from Supabase:', decodedUrl);
    
    // Fetch the media from Supabase with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout
    
    try {
      const response = await fetch(decodedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TikTok/1.0' // Identify as TikTok to Supabase
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Supabase returned:', response.status, response.statusText);
        return NextResponse.json({ error: 'Failed to fetch media from storage' }, { status: response.status });
      }
      
      // Get content type and size
      const contentType = response.headers.get('content-type') || 'video/mp4';
      const contentLength = response.headers.get('content-length');
      
      console.log('Media found:', { contentType, contentLength });
      
      // Create response headers for TikTok
      const headers = new Headers({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes', // Support partial content for TikTok
      });
      
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }
      
      // Stream the response back
      return new NextResponse(response.body, {
        status: 200,
        headers,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Fetch timeout');
        return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
      }
      throw fetchError;
    }
    
  } catch (error) {
    console.error('Media proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy media' },
      { status: 500 }
    );
  }
}