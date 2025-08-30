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
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Generate blur placeholder
    const { base64, metadata } = await getPlaiceholder(buffer, {
      size: 10, // Small size for blur
    });

    return NextResponse.json({
      blur: base64,
      width: metadata.width,
      height: metadata.height,
    });
  } catch (error) {
    console.error('Error generating blur:', error);
    return NextResponse.json(
      { error: 'Failed to generate blur placeholder' },
      { status: 500 }
    );
  }
}