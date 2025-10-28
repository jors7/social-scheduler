'use client'

import { useState } from 'react'
import { SignInModal } from './sign-in-modal'
import { ForgotPasswordModal } from './forgot-password-modal'

interface AuthModalsProps {
  signInOpen: boolean
  onSignInOpenChange: (open: boolean) => void
}

export function AuthModals({
  signInOpen,
  onSignInOpenChange
}: AuthModalsProps) {
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  const handleSwitchToForgotPassword = () => {
    onSignInOpenChange(false)
    setTimeout(() => {
      setForgotPasswordOpen(true)
    }, 100)
  }

  const handleBackToSignIn = () => {
    setForgotPasswordOpen(false)
    setTimeout(() => {
      onSignInOpenChange(true)
    }, 100)
  }

  return (
    <>
      <SignInModal
        open={signInOpen}
        onOpenChange={onSignInOpenChange}
        onSwitchToForgotPassword={handleSwitchToForgotPassword}
      />
      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        onBackToSignIn={handleBackToSignIn}
      />
    </>
  )
}