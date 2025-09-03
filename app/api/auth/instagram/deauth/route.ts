import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Verify the signed request from Meta
function verifySignedRequest(signedRequest: string, appSecret: string): any {
  try {
    const [signature, payload] = signedRequest.split('.');
    
    if (!signature || !payload) {
      return null;
    }

    // Calculate expected signature
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Verify signature matches
    if (signature !== expectedSig) {
      console.error('Invalid signature on deauth request');
      return null;
    }

    // Decode and parse payload
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error verifying signed request:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Instagram Deauthorization Callback ===');
    
    // Get the app secret
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error('No app secret configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Parse the request body
    const body = await request.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get('signed_request');

    if (!signedRequest) {
      console.error('No signed_request in deauth callback');
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify and parse the signed request
    const payload = verifySignedRequest(signedRequest, appSecret);
    if (!payload) {
      console.error('Failed to verify signed request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Deauth payload:', payload);

    // Extract the user ID from the payload
    const userId = payload.user_id;
    if (!userId) {
      console.error('No user_id in deauth payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Initialize Supabase with service role for admin operations
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin operations
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value;
          },
        },
      }
    );

    // Delete the Instagram account connection for this user
    // Using platform_user_id to match the Instagram user ID
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('platform', 'instagram')
      .eq('platform_user_id', userId);

    if (error) {
      console.error('Failed to delete Instagram connection:', error);
      // Don't return error to Meta - we've acknowledged the deauth
    }

    console.log(`Deauthorized Instagram user ${userId}`);

    // Return success to Meta
    // Meta expects a 200 response to confirm receipt
    return NextResponse.json({ 
      success: true,
      message: 'User deauthorized'
    });

  } catch (error) {
    console.error('Deauth callback error:', error);
    // Still return 200 to Meta to acknowledge receipt
    return NextResponse.json({ 
      success: false,
      message: 'Error processing deauthorization'
    });
  }
}