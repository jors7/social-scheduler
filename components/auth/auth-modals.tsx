'use client'

import { useState } from 'react'
import { SignInModal } from './sign-in-modal'
import { SignUpModal } from './sign-up-modal'
import { ForgotPasswordModal } from './forgot-password-modal'

interface AuthModalsProps {
  signInOpen: boolean
  signUpOpen: boolean
  onSignInOpenChange: (open: boolean) => void
  onSignUpOpenChange: (open: boolean) => void
  signUpPlanId?: string | null
}

export function AuthModals({
  signInOpen,
  signUpOpen,
  onSignInOpenChange,
  onSignUpOpenChange,
  signUpPlanId
}: AuthModalsProps) {
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  const handleSwitchToSignUp = () => {
    onSignInOpenChange(false)
    setForgotPasswordOpen(false)
    setTimeout(() => {
      onSignUpOpenChange(true)
    }, 100)
  }

  const handleSwitchToSignIn = () => {
    onSignUpOpenChange(false)
    setForgotPasswordOpen(false)
    setTimeout(() => {
      onSignInOpenChange(true)
    }, 100)
  }

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
        onSwitchToSignUp={handleSwitchToSignUp}
        onSwitchToForgotPassword={handleSwitchToForgotPassword}
      />
      <SignUpModal
        open={signUpOpen}
        onOpenChange={onSignUpOpenChange}
        onSwitchToSignIn={handleSwitchToSignIn}
        planId={signUpPlanId}
      />
      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        onBackToSignIn={handleBackToSignIn}
      />
    </>
  )
}