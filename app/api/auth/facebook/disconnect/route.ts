import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get the session user from cookies
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
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
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

    console.log('Disconnecting Facebook account:', accountId);
    console.log('User ID:', user.id);

    // Get the account details first (for potential cleanup)
    const { data: account, error: fetchError } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .single();

    if (fetchError || !account) {
      console.error('Account not found or error:', fetchError);
      return NextResponse.json(
        { error: 'Facebook account not found' },
        { status: 404 }
      );
    }

    // Optional: Revoke permissions on Facebook's side
    // This is good practice but not required
    let revokeSuccess = false;
    if (account.access_token) {
      try {
        // Use /me/permissions endpoint for revoking the app's permissions
        const revokeUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${account.access_token}`;

        console.log('Attempting to revoke Facebook permissions...');
        const revokeResponse = await fetch(revokeUrl, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          }
        });

        const responseText = await revokeResponse.text();
        console.log('Facebook revoke response:', revokeResponse.status, responseText);

        if (revokeResponse.ok) {
          console.log('✅ Facebook permissions revoked successfully');
          revokeSuccess = true;
        } else {
          // Parse error if possible
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.error?.code === 190) {
              console.log('Token already expired or invalid');
            }
          } catch (e) {
            // Ignore parse errors
          }
          console.warn('Failed to revoke Facebook permissions (non-critical)');
        }
      } catch (revokeError) {
        console.warn('Error revoking Facebook permissions (non-critical):', revokeError);
        // Continue with deletion even if revoke fails
      }
    }

    // Delete the account from our database
    const { error: deleteError } = await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id)
      .eq('platform', 'facebook');

    if (deleteError) {
      console.error('Error deleting Facebook account:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect Facebook account' },
        { status: 500 }
      );
    }

    console.log('Facebook account disconnected successfully');

    return NextResponse.json({
      success: true,
      revoked: revokeSuccess,
      message: 'Facebook account disconnected successfully'
    });

  } catch (error) {
    console.error('Facebook disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Facebook account' },
      { status: 500 }
    );
  }
}