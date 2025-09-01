'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export default function ThreadsTestPost() {
  const [text, setText] = useState('Test post from SocialCal ' + new Date().toLocaleTimeString());
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    // Get the Threads account
    const getAccount = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

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
      }
    };

    getAccount();
  }, []);

  const testDirectPost = async () => {
    if (!account) {
      setResult({ error: 'No Threads account connected' });
      return;
    }

    setPosting(true);
    setResult(null);

    try {
      // Test direct API call
      const params = new URLSearchParams({
        media_type: 'TEXT',
        text: text,
        access_token: account.access_token
      });

      // Create container
      const createUrl = `https://graph.threads.net/v1.0/me/threads?${params.toString()}`;
      const createResponse = await fetch(createUrl, { method: 'POST' });
      const createData = await createResponse.json();

      console.log('Create response:', createData);

      if (!createResponse.ok || !createData.id) {
        setResult({ 
          error: 'Failed to create container',
          details: createData 
        });
        return;
      }

      // Publish
      const publishParams = new URLSearchParams({
        creation_id: createData.id,
        access_token: account.access_token
      });

      const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?${publishParams.toString()}`;
      const publishResponse = await fetch(publishUrl, { method: 'POST' });
      const publishData = await publishResponse.json();

      console.log('Publish response:', publishData);

      // Get post details
      if (publishData.id) {
        const statusUrl = `https://graph.threads.net/v1.0/${publishData.id}?fields=id,text,permalink,timestamp&access_token=${account.access_token}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        
        setResult({
          success: true,
          containerId: createData.id,
          postId: publishData.id,
          publishResponse: publishData,
          statusResponse: statusData,
          permalink: statusData.permalink || `https://www.threads.net/@${account.username}/post/${publishData.id}`
        });
      } else {
        setResult({
          success: false,
          createData,
          publishData
        });
      }
    } catch (error) {
      setResult({ 
        error: error instanceof Error ? error.message : 'Test failed',
        details: error 
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Threads Direct Post Test</CardTitle>
          <CardDescription>
            Test posting directly to Threads API to debug issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {account ? (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-semibold">Connected Account</p>
                <p className="text-sm">@{account.username} (ID: {account.platform_user_id})</p>
              </div>

              <div>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter post text"
                  className="mb-4"
                />
              </div>

              <Button 
                onClick={testDirectPost} 
                disabled={posting || !text}
                className="w-full"
              >
                {posting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Test Direct Post to Threads'
                )}
              </Button>
            </>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p>No Threads account connected. Please connect your account in Settings.</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
              {result.permalink && (
                <div className="mt-4">
                  <a 
                    href={result.permalink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Post on Threads →
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}