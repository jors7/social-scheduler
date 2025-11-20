'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function TwitterCallbackContent() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) {
      toast.error('Please enter the PIN code')
      return
    }

    setLoading(true)
    try {
      console.log('Submitting PIN:', pin.trim())
      const response = await fetch('/api/auth/twitter/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      })

      const data = await response.json()
      console.log('PIN response:', data)

      if (response.ok) {
        toast.success('Twitter account connected successfully!')
        router.push('/dashboard/settings?success=twitter_connected')
      } else {
        toast.error(data.error || 'Failed to verify PIN')
      }
    } catch (error) {
      console.error('PIN submission error:', error)
      toast.error('Failed to connect Twitter account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Twitter Account</CardTitle>
          <CardDescription>
            Enter the PIN code from Twitter to complete the connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pin">Twitter PIN Code</Label>
              <Input
                id="pin"
                type="text"
                placeholder="Enter 7-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={7}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Account'}
            </Button>
          </form>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Instructions:</strong></p>
            <p>1. Authorize the app on Twitter</p>
            <p>2. Copy the 7-digit PIN code shown</p>
            <p>3. Enter it above and click Connect</p>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/settings')}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}