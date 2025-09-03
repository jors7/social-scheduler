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
      // First, try to get page info with user token
      const pageResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageIdentifier}?fields=id,name,about,picture&access_token=${account.access_token}`
      );
      
      if (!pageResponse.ok) {
        const error = await pageResponse.json();
        console.error('Failed to access page:', error);
        return NextResponse.json({ 
          error: 'Cannot access this page. Please ensure you are an admin or editor.' 
        }, { status: 403 });
      }
      
      const pageData = await pageResponse.json();
      console.log('Page data retrieved:', { id: pageData.id, name: pageData.name });
      
      // Try to get a page access token
      let pageAccessToken = account.access_token; // Default to user token
      let hasPageToken = false;
      
      try {
        const tokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageData.id}?fields=access_token&access_token=${account.access_token}`
        );
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.access_token) {
            pageAccessToken = tokenData.access_token;
            hasPageToken = true;
            console.log('Successfully obtained page access token');
          }
        }
      } catch (e) {
        console.log('Could not get page token, will use user token');
      }
      
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