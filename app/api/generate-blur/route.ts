import { NextRequest, NextResponse } from 'next/server';
import { getPlaiceholder } from 'plaiceholder';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Generate blur placeholder
    const { base64, metadata } = await getPlaiceholder(buffer, {
      size: 10, // Small size for blur
    });

    const response = NextResponse.json({
      blur: base64,
      width: metadata.width,
      height: metadata.height,
    });

    // Cache blur data for 30 days since it won't change
    response.headers.set('Cache-Control', 'public, s-maxage=2592000, immutable');
    
    return response;
  } catch (error) {
    console.error('Error generating blur:', error);
    return NextResponse.json(
      { error: 'Failed to generate blur placeholder' },
      { status: 500 }
    );
  }
}