'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import SettingsContent from './settings-content'

// Wrap the component that uses useSearchParams in its own component
function SettingsWithParams() {
  const searchParams = useSearchParams()
  const [urlProcessed, setUrlProcessed] = useState(false)

  useEffect(() => {
    if (urlProcessed) return

    // Handle OAuth callback parameters
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success || error) {
      setUrlProcessed(true)
      
      // Process the parameters
      if (success === 'twitter_connected') {
        toast.success('Twitter account connected successfully!')
      } else if (success === 'bluesky_connected') {
        toast.success('Bluesky account connected successfully!')
      } else if (success === 'threads_connected') {
        toast.success('Threads account connected successfully!')
      } else if (success === 'instagram_connected') {
        toast.success('Instagram account connected successfully!')
      } else if (success === 'facebook_connected') {
        toast.success('Facebook page connected successfully!')
      } else if (success === 'pinterest_connected') {
        toast.success('Pinterest account connected successfully!')
      } else if (error) {
        const errorMessages: Record<string, string> = {
          twitter_auth_failed: 'Twitter authentication failed. Please try again.',
          twitter_session_expired: 'Authentication session expired. Please try again.',
          unauthorized: 'You must be logged in to connect social accounts.',
          database_error: 'Failed to save account information. Please try again.',
          twitter_callback_failed: 'Failed to complete Twitter authentication.',
          threads_auth_failed: 'Threads authentication failed. Please try again.',
          threads_callback_failed: 'Failed to complete Threads authentication.',
          threads_no_pages: 'No Facebook pages found. Please create a Facebook page and connect an Instagram Business account.',
          threads_no_profile: 'No Instagram Business account with Threads profile found. Please ensure your Instagram account is connected to Threads.',
          threads_no_instagram_business: 'No Instagram Business/Creator account found. Please convert your Instagram account to Business or Creator type in Instagram settings.',
          instagram_auth_failed: 'Instagram authentication failed. Please try again.',
          instagram_callback_failed: 'Failed to complete Instagram authentication.',
          instagram_no_pages: 'No Facebook pages found. Please create a Facebook page first.',
          instagram_not_connected: 'No Instagram account connected to your Facebook page.',
          instagram_not_business: 'Please convert your Instagram account to a Business account.',
          facebook_auth_failed: 'Facebook authentication failed. Please try again.',
          facebook_callback_failed: 'Failed to complete Facebook authentication.',
        }
        toast.error(errorMessages[error] || 'An error occurred. Please try again.')
      }

      // Clean the URL without causing a reload
      setTimeout(() => {
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }, 100)
    }
  }, [searchParams, urlProcessed])

  return <SettingsContent />
}

// Loading fallback component
function LoadingSettings() {
  return (
    <div>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="flex p-2 gap-2">
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse flex-1 max-w-xs" />
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse flex-1 max-w-xs" />
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-purple-50 to-blue-50 animate-pulse" />
          <div className="p-6">
            <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsWrapper() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <LoadingSettings />
  }

  // Wrap in Suspense to handle useSearchParams
  return (
    <Suspense fallback={<LoadingSettings />}>
      <SettingsWithParams />
    </Suspense>
  )
}