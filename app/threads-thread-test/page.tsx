'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThreadComposer } from '@/components/threads/thread-composer';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

export default function ThreadsThreadTest() {
  const [account, setAccount] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

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

  const handlePostThread = async (posts: string[]) => {
    if (!account) {
      toast.error('No Threads account connected');
      return;
    }

    setResult(null);

    try {
      // Use the numbered approach since we don't have threads_manage_replies permission
      const response = await fetch('/api/post/threads/thread-numbered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.platform_user_id,
          accessToken: account.access_token,
          posts: posts,
          addNumbers: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post thread');
      }

      setResult(data);
      
      if (data.partial) {
        toast.warning(data.message);
      } else {
        toast.success(`Thread posted successfully with ${data.posts.length} posts!`);
      }
    } catch (error) {
      console.error('Thread posting error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to post thread');
      setResult({ error: error instanceof Error ? error.message : 'Failed' });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Threads Multi-Post Thread Test</CardTitle>
          <CardDescription>
            Create a thread with multiple connected posts on Threads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {account ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
              <p className="font-semibold">Connected Account</p>
              <p className="text-sm">@{account.username}</p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
              <p>No Threads account connected. Please connect your account in Settings.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {account && (
        <Card>
          <CardHeader>
            <CardTitle>Compose Thread</CardTitle>
            <CardDescription>
              Add multiple posts to create a numbered thread series (e.g., [1/3], [2/3], [3/3])
              <br />
              <span className="text-xs text-amber-600">Note: Connected threads require additional permissions. Posts will be numbered instead.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThreadComposer onPost={handlePostThread} />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-x-auto bg-gray-100 dark:bg-gray-800 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.posts && result.posts.length > 0 && (
              <div className="mt-4">
                <a 
                  href={`https://www.threads.net/@${account.username}/post/${result.threadId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Thread on Threads →
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}