'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info } from 'lucide-react'

type ThreadsReplyControl = 'everyone' | 'accounts_you_follow' | 'mentioned_only'

interface ThreadsReplyControlsProps {
  replyControl: ThreadsReplyControl
  setReplyControl: (control: ThreadsReplyControl) => void
}

const REPLY_CONTROL_OPTIONS = {
  everyone: {
    label: 'Everyone',
    description: 'Anyone can reply to this thread'
  },
  accounts_you_follow: {
    label: 'Accounts you follow',
    description: 'Only accounts you follow can reply'
  },
  mentioned_only: {
    label: 'Mentioned accounts only',
    description: 'Only mentioned accounts can reply'
  }
} as const

/**
 * Threads Reply Controls Component
 *
 * Allows users to control who can reply to their Threads posts:
 * - everyone: Anyone on Threads can reply (default)
 * - accounts_you_follow: Only accounts you follow can reply
 * - mentioned_only: Only accounts mentioned in the post can reply
 *
 * API Reference: https://developers.facebook.com/docs/threads/posts
 */
export function ThreadsReplyControls({
  replyControl,
  setReplyControl
}: ThreadsReplyControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="font-bold">@</span>
          Threads Settings
        </CardTitle>
        <CardDescription>
          Control who can reply to your thread
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reply Control Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="threads-reply-control">Who can reply</Label>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Control who can reply to your thread. This helps manage conversations and reduce unwanted interactions.
              </div>
            </div>
          </div>
          <Select
            value={replyControl}
            onValueChange={(value) => setReplyControl(value as ThreadsReplyControl)}
          >
            <SelectTrigger id="threads-reply-control">
              <SelectValue placeholder="Select who can reply..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPLY_CONTROL_OPTIONS).map(([key, info]) => (
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
            Reply Control Tips:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Everyone</strong> maximizes engagement but allows all replies</li>
            <li>• <strong>Accounts you follow</strong> limits to trusted accounts</li>
            <li>• <strong>Mentioned only</strong> keeps conversations private and focused</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
