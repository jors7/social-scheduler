'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { X } from 'lucide-react'

interface SignInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToSignUp: () => void
  onSwitchToForgotPassword?: () => void
}

export function SignInModal({ open, onOpenChange, onSwitchToSignUp, onSwitchToForgotPassword }: SignInModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [sendingMagicLink, setSendingMagicLink] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        // Show loading state instead of closing modal
        setIsRedirecting(true)
        // Small delay for visual feedback
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 100)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchToSignUp = () => {
    onOpenChange(false)
    setTimeout(() => {
      onSwitchToSignUp()
    }, 100)
  }

  const handleSendMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setSendingMagicLink(true)
    setError('')
    setMagicLinkSent(false)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/magic-link`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setMagicLinkSent(true)
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.')
    } finally {
      setSendingMagicLink(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      // Store OAuth attempt time to track redirect
      localStorage.setItem('oauth_attempt_time', Date.now().toString())

      // OAuth will return to homepage, which will handle the redirect
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}`
        : `${process.env.NEXT_PUBLIC_APP_URL}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        }
      })

      if (error) {
        localStorage.removeItem('oauth_attempt_time')
        setError(error.message)
      }
      // The redirect will happen automatically
    } catch (err) {
      localStorage.removeItem('oauth_attempt_time')
      setError('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }



  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent closing while redirecting
      if (!isRedirecting) {
        onOpenChange(newOpen)
      }
    }}>
      <DialogContent className="sm:max-w-[390px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] p-0 overflow-hidden border-0 [&>button]:hidden">
        <div className="relative bg-white rounded-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Loading overlay when redirecting */}
          {isRedirecting && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
                <p className="text-sm font-medium text-gray-900">Signing you in...</p>
                <p className="text-xs text-gray-600 mt-1">Redirecting to dashboard</p>
              </div>
            </div>
          )}
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          </button>

          <div className="p-4 sm:p-6 pt-6 sm:pt-8">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Enter your details to access your account
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Success message for magic link */}
            {magicLinkSent && (
              <div className="mb-4 p-3 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium mb-1">Magic link sent!</p>
                <p>Check your email and click the link to sign in. The link will expire in 60 minutes.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Email field */}
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Password field */}
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-gray-700">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
                    onClick={() => {
                      if (onSwitchToForgotPassword) {
                        onOpenChange(false)
                        setTimeout(() => {
                          onSwitchToForgotPassword()
                        }, 100)
                      }
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Sign in button */}
              <Button
                type="submit"
                className="w-full h-9 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Or divider for magic link */}
            <div className="relative my-3 sm:my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 sm:px-4 text-gray-500">Or sign in with</span>
              </div>
            </div>

            {/* Magic Link button */}
            <Button
              type="button"
              onClick={handleSendMagicLink}
              variant="outline"
              className="w-full h-9 sm:h-10 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 text-xs sm:text-sm font-semibold rounded-xl transition-all"
              disabled={sendingMagicLink || !email}
            >
              {sendingMagicLink ? 'Sending...' : 'Email me a magic link'}
            </Button>

            {/* Divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 sm:px-4 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social login buttons */}
            <div className="space-y-2 sm:space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-9 sm:h-10 px-3 sm:px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 sm:gap-3 font-medium text-xs sm:text-sm text-gray-700"
                disabled={loading}
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

            </div>

            {/* Sign up link */}
            <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm">
              <span className="text-gray-600">Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={handleSwitchToSignUp}
                className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Sign up for free
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}