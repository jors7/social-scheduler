'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sessionValid, setSessionValid] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check if user has a valid session (after code exchange from email link)
    const checkSession = async () => {
      try {
        // Check if we have hash params from Supabase (e.g., #access_token=...)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        // If we have tokens in the URL hash, set the session explicitly
        if (accessToken && refreshToken) {
          console.log('Setting session from URL tokens')
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error('Failed to set session:', sessionError)
            setError('Invalid or expired reset link. Please request a new password reset.')
            setSessionValid(false)
            setCheckingSession(false)
            return
          }

          // Clean up URL hash
          window.history.replaceState({}, '', '/reset-password?from=email')
          setMessage('Link verified! Create your password below.')
          setSessionValid(true)
          setCheckingSession(false)
          return
        }

        // Otherwise check existing session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          setError('Invalid or expired reset link. Please request a new password reset.')
          setSessionValid(false)
        } else {
          setSessionValid(true)
          // Show success message if redirected from auth callback
          const fromEmail = searchParams.get('from')
          if (fromEmail === 'email') {
            setMessage('Link verified! Create your password below.')
            // Clean up URL
            window.history.replaceState({}, '', '/reset-password')
          }
        }
      } catch (err) {
        console.error('Error in checkSession:', err)
        setError('Failed to verify reset link. Please try again.')
        setSessionValid(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [searchParams, supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
      } else {
        setPasswordUpdated(true)
        setMessage('Password updated successfully! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 px-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl relative">
        {loading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-sm font-medium text-gray-900">Updating password...</p>
              <p className="text-xs text-gray-600 mt-1">Please wait</p>
            </div>
          </div>
        )}
        <CardHeader className="space-y-1 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Set your password
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            {sessionValid ? 'Create a password to secure your account' : 'Unable to set password'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            {error && (
              <div className="p-3 sm:p-4 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                {error}
                {!sessionValid && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl hover:shadow-md transition-all duration-200"
                      onClick={() => router.push('/?signin=true')}
                    >
                      Go to Sign In
                    </Button>
                  </div>
                )}
              </div>
            )}
            {message && (
              <div className="p-3 sm:p-4 text-xs sm:text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl">
                {message}
              </div>
            )}
            {sessionValid && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!sessionValid}
                    className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-gray-700">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!sessionValid}
                    className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </>
            )}
          </CardContent>
          {sessionValid && (
            <CardFooter className="px-4 sm:px-6 pb-6 sm:pb-8">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg transform hover:scale-[1.02] transition-all duration-200 rounded-xl h-10 sm:h-11 font-medium"
                disabled={loading || passwordUpdated || !sessionValid}
              >
                {loading ? 'Setting password...' : 'Set password'}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}