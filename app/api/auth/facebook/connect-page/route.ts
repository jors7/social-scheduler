import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { pageUrl } = await request.json();
    
    if (!pageUrl) {
      return NextResponse.json({ error: 'Page URL required' }, { status: 400 });
    }
    
    console.log('Attempting to connect Facebook page:', pageUrl);
    
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get stored Facebook account with user token
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .single();
    
    if (!account || !account.access_token) {
      return NextResponse.json({ 
        error: 'Please connect Facebook first' 
      }, { status: 400 });
    }
    
    // Extract page identifier from URL
    let pageIdentifier = '';
    
    // Handle different Facebook URL formats
    const patterns = [
      /facebook\.com\/pages\/[^\/]+\/(\d+)/i,  // /pages/Name/123456
      /facebook\.com\/profile\.php\?id=(\d+)/i, // /profile.php?id=123456
      /facebook\.com\/([^\/\?\#]+)/i,           // /pagename
    ];
    
    for (const pattern of patterns) {
      const match = pageUrl.match(pattern);
      if (match) {
        pageIdentifier = match[1];
        break;
      }
    }
    
    if (!pageIdentifier) {
      return NextResponse.json({ 
        error: 'Invalid Facebook page URL format' 
      }, { status: 400 });
    }
    
    console.log('Extracted page identifier:', pageIdentifier);
    
    // Try to get page info and validate access
    try {
      // First, try the /me/accounts endpoint to see if the page is listed there
      console.log('Checking /me/accounts for page access...');
      const accountsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${account.access_token}`
      );
      
      let pageData = null;
      let pageAccessToken = account.access_token;
      let hasPageToken = false;
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        console.log('Pages from /me/accounts:', accountsData.data?.length || 0);
        
        // Check if the page is in the accounts list
        if (accountsData.data && accountsData.data.length > 0) {
          const foundPage = accountsData.data.find((page: any) => 
            page.id === pageIdentifier || 
            page.name?.toLowerCase() === pageIdentifier.toLowerCase()
          );
          
          if (foundPage) {
            console.log('Page found in accounts list!');
            pageData = foundPage;
            pageAccessToken = foundPage.access_token || account.access_token;
            hasPageToken = !!foundPage.access_token;
          }
        }
      }
      
      // If not found in accounts, try direct access (public page info)
      if (!pageData) {
        console.log('Page not in accounts list, trying direct access...');
        
        // First try to get public page info without token to validate it exists
        const publicPageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageIdentifier}?fields=id,name,about,picture`
        );
        
        if (publicPageResponse.ok) {
          pageData = await publicPageResponse.json();
          console.log('Page exists (public data):', { id: pageData.id, name: pageData.name });
          
          // Now try with user token to see if we have any access
          const pageWithTokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/${pageIdentifier}?fields=id,name,about,picture,access_token&access_token=${account.access_token}`
          );
          
          if (pageWithTokenResponse.ok) {
            const fullPageData = await pageWithTokenResponse.json();
            if (fullPageData.access_token) {
              pageAccessToken = fullPageData.access_token;
              hasPageToken = true;
              console.log('Got page token from direct query');
            }
            pageData = fullPageData;
          } else {
            // We can see the page publicly but don't have admin access
            // Still allow connection - user token might work for some operations
            console.log('Warning: No admin access to page, but will try with user token');
          }
        } else {
          // Page doesn't exist or is not accessible at all
          const error = await publicPageResponse.json();
          console.error('Page not found or not accessible:', error);
          
          return NextResponse.json({ 
            error: 'Page not found. Please check the URL and ensure the page exists and is public.'
          }, { status: 404 });
        }
      }
      
      // If we still don't have pageData, something went wrong
      if (!pageData) {
        return NextResponse.json({ 
          error: 'Could not retrieve page information. Please check the URL and try again.'
        }, { status: 404 });
      }
      
      console.log('Final page data:', { 
        id: pageData.id, 
        name: pageData.name,
        hasPageToken: hasPageToken 
      });
      
      // Update the database with the actual page info
      const { error: updateError } = await supabase
        .from('social_accounts')
        .update({
          platform_user_id: pageData.id,
          account_name: pageData.name,
          username: pageData.name,
          profile_image_url: pageData.picture?.data?.url || null,
          access_token: pageAccessToken,
          metadata: {
            hasPageToken: hasPageToken,
            pageUrl: pageUrl,
            connectedAt: new Date().toISOString()
          }
        })
        .eq('user_id', user.id)
        .eq('platform', 'facebook');
      
      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json({ 
          error: 'Failed to save page connection' 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        page: {
          id: pageData.id,
          name: pageData.name,
          hasPageToken: hasPageToken
        },
        message: hasPageToken 
          ? 'Facebook page connected successfully!' 
          : 'Facebook page connected! Some features may be limited without full page access.'
      });
      
    } catch (error) {
      console.error('Page connection error:', error);
      return NextResponse.json({ 
        error: 'Failed to connect page. Please check the URL and try again.' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Connect page error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to connect page' 
    }, { status: 500 });
  }
}