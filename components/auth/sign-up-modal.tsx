'use client'

import { useState, useEffect } from 'react'
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

interface SignUpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToSignIn: () => void
  planId?: string | null
}

export function SignUpModal({ open, onOpenChange, onSwitchToSignIn, planId }: SignUpModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (planId) {
      localStorage.setItem('intendedPlan', planId)
    }
  }, [planId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        setError(error.message)
      } else if (data.user) {
        const isDevEnvironment = process.env.NODE_ENV === 'development'
        
        if (isDevEnvironment) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          })
          
          if (!signInError) {
            if (planId) {
              await supabase.auth.updateUser({
                data: { intended_plan: planId }
              })
            }
            
            setMessage('Account created successfully! Redirecting to dashboard...')
            setTimeout(() => {
              onOpenChange(false)
              router.push('/dashboard')
            }, 1500)
          } else {
            setMessage('Account created successfully! Please check your email to confirm your account before logging in.')
          }
        } else {
          if (data.user.email_confirmed_at) {
            setMessage('Account created successfully! Redirecting to dashboard...')
            setTimeout(() => {
              onOpenChange(false)
              router.push('/dashboard')
            }, 2000)
          } else {
            setMessage('Account created successfully! Please check your email to confirm your account before logging in.')
          }
        }
      } else {
        setMessage('Account created! Please check your email to confirm your account.')
      }
    } catch (err) {
      setError('An unexpected error occurred: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSwitchToSignIn = () => {
    onOpenChange(false)
    setTimeout(() => {
      onSwitchToSignIn()
    }, 100)
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Use the current domain for redirects
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[390px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] p-0 overflow-hidden border-0 [&>button]:hidden">
        <div className="relative bg-white rounded-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
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
                Get Started Free
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Create your account to start scheduling
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg">
                {message}
              </div>
            )}

            {/* Social signup buttons */}
            <div className="space-y-2.5 mb-4 sm:mb-6">
              <button
                type="button"
                onClick={handleGoogleSignUp}
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

            {/* Divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 sm:px-4 text-gray-500">Or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Email field */}
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Password field */}
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Confirm Password field */}
              <div className="space-y-1 sm:space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Terms and conditions */}
              <p className="text-xs text-gray-500 text-center">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="text-purple-600 hover:text-purple-700">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-purple-600 hover:text-purple-700">
                  Privacy Policy
                </a>
              </p>

              {/* Sign up button */}
              <Button
                type="submit"
                className="w-full h-9 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Free Account'}
              </Button>
            </form>

            {/* Sign in link */}
            <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={handleSwitchToSignIn}
                className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}