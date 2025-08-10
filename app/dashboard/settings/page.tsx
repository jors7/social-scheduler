'use client'

import { Suspense } from 'react'
import SettingsContent from './settings-content'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import { Card, CardContent } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Settings className="h-8 w-8" />
            </div>
            Settings
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your account and social media connections</p>
        </div>
      </div>
      
      <Suspense fallback={
        <Card variant="elevated">
          <CardContent className="text-center py-16 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-fit mx-auto mb-6">
              <Settings className="h-12 w-12 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading settings...</h3>
            <p className="text-gray-600">Please wait while we load your preferences</p>
          </CardContent>
        </Card>
      }>
        <SubscriptionGate feature="account management">
          <SettingsContent />
        </SubscriptionGate>
      </Suspense>
    </div>
  )
}