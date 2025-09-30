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

    // Get Instagram accounts
    const { data: accounts, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_active', true);

    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No Instagram account connected' },
        { status: 404 }
      );
    }

    const debugInfo = await Promise.all(
      accounts.map(async (account) => {
        const accessToken = account.access_token;
        const userID = account.platform_user_id;

        const results: any = {
          accountId: account.id,
          username: account.username,
          platformUserId: userID,
          tokenPrefix: accessToken.substring(0, 10),
          tests: {}
        };

        // Test 1: Check account type and basic info
        try {
          const profileResponse = await fetch(
            `https://graph.instagram.com/${userID}?fields=id,username,account_type,media_count&access_token=${accessToken}`
          );

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            results.tests.profile = {
              success: true,
              accountType: profileData.account_type, // BUSINESS, CREATOR, or PERSONAL
              mediaCount: profileData.media_count,
              username: profileData.username
            };
          } else {
            const error = await profileResponse.json();
            results.tests.profile = {
              success: false,
              error: error.error?.message || 'Failed to fetch profile'
            };
          }
        } catch (e: any) {
          results.tests.profile = {
            success: false,
            error: e.message
          };
        }

        // Test 2: Check if we can access insights (Business/Creator only)
        try {
          // Try to fetch a simple user metric
          const insightsResponse = await fetch(
            `https://graph.instagram.com/${userID}/insights?metric=impressions&period=day&access_token=${accessToken}`
          );

          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            results.tests.userInsights = {
              success: true,
              hasData: insightsData.data?.length > 0,
              message: 'User insights accessible - Business/Creator account confirmed'
            };
          } else {
            const error = await insightsResponse.json();
            results.tests.userInsights = {
              success: false,
              errorCode: error.error?.code,
              errorMessage: error.error?.message,
              hint: error.error?.message?.includes('not supported')
                ? 'Account needs to be converted to Business or Creator'
                : 'Check app permissions'
            };
          }
        } catch (e: any) {
          results.tests.userInsights = {
            success: false,
            error: e.message
          };
        }

        // Test 3: Check media insights capability
        try {
          // First get recent media
          const mediaResponse = await fetch(
            `https://graph.instagram.com/${userID}/media?fields=id,timestamp&limit=1&access_token=${accessToken}`
          );

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();

            if (mediaData.data?.length > 0) {
              const mediaId = mediaData.data[0].id;
              const mediaDate = mediaData.data[0].timestamp;

              // Try to get insights for this media
              const mediaInsightsResponse = await fetch(
                `https://graph.instagram.com/${mediaId}/insights?metric=impressions,reach&access_token=${accessToken}`
              );

              if (mediaInsightsResponse.ok) {
                const insightsData = await mediaInsightsResponse.json();
                results.tests.mediaInsights = {
                  success: true,
                  mediaId: mediaId,
                  mediaDate: mediaDate,
                  hasData: insightsData.data?.length > 0,
                  message: 'Media insights accessible'
                };
              } else {
                const error = await mediaInsightsResponse.json();
                results.tests.mediaInsights = {
                  success: false,
                  mediaId: mediaId,
                  mediaDate: mediaDate,
                  errorCode: error.error?.code,
                  errorMessage: error.error?.message,
                  hint: error.error?.message?.includes('not supported')
                    ? 'Media posted before Business account conversion'
                    : 'Check insights permissions'
                };
              }
            } else {
              results.tests.mediaInsights = {
                success: false,
                message: 'No media found to test insights'
              };
            }
          }
        } catch (e: any) {
          results.tests.mediaInsights = {
            success: false,
            error: e.message
          };
        }

        // Test 4: Check available permissions
        try {
          const permissionsResponse = await fetch(
            `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`
          );

          if (permissionsResponse.ok) {
            const permData = await permissionsResponse.json();
            results.tests.permissions = {
              success: true,
              grantedPermissions: permData.data?.filter((p: any) => p.status === 'granted').map((p: any) => p.permission) || [],
              deniedPermissions: permData.data?.filter((p: any) => p.status === 'declined').map((p: any) => p.permission) || []
            };
          } else {
            results.tests.permissions = {
              success: false,
              message: 'Could not check permissions - might be using Instagram Basic Display API'
            };
          }
        } catch (e: any) {
          results.tests.permissions = {
            success: false,
            error: e.message
          };
        }

        return results;
      })
    );

    // Provide recommendations based on findings
    const recommendations = [];

    for (const info of debugInfo) {
      if (info.tests.profile?.accountType === 'PERSONAL') {
        recommendations.push('Convert Instagram account to Business or Creator for analytics');
      }

      if (!info.tests.userInsights?.success) {
        if (info.tests.userInsights?.errorMessage?.includes('not supported')) {
          recommendations.push('Instagram account needs to be Business or Creator type');
        } else {
          recommendations.push('App may need instagram_manage_insights permission');
        }
      }

      if (!info.tests.mediaInsights?.success && info.tests.mediaInsights?.errorMessage?.includes('posted before')) {
        recommendations.push('Only posts created after Business account conversion have insights');
      }
    }

    return NextResponse.json({
      success: true,
      accounts: debugInfo,
      recommendations: Array.from(new Set(recommendations)), // Remove duplicates
      summary: {
        hasBusinessAccount: debugInfo.some(d => ['BUSINESS', 'CREATOR'].includes(d.tests.profile?.accountType)),
        hasInsightsAccess: debugInfo.some(d => d.tests.userInsights?.success),
        hasMediaInsights: debugInfo.some(d => d.tests.mediaInsights?.success)
      }
    });

  } catch (error) {
    console.error('Instagram debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run diagnostics' },
      { status: 500 }
    );
  }
}