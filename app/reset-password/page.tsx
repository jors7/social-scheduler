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
        setMessage('Password updated successfully! Redirecting to sign in...')
        setTimeout(() => {
          router.push('/?signin=true')
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Set your password</CardTitle>
          <CardDescription className="text-center">
            {sessionValid ? 'Create a password to secure your account' : 'Unable to set password'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
                {!sessionValid && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push('/?signin=true')}
                    >
                      Go to Sign In
                    </Button>
                  </div>
                )}
              </div>
            )}
            {message && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {message}
              </div>
            )}
            {sessionValid && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!sessionValid}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!sessionValid}
                  />
                </div>
              </>
            )}
          </CardContent>
          {sessionValid && (
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading || passwordUpdated || !sessionValid}>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}