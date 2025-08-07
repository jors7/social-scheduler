'use client'

import { useState } from 'react'
import { SignInModal } from './sign-in-modal'
import { SignUpModal } from './sign-up-modal'

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
  const handleSwitchToSignUp = () => {
    onSignInOpenChange(false)
    setTimeout(() => {
      onSignUpOpenChange(true)
    }, 100)
  }

  const handleSwitchToSignIn = () => {
    onSignUpOpenChange(false)
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
      />
      <SignUpModal
        open={signUpOpen}
        onOpenChange={onSignUpOpenChange}
        onSwitchToSignIn={handleSwitchToSignIn}
        planId={signUpPlanId}
      />
    </>
  )
}