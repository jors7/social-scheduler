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
        
        // Add reply_to_id for subsequent posts
        if (previousPostId) {
          createParams.reply_to_id = previousPostId;
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
    if (!lastPostId) {
      addTestResult({
        permission: 'threads_read_replies',
        endpoint: 'post/replies',
        success: false,
        error: 'No post ID available. Create a post first.',
        timestamp: new Date().toISOString()
      });
      return false;
    }

    const endpoint = `${lastPostId}/replies?fields=id,text,username,timestamp,like_count`;
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_read_replies',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_read_replies',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 7: threads_manage_insights - Get post insights
  const testPostInsights = async () => {
    if (!lastPostId) {
      addTestResult({
        permission: 'threads_manage_insights',
        endpoint: 'post/insights',
        success: false,
        error: 'No post ID available. Create a post first.',
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

  // Test 9: threads_profile_discovery - Get publishing limit
  const testProfileDiscovery = async () => {
    const endpoint = 'me/threads_publishing_limit';
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}?access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_profile_discovery',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_profile_discovery',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Test 10: threads_location_tagging - Post with location
  const testLocationTagging = async () => {
    try {
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: 'Test post with location tagging for app review',
        location_id: '106377336067638', // Generic US location
        access_token: account.access_token
      });
      
      const createUrl = `https://graph.threads.net/v1.0/me/threads?${createParams}`;
      const createResponse = await fetch(createUrl, { method: 'POST' });
      const createData = await createResponse.json();
      
      addTestResult({
        permission: 'threads_location_tagging',
        endpoint: 'me/threads (with location)',
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
        permission: 'threads_location_tagging',
        endpoint: 'me/threads (with location)',
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
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
    const endpoint = 'search?q=test&type=threads';
    try {
      const url = `https://graph.threads.net/v1.0/${endpoint}&access_token=${account.access_token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      addTestResult({
        permission: 'threads_keyword_search',
        endpoint,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.error?.message : undefined,
        timestamp: new Date().toISOString()
      });
      
      return response.ok;
    } catch (error) {
      addTestResult({
        permission: 'threads_keyword_search',
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);

    // Test threads_basic
    await testBasicProfile();
    await testBasicMedia();

    // Test threads_content_publish
    await testPublishText();
    await testPublishImage();

    // Test threads_profile_discovery
    await testProfileDiscovery();

    // Test threads_location_tagging
    await testLocationTagging();

    // Test threads_delete
    await testDeletePost();

    // Test threads_manage_mentions
    await testManageMentions();

    // Test threads_keyword_search
    await testKeywordSearch();

    // Test threads_manage_replies
    await testCreateThread();

    // Test threads_read_replies
    await testReadReplies();

    // Test threads_manage_insights
    await testPostInsights();
    await testUserInsights();

    setLoading(false);
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
                <h4 className="font-semibold mb-2">All Permissions to Test:</h4>
                <ul className="space-y-1 text-sm">
                  <li>✓ threads_basic - User profile and media</li>
                  <li>✓ threads_content_publish - Create posts</li>
                  <li>✓ threads_profile_discovery - Publishing limits</li>
                  <li>✓ threads_location_tagging - Location tags</li>
                  <li>✓ threads_delete - Delete posts</li>
                  <li>✓ threads_manage_mentions - Mentions</li>
                  <li>✓ threads_keyword_search - Search</li>
                  <li>✓ threads_manage_replies - Create threads</li>
                  <li>✓ threads_read_replies - Read replies</li>
                  <li>✓ threads_manage_insights - Analytics</li>
                </ul>
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
                  <Button onClick={testBasicProfile} disabled={loading} variant="outline">
                    Test: Get User Profile (threads_basic)
                  </Button>
                  <Button onClick={testBasicMedia} disabled={loading} variant="outline">
                    Test: Get User Media (threads_basic)
                  </Button>
                  <Button onClick={testPublishText} disabled={loading} variant="outline">
                    Test: Publish Text Post (threads_content_publish)
                  </Button>
                  <Button onClick={testPublishImage} disabled={loading} variant="outline">
                    Test: Publish Image Post (threads_content_publish)
                  </Button>
                  <Button onClick={testProfileDiscovery} disabled={loading} variant="outline">
                    Test: Publishing Limit (threads_profile_discovery)
                  </Button>
                  <Button onClick={testLocationTagging} disabled={loading} variant="outline">
                    Test: Location Tagging (threads_location_tagging)
                  </Button>
                  <Button onClick={testDeletePost} disabled={loading} variant="outline">
                    Test: Delete Post (threads_delete)
                  </Button>
                  <Button onClick={testManageMentions} disabled={loading} variant="outline">
                    Test: Mentions (threads_manage_mentions)
                  </Button>
                  <Button onClick={testKeywordSearch} disabled={loading} variant="outline">
                    Test: Search (threads_keyword_search)
                  </Button>
                  <Button onClick={testCreateThread} disabled={loading} variant="outline">
                    Test: Create Thread (threads_manage_replies)
                  </Button>
                  <Button onClick={testReadReplies} disabled={loading} variant="outline">
                    Test: Read Replies (threads_read_replies)
                  </Button>
                  <Button onClick={testPostInsights} disabled={loading} variant="outline">
                    Test: Post Insights (threads_manage_insights)
                  </Button>
                  <Button onClick={testUserInsights} disabled={loading} variant="outline">
                    Test: User Insights (threads_manage_insights)
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