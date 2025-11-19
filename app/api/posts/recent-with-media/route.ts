import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BskyAgent } from '@atproto/api';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent posted posts from database
    const { data: recentPosts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(5);

    if (postsError) {
      console.error('Error fetching recent posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    if (!recentPosts || recentPosts.length === 0) {
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
      return NextResponse.json({ posts: recentPosts }); // Return posts without media URLs
    }

    // Create a map of platform to account for easy lookup
    const accountMap = new Map();
    accounts.forEach(acc => {
      accountMap.set(acc.platform, acc);
    });

    // Enhance posts with media URLs from platforms
    const enhancedPosts = await Promise.all(
      recentPosts.map(async (post) => {
        // Try to get media URL from platform APIs
        // Prioritize database value if it exists, BUT for Pinterest always use media_urls
        let platformMediaUrl = post.platform_media_url || null;

        // Check if this is a Pinterest post - if so, use media_urls from database instead
        const isPinterestPost = post.platforms && Array.isArray(post.platforms) && post.platforms.includes('pinterest');

        // Debug logging for Pinterest posts
        if (isPinterestPost) {
          console.log('🔍 Pinterest post detected:', {
            postId: post.id,
            platforms: post.platforms,
            media_urls: post.media_urls,
            platform_media_url: post.platform_media_url,
            post_results: post.post_results
          });
        }

        if (isPinterestPost && post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          const firstMedia = post.media_urls[0];
          if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
            platformMediaUrl = firstMedia.trim();
            console.log('Pinterest: Using database media_urls instead of platform_media_url for permanent URL:', platformMediaUrl);
          } else {
            console.log('Pinterest post but media_urls[0] is not a valid string:', firstMedia);
          }
        } else if (isPinterestPost) {
          console.log('Pinterest post but no valid media_urls:', { media_urls: post.media_urls, postId: post.id });
        }

        // Only fetch from APIs if not already in database
        if (!platformMediaUrl && post.post_results && Array.isArray(post.post_results)) {
          for (const result of post.post_results) {
            if (result.success && result.postId && !platformMediaUrl) {
              const platform = result.platform;
              const account = accountMap.get(platform);

              // Handle TikTok first (doesn't require account - reads from database)
              if (platform === 'tiktok') {
                try {
                  if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
                    const firstMedia = post.media_urls[0];

                    // Check if media is in new object format with thumbnail
                    if (typeof firstMedia === 'object' && firstMedia.thumbnailUrl) {
                      platformMediaUrl = firstMedia.thumbnailUrl;
                      console.log('TikTok thumbnail URL from media_urls for', result.postId, ':', platformMediaUrl);
                    } else if (typeof firstMedia === 'object' && firstMedia.url) {
                      // Object format but no thumbnail, use video URL
                      platformMediaUrl = firstMedia.url;
                      console.log('TikTok video URL (no thumbnail) for', result.postId, ':', platformMediaUrl);
                    } else if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
                      // Old string format, use as-is
                      platformMediaUrl = firstMedia;
                      console.log('TikTok video URL (legacy format) for', result.postId, ':', platformMediaUrl);
                    }
                  }
                } catch (tiktokError) {
                  console.error('Error handling TikTok video:', tiktokError);
                }
              } else if (account) {
                try {
                  if (platform === 'facebook') {
                    // For Facebook, we need to check if it's a photo post specifically
                    // First try to get it as a photo
                    const photoResponse = await fetch(
                      `https://graph.facebook.com/v21.0/${result.postId}?fields=images,picture,source&access_token=${account.access_token}`
                    );
                    
                    if (photoResponse.ok) {
                      const photoData = await photoResponse.json();
                      
                      // Check if it's a photo with images array
                      if (photoData.images && Array.isArray(photoData.images) && photoData.images.length > 0) {
                        // Get the highest quality image
                        platformMediaUrl = photoData.images[0].source;
                      } else if (photoData.source) {
                        // For video posts
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
                        
                        // Try different ways to get the image URL
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
                    // Use original media_urls from database (permanent Supabase Storage URLs)
                    // Pinterest API returns temporary CDN URLs that expire, so we use our stored media instead
                    try {
                      if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
                        const firstMedia = post.media_urls[0];
                        if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
                          platformMediaUrl = firstMedia.trim();
                          console.log('Pinterest media URL from database for', result.postId, ':', platformMediaUrl);
                        }
                      }
                    } catch (pinError) {
                      console.error('Error handling Pinterest media:', pinError);
                    }
                  } else if (platform === 'bluesky') {
                    // Fetch Bluesky post with media
                    try {
                      const agent = new BskyAgent({
                        service: 'https://bsky.social'
                      });

                      // Login to Bluesky
                      await agent.login({
                        identifier: account.access_token, // identifier stored in access_token
                        password: account.access_secret   // app password stored in access_secret
                      });

                      // The postId for Bluesky is the URI
                      const postUri = result.postId;

                      // Parse the URI to get the post
                      const uriParts = postUri.split('/');
                      const did = uriParts[2];
                      const rkey = uriParts[uriParts.length - 1];

                      // Fetch the post
                      const postResponse = await agent.getPostThread({
                        uri: postUri,
                        depth: 0
                      });

                      if (postResponse.success && postResponse.data.thread) {
                        const thread = postResponse.data.thread;

                        // Check if it's a ThreadViewPost (has the post property)
                        if ('post' in thread && thread.post) {
                          const post = thread.post as any;

                          // Extract media URL from embed
                          if (post.embed?.images && post.embed.images.length > 0) {
                            // Use fullsize or thumb
                            platformMediaUrl = post.embed.images[0].fullsize || post.embed.images[0].thumb;
                          }

                          console.log('Bluesky media URL extracted for', result.postId, ':', platformMediaUrl);
                        }
                      }
                    } catch (blueskyError) {
                      console.error('Error fetching Bluesky post:', blueskyError);
                    }
                  }
                  // TikTok is handled above (outside the if (account) block)
                } catch (error) {
                  console.error(`Error fetching media for ${platform} post ${result.postId}:`, error);
                }
              }
            }
          }
        }

        // Final fallback: if platformMediaUrl is still null, try using media_urls from database
        // This handles expired Instagram/Facebook stories and other edge cases
        if (!platformMediaUrl && post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          const firstMedia = post.media_urls[0]
          if (typeof firstMedia === 'string' && firstMedia.trim() !== '') {
            platformMediaUrl = firstMedia.trim()
            console.log('Using fallback media_urls (string) for post:', post.id)
          } else if (firstMedia && typeof firstMedia === 'object') {
            // Handle object format: { url: '...', thumbnailUrl: '...' }
            if (firstMedia.thumbnailUrl && typeof firstMedia.thumbnailUrl === 'string') {
              platformMediaUrl = firstMedia.thumbnailUrl.trim()
              console.log('Using fallback media_urls (thumbnailUrl) for post:', post.id)
            } else if (firstMedia.url && typeof firstMedia.url === 'string') {
              platformMediaUrl = firstMedia.url.trim()
              console.log('Using fallback media_urls (url) for post:', post.id)
            }
          }
        }

        return {
          ...post,
          platform_media_url: platformMediaUrl // Add the platform media URL
        };
      })
    );

    return NextResponse.json({ posts: enhancedPosts });

  } catch (error) {
    console.error('Error in recent posts API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recent posts' },
      { status: 500 }
    );
  }
}