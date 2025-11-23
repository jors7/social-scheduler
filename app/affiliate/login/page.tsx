'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AffiliateLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Show message if redirected from signup
    const message = searchParams.get('message');
    if (message) {
      toast.success(message);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Check user type from metadata
        const userType = data.user.user_metadata?.user_type;

        if (userType === 'affiliate' || userType === 'both') {
          // Redirect to affiliate dashboard
          router.push('/affiliate/dashboard');
        } else if (userType === 'member') {
          // Member trying to log in to affiliate portal
          toast.error('This is the affiliate login. Please use the main login for members.');
          await supabase.auth.signOut();
        } else {
          // No user type set, default to member dashboard
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Affiliate Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Access your affiliate dashboard
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-gray-300/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-purple-400 hover:text-purple-300"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">New to our affiliate program?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/affiliate/signup"
                className="w-full flex justify-center py-3 px-4 border border-purple-500/50 rounded-lg shadow-sm text-sm font-medium text-white bg-transparent hover:bg-purple-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
              >
                Apply to become an affiliate
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>

        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 mt-4">
          <h3 className="text-white font-semibold mb-2 text-sm">Application Status</h3>
          <p className="text-gray-300 text-xs">
            If you&apos;ve submitted an application, you&apos;ll receive an email within 24-48 hours once it&apos;s approved.
            You can then use your credentials to log in here.
          </p>
        </div>
      </div>
    </div>
  );
}
