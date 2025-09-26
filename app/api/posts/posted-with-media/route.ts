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

    // Get status from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Build query
    let query = supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id);

    // Filter by status if provided
    if (status && status !== 'all') {
      // Handle multiple statuses separated by comma
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim());
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status);
      }
    }

    // Fetch posts - newest first
    const { data: posts, error: postsError } = await query
      .order('posted_at', { ascending: false, nullsFirst: false })
      .order('scheduled_for', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    // Get social accounts for fetching media
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError || !accounts) {
      console.error('Error fetching social accounts:', accountsError);
      return NextResponse.json({ posts }); // Return posts without media URLs
    }

    // Create a map of platform to account for easy lookup
    const accountMap = new Map();
    accounts.forEach(acc => {
      accountMap.set(acc.platform, acc);
    });

    // Enhance posts with media URLs from platforms
    const enhancedPosts = await Promise.all(
      posts.map(async (post) => {
        // Try to get media URL from platform APIs
        let platformMediaUrl = null;
        let pinterestTitle = null;
        let pinterestDescription = null;

        if (post.post_results && Array.isArray(post.post_results)) {
          for (const result of post.post_results) {
            if (result.success && result.postId && !platformMediaUrl) {
              const platform = result.platform;
              const account = accountMap.get(platform);

              if (account) {
                try {
                  if (platform === 'facebook') {
                    // For Facebook, try to get photo
                    const photoResponse = await fetch(
                      `https://graph.facebook.com/v21.0/${result.postId}?fields=images,picture,source&access_token=${account.access_token}`
                    );
                    
                    if (photoResponse.ok) {
                      const photoData = await photoResponse.json();
                      
                      if (photoData.images && Array.isArray(photoData.images) && photoData.images.length > 0) {
                        platformMediaUrl = photoData.images[0].source;
                      } else if (photoData.source) {
                        platformMediaUrl = photoData.picture; // Use thumbnail for videos
                      }
                    }
                    
                    // If not found as photo, try as regular post
                    if (!platformMediaUrl) {
                      const fbResponse = await fetch(
                        `https://graph.facebook.com/v21.0/${result.postId}?fields=full_picture,attachments{media_type,media,subattachments,target}&access_token=${account.access_token}`
                      );
                      
                      if (fbResponse.ok) {
                        const fbData = await fbResponse.json();
                        
                        platformMediaUrl = 
                          fbData.full_picture || 
                          fbData.attachments?.data?.[0]?.media?.image?.src ||
                          fbData.attachments?.data?.[0]?.subattachments?.data?.[0]?.media?.image?.src ||
                          fbData.attachments?.data?.[0]?.target?.image?.src ||
                          fbData.attachments?.data?.[0]?.url;
                      }
                    }
                    
                    console.log('Facebook media URL extracted for', result.postId, ':', platformMediaUrl);
                    
                  } else if (platform === 'instagram') {
                    // Fetch Instagram post with media
                    const igResponse = await fetch(
                      `https://graph.instagram.com/${result.postId}?fields=media_url,thumbnail_url&access_token=${account.access_token}`
                    );
                    
                    if (igResponse.ok) {
                      const igData = await igResponse.json();
                      platformMediaUrl = igData.media_url || igData.thumbnail_url;
                    }
                    
                  } else if (platform === 'threads') {
                    // Fetch Threads post with media
                    const threadsResponse = await fetch(
                      `https://graph.threads.net/v1.0/${result.postId}?fields=media_url,thumbnail_url&access_token=${account.access_token}`
                    );
                    
                    if (threadsResponse.ok) {
                      const threadsData = await threadsResponse.json();
                      platformMediaUrl = threadsData.media_url || threadsData.thumbnail_url;
                    }
                    
                  } else if (platform === 'pinterest') {
                    // Fetch Pinterest pin with media
                    try {
                      const pinterestResponse = await fetch(
                        `https://api.pinterest.com/v5/pins/${result.postId}`,
                        {
                          headers: {
                            'Authorization': `Bearer ${account.access_token}`,
                            'Content-Type': 'application/json'
                          }
                        }
                      );
                      
                      if (pinterestResponse.ok) {
                        const pinData = await pinterestResponse.json();
                        
                        // Extract media URL
                        if (pinData.media?.images) {
                          const imageUrl = 
                            pinData.media.images['1200x']?.url ||
                            pinData.media.images['600x']?.url ||
                            pinData.media.images['400x300']?.url ||
                            pinData.media.images.orig?.url;
                          platformMediaUrl = imageUrl;
                        }
                        
                        // Extract title and description
                        pinterestTitle = pinData.title || '';
                        pinterestDescription = pinData.description || '';
                        
                        console.log('Pinterest media URL extracted for', result.postId, ':', platformMediaUrl);
                        console.log('Pinterest title:', pinterestTitle);
                      }
                    } catch (pinError) {
                      console.error('Error fetching Pinterest pin:', pinError);
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching media for ${platform} post ${result.postId}:`, error);
                }
              }
            }
          }
        }

        return {
          ...post,
          platform_media_url: platformMediaUrl, // Add the platform media URL
          pinterest_title: pinterestTitle,
          pinterest_description: pinterestDescription
        };
      })
    );

    return NextResponse.json({ posts: enhancedPosts });

  } catch (error) {
    console.error('Error in posted posts API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch posted posts' },
      { status: 500 }
    );
  }
}