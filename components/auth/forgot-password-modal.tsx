'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X } from 'lucide-react'

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
      <DialogContent className="sm:max-w-[390px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] p-0 overflow-hidden border-0 [&>button]:hidden">
        <div className="relative bg-white rounded-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Custom close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          </button>

          <div className="p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Reset Password
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Enter your email address and we&apos;ll send you a link to reset your password
              </p>
            </div>

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {error && (
                  <div className="p-3 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Sending reset link...' : 'Send reset link'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToSignIn}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 text-xs sm:text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl">
                  Password reset link sent! Check your email inbox.
                </div>
                <p className="text-xs sm:text-sm text-gray-600 text-center">
                  If you don&apos;t see the email, check your spam folder.
                </p>
                <button
                  onClick={handleBackToSignIn}
                  className="w-full h-9 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}