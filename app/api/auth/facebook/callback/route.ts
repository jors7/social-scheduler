import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { FacebookService } from '@/lib/facebook/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Facebook OAuth Callback ===');
    console.log('Full callback URL:', request.url);
    console.log('Environment check:', {
      hasMetaAppId: !!process.env.META_APP_ID,
      hasMetaAppSecret: !!process.env.META_APP_SECRET,
      metaAppIdLength: process.env.META_APP_ID?.length,
      nodeEnv: process.env.NODE_ENV
    });
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Facebook OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_auth_failed', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_auth_failed', request.url)
      );
    }

    // Verify state for CSRF protection
    const cookieStore = cookies();
    const storedState = cookieStore.get('facebook_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=facebook_auth_failed', request.url)
      );
    }

    // Clear state cookie
    cookieStore.delete('facebook_oauth_state');

    // Determine callback URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://social-scheduler-opal.vercel.app'
      : 'http://localhost:3001';
    
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    // Use Facebook service to authenticate
    const facebookService = new FacebookService();
    const authResult = await facebookService.authenticateUser(code, redirectUri);
    
    console.log('Facebook page authenticated:', authResult.pageName);

    // Store in database
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
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=unauthorized', request.url)
      );
    }

    const accountData = {
      user_id: user.id,
      platform: 'facebook',
      platform_user_id: authResult.pageId,
      account_name: authResult.pageName,
      username: authResult.pageName,
      profile_image_url: authResult.pageInfo.picture?.data?.url || null,
      access_token: authResult.pageAccessToken,
      access_secret: '', // Not used for Facebook
      is_active: true,
    };

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=database_error', request.url)
      );
    }

    console.log('Facebook account connected successfully');
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=facebook_connected', request.url)
    );

  } catch (error) {
    console.error('Facebook callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=facebook_callback_failed', request.url)
    );
  }
}