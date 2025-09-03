'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Facebook } from 'lucide-react';

export default function FacebookSetupPage() {
  const [account, setAccount] = useState<any>(null);
  const [pageUrl, setPageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'facebook')
          .single();
        
        setAccount(data);
        
        if (data && data.platform_user_id === 'PENDING_SETUP') {
          setMessage({
            type: 'info',
            text: 'Facebook connected! Now enter your Facebook Page URL to complete setup.'
          });
        }
      }
    } catch (error) {
      console.error('Error loading account:', error);
    }
  };

  const connectPage = async () => {
    if (!pageUrl) {
      setMessage({ type: 'error', text: 'Please enter a Facebook Page URL' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/auth/facebook/connect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        // Reload account to show updated info
        await loadAccount();
        setPageUrl('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to connect page' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const startFacebookAuth = async () => {
    try {
      const response = await fetch('/api/auth/facebook');
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to start Facebook authorization' });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Facebook className="h-6 w-6 text-blue-600" />
            <CardTitle>Facebook Page Setup</CardTitle>
          </div>
          <CardDescription>
            Connect your Facebook Page to start posting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!account ? (
            <div className="text-center space-y-4">
              <p>First, connect your Facebook account:</p>
              <Button onClick={startFacebookAuth} className="mx-auto">
                Connect Facebook Account
              </Button>
            </div>
          ) : account.platform_user_id === 'PENDING_SETUP' ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Facebook account connected! Now enter your Facebook Page URL to complete setup.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Your Facebook Page URL
                </label>
                <Input
                  placeholder="https://facebook.com/YourPageName"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of your Facebook Page (e.g., facebook.com/YourBusinessPage)
                </p>
              </div>
              
              <Button 
                onClick={connectPage} 
                disabled={loading || !pageUrl}
                className="w-full"
              >
                {loading ? 'Connecting...' : 'Connect Page'}
              </Button>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">How to find your Page URL:</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Go to your Facebook Page</li>
                  <li>2. Copy the URL from your browser's address bar</li>
                  <li>3. Paste it above</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Facebook Page connected successfully!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Connected Page:</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{account.account_name}</p>
                  <p className="text-sm text-muted-foreground">ID: {account.platform_user_id}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Want to connect a different page?</p>
                <Input
                  placeholder="https://facebook.com/YourPageName"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  disabled={loading}
                />
                <Button 
                  onClick={connectPage} 
                  disabled={loading || !pageUrl}
                  variant="outline"
                >
                  {loading ? 'Updating...' : 'Update Page'}
                </Button>
              </div>
            </div>
          )}
          
          {message && (
            <Alert className={
              message.type === 'success' ? 'border-green-500 bg-green-50' :
              message.type === 'error' ? 'border-red-500 bg-red-50' :
              'border-blue-500 bg-blue-50'
            }>
              <AlertDescription className={
                message.type === 'success' ? 'text-green-800' :
                message.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}