'use client'

import { useState, useEffect } from 'react'

export default function HomePageWrapper({ children }: { children: React.ReactNode }) {
  const [isCheckingOAuth, setIsCheckingOAuth] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const oauthAttemptTime = localStorage.getItem('oauth_attempt_time')

    // Check if we have OAuth tokens in URL or a recent OAuth attempt
    const hasOAuthTokens = hash && (hash.includes('access_token') || hash.includes('error'))
    const hasRecentOAuthAttempt = oauthAttemptTime && (Date.now() - parseInt(oauthAttemptTime) < 5000)

    if (hasOAuthTokens || hasRecentOAuthAttempt) {
      // Keep loading state - OAuthRedirectHandler will handle the redirect
      setIsCheckingOAuth(true)
      setShowContent(false)
    } else {
      // No OAuth in progress, show content
      setIsCheckingOAuth(false)
      setShowContent(true)
    }
  }, [])

  // If OAuth is in progress, show a loading overlay
  if (isCheckingOAuth && !showContent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Completing sign in...</h2>
          <p className="text-sm text-gray-600 mt-2">Redirecting to your dashboard</p>
        </div>
      </div>
    )
  }

  // Show content
  return <>{children}</>
}