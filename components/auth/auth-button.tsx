'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.refresh()
    setLoading(false)
  }

  return (
    <Button 
      onClick={handleSignOut} 
      variant="outline" 
      disabled={loading}
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}