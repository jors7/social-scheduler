import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Create a Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Create admin client for database operations
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // First, let's check the table structure
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .limit(0);
    
    console.log('Table structure check:', columnsError ? columnsError : 'Success');

    // Try to insert a test Facebook account
    const testAccount = {
      user_id: user.id,
      platform: 'facebook',
      account_id: 'test_' + Date.now(),
      account_name: 'Test Facebook Page',
      account_username: 'test_page',
      access_token: 'test_token',
      access_secret: 'test_secret',
      account_label: 'Test Page',
      is_active: true,
      is_primary: false,
    };

    console.log('Attempting to insert:', testAccount);

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('social_accounts')
      .insert(testAccount)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ 
        error: 'Insert failed', 
        details: insertError,
        attempted: testAccount 
      }, { status: 500 });
    }

    console.log('Insert successful:', insertData);

    // Now try to fetch it back
    const { data: fetchData, error: fetchError } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook');

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ 
        error: 'Fetch failed', 
        details: fetchError 
      }, { status: 500 });
    }

    // Clean up - delete the test account
    const { error: deleteError } = await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('account_id', testAccount.account_id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test completed successfully',
      inserted: insertData,
      fetched: fetchData,
      user_id: user.id,
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}