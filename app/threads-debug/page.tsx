'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function ThreadsDebugPage() {
  const [authUrl, setAuthUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const testAuth = async (endpoint: string) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setAuthUrl(data.authUrl || data.error || 'No URL returned');
    } catch (error) {
      setAuthUrl(`Error: ${error}`);
    }
    setLoading(false);
  };

  const redirectUris = {
    production: 'https://www.socialcal.app/api/auth/threads/callback',
    local: 'http://localhost:3001/api/auth/threads/callback'
  };

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const currentRedirectUri = isLocal ? redirectUris.local : redirectUris.production;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Threads Authentication Debug</CardTitle>
          <CardDescription>
            Debug tool to identify Threads OAuth issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">Current Environment</h3>
            <p className="text-sm">Environment: {isLocal ? 'Local Development' : 'Production'}</p>
            <p className="text-sm">Expected Redirect URI: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{currentRedirectUri}</code></p>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">⚠️ Meta Developer Console Setup</h3>
            <p className="text-sm mb-2">Make sure these EXACT redirect URIs are added in your Meta app settings:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{redirectUris.production}</code></li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{redirectUris.local}</code></li>
            </ul>
            <p className="text-sm mt-2">Go to: Meta Developer Console → Your App → Threads → Settings → Valid OAuth Redirect URIs</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Test Authentication Endpoints</h3>
            
            <Button 
              onClick={() => testAuth('/api/auth/threads')} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              Test Basic Auth (threads_basic, threads_content_publish)
            </Button>

            <Button 
              onClick={() => testAuth('/api/auth/threads-full')} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              Test Full Auth (all permissions)
            </Button>
          </div>

          {authUrl && (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Generated Auth URL:</h3>
              <p className="text-xs break-all font-mono">{authUrl}</p>
              {authUrl.startsWith('https://') && (
                <Button 
                  onClick={() => window.open(authUrl, '_blank')}
                  className="mt-2"
                  size="sm"
                >
                  Open Auth URL
                </Button>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Check Meta Developer Console for app status (should be "Live" or "Development")</li>
              <li>Verify both redirect URIs are added exactly as shown above</li>
              <li>Check if your Threads App ID is correct: <code>1074593118154653</code></li>
              <li>Ensure app secret is correctly set in environment variables</li>
              <li>Try disconnecting and reconnecting in an incognito window</li>
              <li>Check if Meta has any ongoing platform issues</li>
            </ol>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">Common Issues:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>&quot;redirect_uri&quot; error</strong>: URI mismatch between app and Meta settings</li>
              <li><strong>&quot;TikTok&quot; error</strong>: Generic Threads error, usually permissions or config issue</li>
              <li><strong>Works locally but not production</strong>: Production redirect URI not added</li>
              <li><strong>Worked yesterday, not today</strong>: Meta changed something or app was restricted</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}