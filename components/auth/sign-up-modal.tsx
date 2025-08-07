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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SignUpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToSignIn: () => void
  planId?: string | null
}

export function SignUpModal({ open, onOpenChange, onSwitchToSignIn, planId }: SignUpModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
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
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          }
        }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Create Account</DialogTitle>
          <DialogDescription className="text-center">
            Start scheduling content today
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <div className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleSwitchToSignIn}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}