'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ThreadsCaptureTest() {
  const [code, setCode] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Check if we have a code in the URL
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    const urlError = params.get('error');
    
    if (urlCode) {
      setCode(urlCode);
    }
    if (urlError) {
      setError(`OAuth Error: ${urlError}`);
    }
  }, []);

  const startAuth = () => {
    const state = 'test_' + Math.random().toString(36).substring(7);
    const appId = '1074593118154653';
    const redirectUri = encodeURIComponent('https://www.socialcal.app/threads-capture');
    const loggerId = `${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
    
    const consentUrl = `https://www.threads.com/privacy/consent/?flow=gdp&params[redirect_uri]="${redirectUri}"&params[app_id]=${appId}&params[display]="page"&params[logger_id]="${loggerId}"&params[response_type]="code"&params[scope]=["threads_basic","threads_content_publish"]&params[state]=${state}&params[next]="read"&params[steps]={"read":["threads_basic","threads_content_publish"]}&params[south_korea_ux]=false&source=gdp_delegated`;
    
    window.location.href = consentUrl;
  };

  const testToken = async () => {
    if (!code) {
      setError('No authorization code available');
      return;
    }

    setTesting(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/auth/threads-test-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          redirect_uri: 'https://www.socialcal.app/threads-capture'
        })
      });

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Threads Authorization Test</CardTitle>
          <CardDescription>
            This page helps debug the Threads OAuth flow by capturing the authorization code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!code && (
            <div>
              <Button onClick={startAuth} className="w-full">
                Start Threads Authorization
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This will redirect you to Threads for authorization, then back here with the code.
              </p>
            </div>
          )}

          {code && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-semibold text-green-800 dark:text-green-200">Authorization Code Received!</p>
                <p className="text-sm text-green-700 dark:text-green-300 font-mono mt-2">
                  {code.substring(0, 20)}...
                </p>
              </div>

              <Button 
                onClick={testToken} 
                disabled={testing}
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Token Exchange...
                  </>
                ) : (
                  'Test Token Exchange'
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="font-semibold text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <h3 className="font-semibold">Test Results:</h3>
              <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}