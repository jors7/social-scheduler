import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    // Get Facebook account(s)
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'facebook')
      .eq('is_active', true);
    
    if (accountId) {
      query = query.eq('id', accountId);
    }
    
    const { data: accounts, error: accountError } = await query;
    
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Facebook account not connected' },
        { status: 404 }
      );
    }

    const permissionsResults = await Promise.all(
      accounts.map(async (account) => {
        const result = {
          accountId: account.id,
          pageId: account.platform_user_id,
          pageName: account.display_name || account.username,
          permissions: {
            pages_show_list: false,
            pages_read_engagement: false,
            pages_manage_posts: false,
            read_insights: false,
            ads_management: false,
            business_management: false
          },
          errors: [] as string[],
          hasFullAccess: false
        };

        try {
          // Check permissions for the page
          const permissionsUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${account.access_token}`;
          console.log(`[${account.display_name || account.username}] Checking permissions...`);
          
          const response = await fetch(permissionsUrl);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[${account.display_name || account.username}] Permissions response:`, data);
            
            if (data.data && Array.isArray(data.data)) {
              // Process granted permissions
              data.data.forEach((perm: any) => {
                if (perm.status === 'granted') {
                  switch (perm.permission) {
                    case 'pages_show_list':
                      result.permissions.pages_show_list = true;
                      break;
                    case 'pages_read_engagement':
                      result.permissions.pages_read_engagement = true;
                      break;
                    case 'pages_manage_posts':
                      result.permissions.pages_manage_posts = true;
                      break;
                    case 'read_insights':
                      result.permissions.read_insights = true;
                      break;
                    case 'ads_management':
                      result.permissions.ads_management = true;
                      break;
                    case 'business_management':
                      result.permissions.business_management = true;
                      break;
                  }
                }
              });
              
              // Check if user has full access
              result.hasFullAccess = 
                result.permissions.pages_read_engagement && 
                result.permissions.read_insights;
            }
          } else {
            const errorData = await response.text();

            try {
              const errorJson = JSON.parse(errorData);
              if (errorJson.error) {
                // Check if it's the expected Page token error (code 100 with Page in message)
                if (errorJson.error.code === 100 && errorJson.error.message?.includes('Page')) {
                  console.log(`[${account.display_name || account.username}] Using page token - skipping user permission check, will rely on API tests`);
                } else {
                  console.error(`[${account.display_name || account.username}] Failed to check permissions:`, errorData);
                  result.errors.push(errorJson.error.message);
                  console.error(`[${account.display_name || account.username}] Permission check error:`, {
                    code: errorJson.error.code,
                    message: errorJson.error.message,
                    type: errorJson.error.type
                  });
                }
              }
            } catch (e) {
              result.errors.push('Failed to check permissions');
            }
          }

          // Test actual API access - this is more reliable than permission endpoint
          let hasWorkingAnalytics = false;
          
          try {
            // Test 1: Try page insights
            const testInsightsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/insights?metric=page_impressions&period=day&access_token=${account.access_token}`;
            const insightResponse = await fetch(testInsightsUrl);
            
            if (insightResponse.ok) {
              const insightData = await insightResponse.json();
              if (insightData.data && insightData.data.length > 0) {
                console.log(`[${account.display_name || account.username}] ✓ Page insights API works`);
                hasWorkingAnalytics = true;
                result.permissions.read_insights = true;
              }
            }
            
            // Test 2: Try to get posts with engagement metrics
            if (!hasWorkingAnalytics) {
              const postsUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/posts?fields=likes.summary(true),comments.summary(true)&limit=1&access_token=${account.access_token}`;
              const postsResponse = await fetch(postsUrl);
              
              if (postsResponse.ok) {
                const postsData = await postsResponse.json();
                if (postsData.data && postsData.data.length > 0) {
                  console.log(`[${account.display_name || account.username}] ✓ Can fetch posts with metrics`);
                  hasWorkingAnalytics = true;
                  // Even if we can't get page insights, we can aggregate post metrics
                }
              }
            }
            
            // Override hasFullAccess if we have working analytics
            if (hasWorkingAnalytics) {
              result.hasFullAccess = true;
              console.log(`[${account.display_name || account.username}] Analytics confirmed working via API test`);
            } else {
              result.errors.push('Unable to access analytics data. Page may need reconnection.');
            }
            
          } catch (error) {
            console.log(`[${account.display_name || account.username}] Error testing analytics access:`, error);
          }

        } catch (error: any) {
          console.error(`[${account.display_name || account.username}] Error checking permissions:`, error);
          result.errors.push(error.message || 'Unknown error');
        }

        return result;
      })
    );

    return NextResponse.json({
      success: true,
      accounts: permissionsResults,
      recommendation: permissionsResults.some(r => !r.hasFullAccess) 
        ? 'Some accounts are missing required permissions. Please reconnect these accounts with the necessary permissions enabled.'
        : 'All accounts have the required permissions for full analytics access.'
    });
    
  } catch (error) {
    console.error('Error checking Facebook permissions:', error);
    return NextResponse.json(
      { error: 'Failed to check Facebook permissions' },
      { status: 500 }
    );
  }
}