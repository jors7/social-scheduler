import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlaiceholder } from 'plaiceholder';

// SECURITY: Allowlist of domains that can be fetched
// Add your storage domains here
const ALLOWED_DOMAINS = [
  'supabase.co',
  'supabase.in',
  'r2.dev',
  'r2.cloudflarestorage.com',
  'cloudflare.com',
];

// Block private/internal IP ranges
function isPrivateOrInternal(hostname: string): boolean {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  // Check for internal hostnames
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return true;
  }

  // Check for cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return true;
  }

  // Check for private IP ranges (basic check)
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^0\./,
    /^127\./,
  ];

  for (const range of privateRanges) {
    if (range.test(hostname)) {
      return true;
    }
  }

  return false;
}

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block private/internal IPs
    if (isPrivateOrInternal(url.hostname)) {
      return false;
    }

    // Only allow HTTPS (except for development)
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      return false;
    }

    // Check if domain is in allowlist
    return ALLOWED_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Validate URL against allowlist to prevent SSRF
    if (!isAllowedUrl(imageUrl)) {
      console.warn(`Blocked blur request for unauthorized URL: ${imageUrl}`);
      return NextResponse.json(
        { error: 'Invalid image URL. Only images from authorized storage domains are allowed.' },
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
