'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info } from 'lucide-react'

type LinkedInVisibility = 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN'

interface LinkedInVisibilitySelectorProps {
  visibility: LinkedInVisibility
  setVisibility: (visibility: LinkedInVisibility) => void
}

const VISIBILITY_OPTIONS = {
  PUBLIC: {
    label: 'Public',
    description: 'Anyone on or off LinkedIn'
  },
  CONNECTIONS: {
    label: 'Connections only',
    description: 'Only your LinkedIn connections'
  },
  LOGGED_IN: {
    label: 'All LinkedIn Members',
    description: 'Anyone logged into LinkedIn'
  }
} as const

/**
 * LinkedIn Visibility Selector Component
 *
 * Allows users to control who can see their LinkedIn posts:
 * - PUBLIC: Anyone on or off LinkedIn (most visibility)
 * - CONNECTIONS: Only your 1st-degree connections
 * - LOGGED_IN: Any LinkedIn member (must be logged in)
 *
 * API Reference: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
 */
export function LinkedInVisibilitySelector({
  visibility,
  setVisibility
}: LinkedInVisibilitySelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-[#0A66C2]">in</span>
          LinkedIn Settings
        </CardTitle>
        <CardDescription>
          Control who can see your LinkedIn post
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visibility Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="linkedin-visibility">Who can see this post</Label>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Choose who can view your LinkedIn post. Public posts get more visibility but are visible to everyone.
              </div>
            </div>
          </div>
          <Select
            value={visibility}
            onValueChange={(value) => setVisibility(value as LinkedInVisibility)}
          >
            <SelectTrigger id="linkedin-visibility">
              <SelectValue placeholder="Select visibility..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VISIBILITY_OPTIONS).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div>
                    <div className="font-medium">{info.label}</div>
                    <div className="text-xs text-gray-600">{info.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            LinkedIn Visibility Tips:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Public</strong> posts can appear in search engines and reach non-LinkedIn users</li>
            <li>• <strong>Connections only</strong> is best for personal updates and networking</li>
            <li>• <strong>All LinkedIn Members</strong> balances reach with privacy</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
