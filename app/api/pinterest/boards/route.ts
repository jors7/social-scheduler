import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PinterestService } from '@/lib/pinterest/service';

export async function GET(request: NextRequest) {
  try {
    // Get current user
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

    // Get Pinterest account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'pinterest')
      .eq('is_active', true)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'Pinterest account not connected' },
        { status: 400 }
      );
    }

    // Get boards from Pinterest
    const pinterestService = new PinterestService(account.access_token);
    const boards = await pinterestService.getBoards();

    return NextResponse.json({
      success: true,
      boards: boards.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.description,
        privacy: board.privacy,
      })),
    });

  } catch (error) {
    console.error('Error fetching Pinterest boards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pinterest boards' },
      { status: 500 }
    );
  }
}