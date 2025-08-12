'use client'

import { useParams } from 'next/navigation'
import UserDetailsClient from './client-page'

export default function UserDetailsPage() {
  const params = useParams()
  const userId = params.id as string
  
  if (!userId) {
    return <div>Invalid user ID</div>
  }
  
  return <UserDetailsClient userId={userId} />
}