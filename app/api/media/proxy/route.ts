import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Use edge runtime for streaming

export async function GET(request: NextRequest) {
  try {
    // Get the media URL from query params
    const { searchParams } = new URL(request.url);
    const mediaUrl = searchParams.get('url');
    
    if (!mediaUrl) {
      return NextResponse.json({ error: 'No media URL provided' }, { status: 400 });
    }
    
    // Validate that it's a Supabase URL for security
    if (!mediaUrl.includes('supabase.co/storage/v1/object/public/')) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }
    
    // Fetch the media from Supabase
    const response = await fetch(mediaUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 404 });
    }
    
    // Get content type and create appropriate headers
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    
    // Create response headers for the proxy
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    
    // Stream the response back
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
    
  } catch (error) {
    console.error('Media proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy media' },
      { status: 500 }
    );
  }
}