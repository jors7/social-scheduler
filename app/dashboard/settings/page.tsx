'use client'

import dynamic from 'next/dynamic'
import { Settings } from 'lucide-react'

// Dynamically import the entire settings content with no SSR
const DynamicSettings = dynamic(
  () => import('./settings-wrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              Settings
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-lg">Manage your account and social media connections</p>
          </div>
        </div>
        
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-purple-50 to-blue-50 animate-pulse" />
          <div className="p-6">
            <div className="space-y-4">
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }
)

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
              <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            Settings
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-lg">Manage your account and social media connections</p>
        </div>
      </div>
      
      <DynamicSettings />
    </div>
  )
}