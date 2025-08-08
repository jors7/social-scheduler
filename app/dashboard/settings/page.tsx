'use client'

import { Suspense } from 'react'
import SettingsContent from './settings-content'
import { SubscriptionGate } from '@/components/subscription/subscription-gate'

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <SubscriptionGate feature="account management">
          <SettingsContent />
        </SubscriptionGate>
      </Suspense>
    </div>
  )
}