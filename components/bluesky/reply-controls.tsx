'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info, MessageCircle } from 'lucide-react'

type BlueskyReplyControl = 'everyone' | 'nobody' | 'following' | 'mentioned'

interface BlueskyReplyControlsProps {
  replyControl: BlueskyReplyControl
  setReplyControl: (control: BlueskyReplyControl) => void
}

const REPLY_CONTROL_OPTIONS = {
  everyone: {
    label: 'Everyone',
    description: 'Anyone can reply to this post'
  },
  nobody: {
    label: 'Nobody',
    description: 'Replies are disabled for this post'
  },
  following: {
    label: 'People you follow',
    description: 'Only accounts you follow can reply'
  },
  mentioned: {
    label: 'Mentioned accounts only',
    description: 'Only accounts mentioned in the post can reply'
  }
} as const

/**
 * Bluesky Reply Controls Component
 *
 * Allows users to control who can reply to their Bluesky posts using threadgates:
 * - everyone: Anyone on Bluesky can reply (default, no threadgate)
 * - nobody: Replies are completely disabled
 * - following: Only accounts you follow can reply
 * - mentioned: Only accounts mentioned in the post can reply
 *
 * API Reference: https://docs.bsky.app/docs/advanced-guides/threadgates
 */
export function BlueskyReplyControls({
  replyControl,
  setReplyControl
}: BlueskyReplyControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-500" />
          Bluesky Settings
        </CardTitle>
        <CardDescription>
          Control who can reply to your post
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reply Control Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="bluesky-reply-control">Who can reply</Label>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Control who can reply to your post using Bluesky's threadgate feature. This helps manage conversations and reduce unwanted interactions.
              </div>
            </div>
          </div>
          <Select
            value={replyControl}
            onValueChange={(value) => setReplyControl(value as BlueskyReplyControl)}
          >
            <SelectTrigger id="bluesky-reply-control">
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
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Reply Control Tips:</p>
              <ul className="space-y-0.5">
                <li>• <strong>Everyone</strong> maximizes engagement and discussion</li>
                <li>• <strong>Nobody</strong> is great for announcements</li>
                <li>• <strong>People you follow</strong> limits to trusted accounts</li>
                <li>• <strong>Mentioned only</strong> keeps conversations focused</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
