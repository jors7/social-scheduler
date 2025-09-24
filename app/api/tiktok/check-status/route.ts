import { NextRequest, NextResponse } from 'next/server';
import { TikTokService } from '@/lib/tiktok/service';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publishId } = body;

    if (!publishId) {
      return NextResponse.json(
        { error: 'Publish ID required' },
        { status: 400 }
      );
    }

    // Get user's TikTok credentials
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
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get TikTok account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'TikTok account not connected' },
        { status: 400 }
      );
    }

    // Check upload status
    const tiktokService = new TikTokService(account.access_token);
    const status = await tiktokService.checkUploadStatus(publishId);

    console.log('TikTok upload status check:', {
      publishId,
      status: status.status,
      fullResponse: status.fullResponse
    });

    return NextResponse.json({
      publishId,
      status: status.status,
      publiclyAvailablePostId: status.publiclyAvailablePostId,
      errorCode: status.errorCode,
      errorMessage: status.errorMessage,
      fullResponse: status.fullResponse
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}