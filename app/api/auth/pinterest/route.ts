import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PinterestService } from '@/lib/pinterest/service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Pinterest Connection ===');
    console.log('Environment check:', {
      hasPinterestToken: !!process.env.PINTEREST_ACCESS_TOKEN,
      tokenLength: process.env.PINTEREST_ACCESS_TOKEN?.length,
    });
    
    if (!process.env.PINTEREST_ACCESS_TOKEN) {
      console.error('Missing Pinterest access token');
      return NextResponse.json({ error: 'Pinterest not configured' }, { status: 500 });
    }

    // Use Pinterest service to get user profile
    console.log('Creating Pinterest service...');
    const pinterestService = new PinterestService(process.env.PINTEREST_ACCESS_TOKEN);
    
    console.log('Getting user profile...');
    const userProfile = await pinterestService.getUserProfile();
    
    console.log('Pinterest profile:', userProfile);

    // Store in database
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

    const accountData = {
      user_id: user.id,
      platform: 'pinterest',
      platform_user_id: userProfile.id,
      account_name: userProfile.name,
      username: userProfile.username,
      profile_image_url: userProfile.profileImageUrl,
      access_token: process.env.PINTEREST_ACCESS_TOKEN,
      access_secret: '', // Not used for Pinterest
      is_active: true,
    };

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'user_id,platform'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('Pinterest account connected successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Pinterest account connected successfully',
      profile: userProfile 
    });

  } catch (error) {
    console.error('Pinterest connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Pinterest account' },
      { status: 500 }
    );
  }
}