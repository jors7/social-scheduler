'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ThreadsLogout() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear all Meta-related cookies on load
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }, []);

  const handleStep1 = () => {
    // Open Meta logout URLs in new windows
    window.open('https://www.facebook.com/logout.php', 'fb-logout', 'width=500,height=600');
    window.open('https://www.instagram.com/accounts/logout/', 'ig-logout', 'width=500,height=600');
    window.open('https://www.threads.net/logout', 'threads-logout', 'width=500,height=600');
    
    setTimeout(() => {
      setStep(2);
    }, 3000);
  };

  const handleStep2 = async () => {
    setLoading(true);
    
    // Clear database records
    try {
      await fetch('/api/auth/threads/disconnect', { method: 'POST' });
    } catch (error) {
      console.error('Error clearing database:', error);
    }
    
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 2000);
  };

  const handleStep3 = async () => {
    // Redirect to clean auth
    window.location.href = '/api/auth/threads-clean';
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Fix Threads Connection</CardTitle>
          <CardDescription>
            Follow these steps to properly connect your Threads account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Logout */}
          <div className={`p-4 rounded-lg border ${step === 1 ? 'border-blue-500 bg-blue-50' : step > 1 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              {step > 1 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <div className={`h-5 w-5 rounded-full border-2 mt-0.5 ${step === 1 ? 'border-blue-500' : 'border-gray-300'}`} />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">Step 1: Logout from Meta Services</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This will open logout pages for Facebook, Instagram, and Threads to clear all sessions.
                </p>
                {step === 1 && (
                  <Button 
                    onClick={handleStep1}
                    className="mt-3"
                    disabled={loading}
                  >
                    Open Logout Pages
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Clear Local Data */}
          <div className={`p-4 rounded-lg border ${step === 2 ? 'border-blue-500 bg-blue-50' : step > 2 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              {step > 2 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <div className={`h-5 w-5 rounded-full border-2 mt-0.5 ${step === 2 ? 'border-blue-500' : 'border-gray-300'}`} />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">Step 2: Clear Local Account Data</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This will remove any cached account data from our database.
                </p>
                {step === 2 && (
                  <Button 
                    onClick={handleStep2}
                    className="mt-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      'Clear Data'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Connect Fresh */}
          <div className={`p-4 rounded-lg border ${step === 3 ? 'border-blue-500 bg-blue-50' : step > 3 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              {step > 3 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <div className={`h-5 w-5 rounded-full border-2 mt-0.5 ${step === 3 ? 'border-blue-500' : 'border-gray-300'}`} />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">Step 3: Connect Your Threads Account</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Now you can connect with the correct Threads account (@thejanorsula).
                </p>
                {step === 3 && (
                  <Button 
                    onClick={handleStep3}
                    className="mt-3"
                    variant="default"
                  >
                    Connect Threads Account
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-800">Important:</p>
                <ul className="mt-1 space-y-1 text-yellow-700">
                  <li>• Make sure you&apos;re logged into the correct Instagram/Threads account in your browser</li>
                  <li>• The account username should be @thejanorsula</li>
                  <li>• If it connects the wrong account, start this process again</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}