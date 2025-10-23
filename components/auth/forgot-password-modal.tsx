'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBackToSignIn: () => void
}

export function ForgotPasswordModal({ open, onOpenChange, onBackToSignIn }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        // Check for rate limit error
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          setError('Please wait a moment before requesting another reset email.')
        } else {
          setError(error.message)
        }
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToSignIn = () => {
    onOpenChange(false)
    setEmail('')
    setError('')
    setSuccess(false)
    setTimeout(() => {
      onBackToSignIn()
    }, 100)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Reset Password</DialogTitle>
          <DialogDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset your password
          </DialogDescription>
        </DialogHeader>
        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending reset link...' : 'Send reset link'}
              </Button>
              <button
                type="button"
                onClick={handleBackToSignIn}
                className="text-sm text-center text-primary hover:underline"
              >
                Back to sign in
              </button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              Password reset link sent! Check your email inbox.
            </div>
            <p className="text-sm text-muted-foreground">
              If you don&apos;t see the email, check your spam folder.
            </p>
            <Button onClick={handleBackToSignIn} className="w-full">
              Back to sign in
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}