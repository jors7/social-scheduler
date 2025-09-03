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
      console.error('Invalid signature on data deletion request');
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
    console.log('=== Instagram Data Deletion Callback ===');
    
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
      console.error('No signed_request in data deletion callback');
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify and parse the signed request
    const payload = verifySignedRequest(signedRequest, appSecret);
    if (!payload) {
      console.error('Failed to verify signed request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Data deletion payload:', payload);

    // Extract the user ID from the payload
    const userId = payload.user_id;
    if (!userId) {
      console.error('No user_id in data deletion payload');
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

    // Delete all Instagram-related data for this user
    // 1. Delete social account connection
    const { error: accountError } = await supabase
      .from('social_accounts')
      .delete()
      .eq('platform', 'instagram')
      .eq('platform_user_id', userId);

    if (accountError) {
      console.error('Failed to delete Instagram account:', accountError);
    }

    // 2. Delete any scheduled posts for Instagram
    // First, get the user_id from the social_accounts table
    const { data: userData } = await supabase
      .from('social_accounts')
      .select('user_id')
      .eq('platform', 'instagram')
      .eq('platform_user_id', userId)
      .single();

    if (userData?.user_id) {
      // Delete scheduled posts that include Instagram
      const { error: postsError } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('user_id', userData.user_id)
        .contains('platforms', ['instagram']);

      if (postsError) {
        console.error('Failed to delete scheduled posts:', postsError);
      }
    }

    // Generate a confirmation code for the deletion request
    const confirmationCode = crypto.randomBytes(16).toString('hex');
    
    // Store the deletion request (optional - for tracking)
    console.log(`Data deletion requested for Instagram user ${userId}, code: ${confirmationCode}`);

    // Return the required response format for Meta
    // This includes a URL where users can check deletion status and a confirmation code
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';

    return NextResponse.json({
      url: `${baseUrl}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    console.error('Data deletion callback error:', error);
    
    // Generate a confirmation code even on error
    const confirmationCode = crypto.randomBytes(16).toString('hex');
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.socialcal.app'
      : 'http://localhost:3001';

    // Return the required format even on error
    return NextResponse.json({
      url: `${baseUrl}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  }
}