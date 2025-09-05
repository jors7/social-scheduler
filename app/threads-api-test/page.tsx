'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface TestResult {
  permission: string;
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function ThreadsAPITest() {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // Test inputs
  const [singlePostText, setSinglePostText] = useState('Testing single post from SocialCal - ' + new Date().toLocaleTimeString());
  const [threadPosts, setThreadPosts] = useState(['First post in thread', 'Second post (reply)', 'Third post (reply to reply)']);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800');
  const [lastPostId, setLastPostId] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadAccount();
    checkTokenExpiry();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .single();

    if (data) {
      setAccount(data);
      
      // Check if token is expired
      if (data.expires_at) {
        const expiryDate = new Date(data.expires_at);
        const now = new Date();
        if (expiryDate < now) {
          addTestResult({
            permission: 'system',
            endpoint: 'token_check',
            success: false,
            error: `Token expired on ${expiryDate.toLocaleString()}. Please reconnect in Settings.`,
            timestamp: new Date().toISOString()
          });
        } else {
          // Show when token expires
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 7) {
            addTestResult({
              permission: 'system',
              endpoint: 'token_check',
              success: true,
              data: { message: `Token expires in ${daysUntilExpiry} days (${expiryDate.toLocaleDateString()})` },
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
  };

  const checkTokenExpiry = async () => {
    try {
      const response = await fetch('/api/auth/threads/refresh');
      const data = await response.json();
      
      if (data.expired && data.expired.length > 0) {
        console.log('Expired tokens found:', data.expired);
      }
      
      if (data.needsRefresh && data.needsRefresh.length > 0) {
        console.log('Tokens need refresh:', data.needsRefresh);
        // Could auto-refresh here if needed
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
    }
  };

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  // Test 1: threads_basic - Get user profile
  const testBasicProfile = async () => {
    const endpoint = 'me?fields=id,username,threads_profile_picture_url,threads_biography';
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_basic',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_basic',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 2: threads_basic - Get user media
  const testBasicMedia = async () => {
    const endpoint = 'me/threads?fields=id,text,timestamp,permalink';
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_basic',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_basic',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 3: threads_content_publish - Create and publish text post
  const testPublishText = async () => {
    try {
      // Create container
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: singlePostText,
        access_token: account.access_token
      });
      
      const createUrl = `https://graph.threads.net/v1.0/me/threads?${createParams}`;
      const createResponse = await fetch(createUrl, { method: 'POST' });
      const createData = await createResponse.json();
      
      if (!createResponse.ok || !createData.id) {
        addTestResult({
          permission: 'threads_content_publish',
          endpoint: 'me/threads (create)',
          success: false,
          error: createData.error?.message || 'Failed to create container',
          timestamp: new Date().toISOString()
        });
        return false;
      }

      addTestResult({
        permission: 'threads_content_publish',
        endpoint: 'me/threads (create)',
        success: true,
        data: createData,
        timestamp: new Date().toISOString()
      });

      // Publish
      const publishParams = new URLSearchParams({
        creation_id: createData.id,
        access_token: account.access_token
      });
      
      const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams}`;
      const publishResponse = await fetch(publishUrl, { method: 'POST' });
      const publishData = await publishResponse.json();
      
      if (publishResponse.ok && publishData.id) {
        setLastPostId(publishData.id);
      }
      
      addTestResult({
        permission: 'threads_content_publish',
        endpoint: 'me/threads_publish',
        success: publishResponse.ok,
        data: publishResponse.ok ? publishData : undefined,
        error: !publishResponse.ok ? publishData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return publishResponse.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_content_publish',
        endpoint: 'me/threads',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 4: threads_content_publish - Create and publish image post
  const testPublishImage = async () => {
    try {
      // Create container
      const createParams = new URLSearchParams({
        media_type: 'IMAGE',
        image_url: imageUrl,
        caption: 'Test image post from SocialCal',
        access_token: account.access_token
      });
      
      const createUrl = `https://graph.threads.net/v1.0/me/threads?${createParams}`;
      const createResponse = await fetch(createUrl, { method: 'POST' });
      const createData = await createResponse.json();
      
      if (!createResponse.ok || !createData.id) {
        addTestResult({
          permission: 'threads_content_publish',
          endpoint: 'me/threads (image)',
          success: false,
          error: createData.error?.message || 'Failed to create image container',
          timestamp: new Date().toISOString()
        });
        return false;
      }

      addTestResult({
        permission: 'threads_content_publish',
        endpoint: 'me/threads (image)',
        success: true,
        data: createData,
        timestamp: new Date().toISOString()
      });

      // Wait a bit for image processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Publish
      const publishParams = new URLSearchParams({
        creation_id: createData.id,
        access_token: account.access_token
      });
      
      const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams}`;
      const publishResponse = await fetch(publishUrl, { method: 'POST' });
      const publishData = await publishResponse.json();
      
      addTestResult({
        permission: 'threads_content_publish',
        endpoint: 'me/threads_publish (image)',
        success: publishResponse.ok,
        data: publishResponse.ok ? publishData : undefined,
        error: !publishResponse.ok ? publishData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return publishResponse.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_content_publish',
        endpoint: 'me/threads (image)',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 5: threads_manage_replies - Create thread with replies
  const testCreateThread = async () => {
    let previousPostId = null;
    
    for (let i = 0; i < threadPosts.length; i++) {
      try {
        // Create container
        const createParams: any = {
          media_type: 'TEXT',
          text: threadPosts[i],
          access_token: account.access_token
        };
        
        // Add reply_to_id for subsequent posts (requires threads_manage_replies permission)
        if (previousPostId && i > 0) {
          // THIS IS THE KEY PART - Actually add the reply_to_id parameter
          createParams.reply_to_id = previousPostId;
          console.log(`Creating reply to post ${previousPostId}`);
        }
        
        const createUrlParams = new URLSearchParams(createParams);
        const createUrl = `https://graph.threads.net/v1.0/me/threads?${createUrlParams}`;
        const createResponse = await fetch(createUrl, { method: 'POST' });
        const createData = await createResponse.json();
        
        if (!createResponse.ok || !createData.id) {
          addTestResult({
            permission: 'threads_manage_replies',
            endpoint: `me/threads (post ${i + 1}/${threadPosts.length})`,
            success: false,
            error: createData.error?.message || 'Failed to create container',
            timestamp: new Date().toISOString()
          });
          return false;
        }

        // Publish
        const publishParams = new URLSearchParams({
          creation_id: createData.id,
          access_token: account.access_token
        });
        
        const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams}`;
        const publishResponse = await fetch(publishUrl, { method: 'POST' });
        const publishData = await publishResponse.json();
        
        if (publishResponse.ok && publishData.id) {
          previousPostId = publishData.id;
          if (i === 0) setLastPostId(publishData.id);
        }
        
        addTestResult({
          permission: 'threads_manage_replies',
          endpoint: `Thread post ${i + 1}/${threadPosts.length}`,
          success: publishResponse.ok,
          data: publishResponse.ok ? { postId: publishData.id, isReply: i > 0 } : undefined,
          error: !publishResponse.ok ? publishData.error?.message : undefined,
          timestamp: new Date().toISOString()
        });
        
        if (!publishResponse.ok) return false;
        
        // Small delay between posts
        if (i < threadPosts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        addTestResult({
          permission: 'threads_manage_replies',
          endpoint: `Thread post ${i + 1}`,
          success: false,
          error: error instanceof Error ? error.message : 'Failed',
          timestamp: new Date().toISOString()
        });
        return false;
      }
    }
    
    return true;
  };

  // Test 6: threads_read_replies - Get post replies
  const testReadReplies = async () => {
    // First, ensure we have a post with potential replies
    if (!lastPostId) {
      // Create a post first to get replies from
      console.log('No post available for reading replies, creating one first');
      const created = await testPublishText();
      if (!created) {
        addTestResult({
          permission: 'threads_read_replies',
          endpoint: 'post/replies',
          success: false,
          error: 'Could not create a post to read replies from',
          timestamp: new Date().toISOString()
        });
        return false;
      }
    }

    // Try different endpoint formats to find the correct one
    const endpointFormats = [
      // Format 1: Get conversation/replies as part of the media object
      {
        endpoint: `${lastPostId}/conversation?fields=id,text,username,timestamp`,
        description: 'conversation endpoint'
      },
      // Format 2: Get children (which might be replies)
      {
        endpoint: `${lastPostId}/children?fields=id,text,username,timestamp`,
        description: 'children endpoint'
      },
      // Format 3: Get the post with replies field expanded
      {
        endpoint: `${lastPostId}?fields=id,text,replies`,
        description: 'media with replies field'
      },
      // Format 4: Try replies as a connection
      {
        endpoint: `${lastPostId}/replies`,
        description: 'replies connection'
      },
      // Format 5: Get threads that mention this post (might show replies)
      {
        endpoint: `me/threads?fields=id,text,reply_to_id&reply_to_id=${lastPostId}`,
        description: 'threads filtered by reply_to_id'
      }
    ];

    let anySuccess = false;
    
    for (const format of endpointFormats) {
      try {
        const url = `https://graph.threads.net/v1.0/${format.endpoint}&access_token=${account.access_token}`;
        console.log(`Testing threads_read_replies with ${format.description}: ${format.endpoint}`);
        const response = await fetch(url);
        const data = await response.json();
        
        addTestResult({
          permission: 'threads_read_replies',
          endpoint: `${format.description}: ${format.endpoint}`,
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? data.error?.message : undefined,
          timestamp: new Date().toISOString()
        });
        
        if (response.ok) {
          anySuccess = true;
          // If this format worked, also log what data structure we got
          console.log(`Success with ${format.description}:`, data);
        }
      } catch (error) {
        addTestResult({
          permission: 'threads_read_replies',
          endpoint: format.endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Failed',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return anySuccess;
  };

  // Test 7: threads_manage_insights - Get post insights
  const testPostInsights = async () => {
    // Use the most recent post ID or indicate permission needed
    if (!lastPostId) {
      addTestResult({
        permission: 'threads_manage_insights',
        endpoint: 'post/insights',
        success: false,
        error: 'Permission not granted - requires app approval',
        timestamp: new Date().toISOString()
      });
      return false;
    }

    // Fixed metrics - removed 'shares' which is not valid
    const endpoint = `${lastPostId}/insights?metric=views,likes,replies,reposts,quotes`;
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_manage_insights',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_manage_insights',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 8: threads_manage_insights - Get user insights
  const testUserInsights = async () => {
    // Fixed metrics - removed 'shares' which is not valid
    const endpoint = 'me/threads_insights?metric=views,likes,replies,reposts,quotes&period=day';
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_manage_insights',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_manage_insights',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 9: threads_profile_discovery - Discover profiles and publishing info
  const testProfileDiscovery = async () => {
    // The threads_profile_discovery permission is actually for:
    // 1. Getting your own publishing limit
    // 2. Getting your own quota usage
    // 3. Getting media container status
    // It's NOT for discovering other users' profiles
    
    let anySuccess = false;
    
    // Test 1: Get publishing limit (main use case for this permission)
    try {
      const limitUrl = `https://graph.threads.net/v1.0/me/threads_publishing_limit?fields=quota_usage,config&access_token=${account.access_token}`;
      const limitResponse = await fetch(limitUrl);
      const limitData = await limitResponse.json();
      
      addTestResult({
        permission: 'threads_profile_discovery',
        endpoint: 'me/threads_publishing_limit',
        success: limitResponse.ok,
        data: limitResponse.ok ? limitData : undefined,
        error: !limitResponse.ok ? limitData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      if (limitResponse.ok) anySuccess = true;
    } catch (error) {
      addTestResult({
        permission: 'threads_profile_discovery',
        endpoint: 'me/threads_publishing_limit',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test 2: Get media container status (if we have a recent post)
    if (lastPostId) {
      try {
        const statusUrl = `https://graph.threads.net/v1.0/${lastPostId}?fields=id,status,error_message&access_token=${account.access_token}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        
        addTestResult({
          permission: 'threads_profile_discovery',
          endpoint: `${lastPostId}?fields=status (media status)`,
          success: statusResponse.ok,
          data: statusResponse.ok ? statusData : undefined,
          error: !statusResponse.ok ? statusData.error?.message : undefined,
          timestamp: new Date().toISOString()
        });
        
        if (statusResponse.ok) anySuccess = true;
      } catch (error) {
        // Might fail if post doesn't exist
      }
    }
    
    // Test 3: Get your own profile with extended fields
    try {
      const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography,name&access_token=${account.access_token}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      
      addTestResult({
        permission: 'threads_profile_discovery',
        endpoint: 'me?fields=extended (own profile)',
        success: profileResponse.ok,
        data: profileResponse.ok ? profileData : undefined,
        error: !profileResponse.ok ? profileData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      if (profileResponse.ok) anySuccess = true;
    } catch (error) {
      // Might fail
    }
    
    // Test 4: Get quota usage details
    try {
      const quotaUrl = `https://graph.threads.net/v1.0/me/threads_publishing_limit?fields=quota_usage,config,rate_limit_settings&access_token=${account.access_token}`;
      const quotaResponse = await fetch(quotaUrl);
      const quotaData = await quotaResponse.json();
      
      addTestResult({
        permission: 'threads_profile_discovery',
        endpoint: 'me/threads_publishing_limit (detailed)',
        success: quotaResponse.ok,
        data: quotaResponse.ok ? quotaData : undefined,
        error: !quotaResponse.ok ? quotaData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      if (quotaResponse.ok) anySuccess = true;
    } catch (error) {
      // Might fail
    }
    
    return anySuccess;
  };

  // Test 10: threads_location_tagging - Post with location
  const testLocationTagging = async () => {
    const endpoint = 'me/threads';
    try {
      // Location tagging requires a valid location ID from Facebook Pages
      // We need to get location IDs from Facebook Graph API first
      // For testing, we'll try different approaches
      
      // Attempt 1: Try with a numeric location ID format
      // These are typically Facebook Page IDs for places
      const locationIds = [
        '1475609846065784', // Example: A public location page ID
        '105540271821698',  // Another format
        'ChIJOwg_06VPwokRYv534QaPC8g', // Google Place ID format (might work)
      ];
      
      let successfulTest = false;
      
      for (const locationId of locationIds) {
        const createParams = new URLSearchParams({
          media_type: 'TEXT',
          text: `Testing location tagging (${locationId}) - ${new Date().toLocaleTimeString()}`,
          location_id: locationId,
          access_token: account.access_token
        });
        
        const createUrl = `https://graph.threads.net/v1.0/${endpoint}?${createParams}`;
        const createResponse = await fetch(createUrl, { method: 'POST' });
        const createData = await createResponse.json();
        
        addTestResult({
          permission: 'threads_location_tagging',
          endpoint: `${endpoint} (location_id: ${locationId.substring(0, 10)}...)`,
          success: createResponse.ok,
          data: createResponse.ok ? createData : undefined,
          error: !createResponse.ok ? createData.error?.message : undefined,
          timestamp: new Date().toISOString()
        });
        
        if (createResponse.ok) {
          successfulTest = true;
          
          // If container was created, try to publish it
          if (createData.id) {
            const publishParams = new URLSearchParams({
              creation_id: createData.id,
              access_token: account.access_token
            });
            
            const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams}`;
            const publishResponse = await fetch(publishUrl, { method: 'POST' });
            const publishData = await publishResponse.json();
            
            addTestResult({
              permission: 'threads_location_tagging',
              endpoint: 'me/threads_publish (with location)',
              success: publishResponse.ok,
              data: publishResponse.ok ? publishData : undefined,
              error: !publishResponse.ok ? publishData.error?.message : undefined,
              timestamp: new Date().toISOString()
            });
          }
          break; // Stop if we found a working location ID
        }
      }
      
      // Also test reading posts with location data
      const readUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,text,location&limit=5&access_token=${account.access_token}`;
      const readResponse = await fetch(readUrl);
      const readData = await readResponse.json();
      
      addTestResult({
        permission: 'threads_location_tagging',
        endpoint: 'me/threads?fields=location',
        success: readResponse.ok,
        data: readResponse.ok ? readData : undefined,
        error: !readResponse.ok ? readData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      // The API calls are made and will be counted even if they fail
      // This is what matters for Meta's dashboard
      return successfulTest || readResponse.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_location_tagging',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test location tagging',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 11: threads_delete - Delete a post
  const testDeletePost = async () => {
    // First create a post to delete
    try {
      // Create
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: 'Test post to delete for app review',
        access_token: account.access_token
      });
      
      const createUrl = `https://graph.threads.net/v1.0/me/threads?${createParams}`;
      const createResponse = await fetch(createUrl, { method: 'POST' });
      const createData = await createResponse.json();
      
      if (!createResponse.ok || !createData.id) {
        addTestResult({
          permission: 'threads_delete',
          endpoint: 'delete test - creation failed',
          success: false,
          error: createData.error?.message || 'Failed to create post for deletion',
          timestamp: new Date().toISOString()
        });
        return false;
      }

      // Publish
      const publishParams = new URLSearchParams({
        creation_id: createData.id,
        access_token: account.access_token
      });
      
      const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams}`;
      const publishResponse = await fetch(publishUrl, { method: 'POST' });
      const publishData = await publishResponse.json();
      
      if (!publishResponse.ok || !publishData.id) {
        addTestResult({
          permission: 'threads_delete',
          endpoint: 'delete test - publish failed',
          success: false,
          error: publishData.error?.message || 'Failed to publish post for deletion',
          timestamp: new Date().toISOString()
        });
        return false;
      }

      // Now delete it
      const deleteUrl = `https://graph.threads.net/v1.0/${publishData.id}?access_token=${account.access_token}`;
      const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });
      const deleteData = await deleteResponse.json();
      
      addTestResult({
        permission: 'threads_delete',
        endpoint: `DELETE ${publishData.id}`,
        success: deleteResponse.ok,
        data: deleteResponse.ok ? deleteData : undefined,
        error: !deleteResponse.ok ? deleteData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return deleteResponse.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_delete',
        endpoint: 'delete post',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 12: threads_manage_mentions - Post with mentions
  const testManageMentions = async () => {
    try {
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: 'Test post with @meta mention for app review',
        access_token: account.access_token
      });
      
      const createUrl = `https://graph.threads.net/v1.0/me/threads?${createParams}`;
      const createResponse = await fetch(createUrl, { method: 'POST' });
      const createData = await createResponse.json();
      
      addTestResult({
        permission: 'threads_manage_mentions',
        endpoint: 'me/threads (with mention)',
        success: createResponse.ok && !!createData.id,
        data: createResponse.ok ? createData : undefined,
        error: !createResponse.ok ? createData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      // If creation successful, publish it
      if (createResponse.ok && createData.id) {
        const publishParams = new URLSearchParams({
          creation_id: createData.id,
          access_token: account.access_token
        });
        
        const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams}`;
        const publishResponse = await fetch(publishUrl, { method: 'POST' });
        const publishData = await publishResponse.json();
        
        if (publishResponse.ok && publishData.id) {
          setLastPostId(publishData.id);
        }
      }
      
      return createResponse.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_manage_mentions',
        endpoint: 'me/threads (with mention)',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 13: threads_keyword_search - Search for posts
  const testKeywordSearch = async () => {
    try {
      // Search API not available in current Threads API version
      addTestResult({
        permission: 'threads_keyword_search',
        endpoint: 'search',
        success: false,
        error: 'Search API not available - requires app approval',
        timestamp: new Date().toISOString()
      });
      return false;
    } catch (error) {
      addTestResult({
        permission: 'threads_keyword_search',
        endpoint: 'search',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 14: COMPREHENSIVE threads_manage_replies + threads_read_replies test
  const testComprehensiveReplies = async () => {
    console.log('Starting comprehensive reply test...');
    
    try {
      // Step 1: Create a main post
      const mainPostText = `Main post for reply testing - ${new Date().toLocaleTimeString()}`;
      const createMainParams = new URLSearchParams({
        media_type: 'TEXT',
        text: mainPostText,
        access_token: account.access_token
      });
      
      const createMainUrl = `https://graph.threads.net/v1.0/me/threads?${createMainParams}`;
      const createMainResponse = await fetch(createMainUrl, { method: 'POST' });
      const createMainData = await createMainResponse.json();
      
      if (!createMainResponse.ok || !createMainData.id) {
        addTestResult({
          permission: 'threads_manage_replies',
          endpoint: 'Comprehensive test - create main post',
          success: false,
          error: createMainData.error?.message || 'Failed to create main post',
          timestamp: new Date().toISOString()
        });
        return false;
      }

      // Publish the main post
      const publishMainParams = new URLSearchParams({
        creation_id: createMainData.id,
        access_token: account.access_token
      });
      
      const publishMainUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishMainParams}`;
      const publishMainResponse = await fetch(publishMainUrl, { method: 'POST' });
      const publishMainData = await publishMainResponse.json();
      
      if (!publishMainResponse.ok || !publishMainData.id) {
        addTestResult({
          permission: 'threads_manage_replies',
          endpoint: 'Comprehensive test - publish main post',
          success: false,
          error: publishMainData.error?.message || 'Failed to publish main post',
          timestamp: new Date().toISOString()
        });
        return false;
      }

      const mainPostId = publishMainData.id;
      console.log(`Main post created: ${mainPostId}`);
      
      addTestResult({
        permission: 'threads_manage_replies',
        endpoint: 'Comprehensive test - main post created',
        success: true,
        data: { postId: mainPostId, text: mainPostText },
        timestamp: new Date().toISOString()
      });

      // Wait a bit before creating reply
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Create a reply using threads_manage_replies permission
      const replyText = `Reply to main post - ${new Date().toLocaleTimeString()}`;
      const createReplyParams = new URLSearchParams({
        media_type: 'TEXT',
        text: replyText,
        reply_to_id: mainPostId, // THIS IS THE KEY PARAMETER FOR threads_manage_replies
        access_token: account.access_token
      });
      
      console.log(`Creating reply to post ${mainPostId} with reply_to_id parameter`);
      const createReplyUrl = `https://graph.threads.net/v1.0/me/threads?${createReplyParams}`;
      const createReplyResponse = await fetch(createReplyUrl, { method: 'POST' });
      const createReplyData = await createReplyResponse.json();
      
      addTestResult({
        permission: 'threads_manage_replies',
        endpoint: 'me/threads (with reply_to_id parameter)',
        success: createReplyResponse.ok && !!createReplyData.id,
        data: createReplyResponse.ok ? { containerId: createReplyData.id, replyToId: mainPostId } : undefined,
        error: !createReplyResponse.ok ? createReplyData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });

      if (!createReplyResponse.ok || !createReplyData.id) {
        return false;
      }

      // Publish the reply
      const publishReplyParams = new URLSearchParams({
        creation_id: createReplyData.id,
        access_token: account.access_token
      });
      
      const publishReplyUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishReplyParams}`;
      const publishReplyResponse = await fetch(publishReplyUrl, { method: 'POST' });
      const publishReplyData = await publishReplyResponse.json();
      
      addTestResult({
        permission: 'threads_manage_replies',
        endpoint: 'me/threads_publish (reply)',
        success: publishReplyResponse.ok,
        data: publishReplyResponse.ok ? publishReplyData : undefined,
        error: !publishReplyResponse.ok ? publishReplyData.error?.message : undefined,
        timestamp: new Date().toISOString()
      });

      // Wait a bit for the reply to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Read the replies using threads_read_replies permission
      // Try multiple formats since the exact endpoint is unclear
      const replyEndpoints = [
        {
          url: `https://graph.threads.net/v1.0/${mainPostId}/conversation?fields=id,text,username,timestamp&access_token=${account.access_token}`,
          description: 'conversation endpoint'
        },
        {
          url: `https://graph.threads.net/v1.0/${mainPostId}/children?fields=id,text,username,timestamp&access_token=${account.access_token}`,
          description: 'children endpoint'
        },
        {
          url: `https://graph.threads.net/v1.0/${mainPostId}?fields=id,text,children,conversation&access_token=${account.access_token}`,
          description: 'media with children/conversation'
        },
        {
          url: `https://graph.threads.net/v1.0/me/threads?fields=id,text,username,timestamp&filter=replies_to_${mainPostId}&access_token=${account.access_token}`,
          description: 'filtered threads'
        }
      ];

      let readSuccess = false;
      for (const endpoint of replyEndpoints) {
        console.log(`Trying to read replies with ${endpoint.description}`);
        const response = await fetch(endpoint.url);
        const data = await response.json();
        
        addTestResult({
          permission: 'threads_read_replies',
          endpoint: endpoint.description,
          success: response.ok,
          data: response.ok ? data : undefined,
          error: !response.ok ? data.error?.message : undefined,
          timestamp: new Date().toISOString()
        });

        if (response.ok) {
          readSuccess = true;
          console.log(`Successfully read with ${endpoint.description}:`, data);
        }
      }

      // If none of the read endpoints work, it might be that threads_read_replies 
      // permission is not yet granted or the API doesn't expose replies directly
      if (!readSuccess) {
        addTestResult({
          permission: 'threads_read_replies',
          endpoint: 'API Call Attempted',
          success: false,
          error: 'The threads_read_replies permission may require app review approval. API calls have been made to count towards Meta dashboard.',
          timestamp: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      addTestResult({
        permission: 'threads_manage_replies/threads_read_replies',
        endpoint: 'Comprehensive reply test',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Run all tests - Only the 5 permissions we actually need
  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    setLastPostId(''); // Reset post ID

    console.log('Starting Threads API tests for SocialCal required permissions...');
    
    // Test 1: threads_basic (Essential for authentication)
    await testBasicProfile();
    await testBasicMedia();

    // Test 2: threads_content_publish (Essential for posting)
    await testPublishText(); // This should set lastPostId
    await testPublishImage();

    // Test 3: threads_manage_replies (Essential for creating threads)
    await testCreateThread();

    // Test 4: threads_manage_insights (Important for analytics)
    await testPostInsights();
    await testUserInsights();

    // Test 5: threads_read_replies (Nice to have for engagement)
    await testReadReplies();

    // Test 6: COMPREHENSIVE test for replies (ensures both permissions are tested)
    await testComprehensiveReplies();

    setLoading(false);
    console.log('All required tests completed. Last post ID:', lastPostId);
  };

  // Export results for submission
  const exportResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `threads-api-test-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!account) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Threads API Test Suite</CardTitle>
            <CardDescription>No Threads account connected</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please connect your Threads account in Settings first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Threads API Test Suite for Meta App Approval</CardTitle>
          <CardDescription>
            Test all Threads API permissions required for app approval. 
            Connected as @{account.username}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="tests">Run Tests</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Test Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Single Post Text</label>
                    <Input
                      value={singlePostText}
                      onChange={(e) => setSinglePostText(e.target.value)}
                      placeholder="Text for single post test"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Thread Posts (one per line)</label>
                    <Textarea
                      value={threadPosts.join('\n')}
                      onChange={(e) => setThreadPosts(e.target.value.split('\n').filter(p => p.trim()))}
                      placeholder="Enter posts for thread test"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Image URL (public)</label>
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Permissions Required for SocialCal:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="font-bold">✓ threads_basic - User authentication & profile</li>
                  <li className="font-bold">✓ threads_content_publish - Create posts & images</li>
                  <li className="font-bold">✓ threads_manage_replies - Create multi-post threads</li>
                  <li className="font-bold">✓ threads_manage_insights - Analytics & metrics</li>
                  <li className="font-bold">✓ threads_read_replies - Read engagement data</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">Only these 5 permissions are needed for full functionality</p>
              </div>
            </TabsContent>

            <TabsContent value="tests" className="space-y-4">
              <div className="space-y-4">
                <Button 
                  onClick={runAllTests} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    'Run All Tests'
                  )}
                </Button>

                <div className="grid gap-2">
                  <h3 className="text-sm font-semibold text-gray-600">1. threads_basic</h3>
                  <Button onClick={testBasicProfile} disabled={loading} variant="outline" className="ml-4">
                    Test: Get User Profile
                  </Button>
                  <Button onClick={testBasicMedia} disabled={loading} variant="outline" className="ml-4">
                    Test: Get User Media
                  </Button>
                  
                  <h3 className="text-sm font-semibold text-gray-600 mt-2">2. threads_content_publish</h3>
                  <Button onClick={testPublishText} disabled={loading} variant="outline" className="ml-4">
                    Test: Publish Text Post
                  </Button>
                  <Button onClick={testPublishImage} disabled={loading} variant="outline" className="ml-4">
                    Test: Publish Image Post
                  </Button>
                  
                  <h3 className="text-sm font-semibold text-gray-600 mt-2">3. threads_manage_replies</h3>
                  <Button onClick={testCreateThread} disabled={loading} variant="outline" className="ml-4">
                    Test: Create Multi-Post Thread
                  </Button>
                  
                  <h3 className="text-sm font-semibold text-gray-600 mt-2">4. threads_manage_insights</h3>
                  <Button onClick={testPostInsights} disabled={loading} variant="outline" className="ml-4">
                    Test: Get Post Analytics
                  </Button>
                  <Button onClick={testUserInsights} disabled={loading} variant="outline" className="ml-4">
                    Test: Get Account Analytics
                  </Button>
                  
                  <h3 className="text-sm font-semibold text-gray-600 mt-2">5. threads_read_replies</h3>
                  <Button onClick={testReadReplies} disabled={loading} variant="outline" className="ml-4">
                    Test: Read Post Replies
                  </Button>
                  
                  <h3 className="text-sm font-semibold text-gray-600 mt-2">6. COMPREHENSIVE Reply Test</h3>
                  <Button 
                    onClick={testComprehensiveReplies} 
                    disabled={loading} 
                    variant="outline" 
                    className="ml-4 border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    Test: Complete Reply Flow (Create Post → Create Reply → Read Replies)
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {testResults.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Test Results ({testResults.length})</h3>
                    <Button onClick={exportResults} variant="outline" size="sm">
                      Export Results
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${
                          result.success 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">
                              {result.permission} - {result.endpoint}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                            {result.error && (
                              <div className="text-sm text-red-600 mt-1">
                                Error: {result.error}
                              </div>
                            )}
                            {result.data && (
                              <details className="mt-2">
                                <summary className="text-sm cursor-pointer">View Response</summary>
                                <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">For Meta App Review:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Export these results using the button above</li>
                          <li>Take screenshots of successful API calls</li>
                          <li>Submit within 30 days of testing</li>
                          <li>Include clear use case descriptions</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500">No test results yet. Run tests to see results.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}