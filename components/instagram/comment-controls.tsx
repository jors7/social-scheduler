'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Info } from 'lucide-react'

interface InstagramCommentControlsProps {
  disableComments: boolean
  setDisableComments: (value: boolean) => void
}

/**
 * Instagram Comment Controls Component
 *
 * Allows users to control whether comments are enabled on their Instagram posts.
 *
 * Note: Comment settings are applied AFTER the post is published via a follow-up API call,
 * as Instagram's Graph API doesn't support disabling comments during post creation.
 *
 * API Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-media
 */
export function InstagramCommentControls({
  disableComments,
  setDisableComments
}: InstagramCommentControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-pink-600">📸</span>
          Instagram Comment Settings
        </CardTitle>
        <CardDescription>
          Control who can comment on your post
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Disable Comments Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="instagram-disable-comments">Disable comments</Label>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  <p className="font-medium mb-1">Comment Control</p>
                  <p>When enabled, no one will be able to comment on your Instagram post. This setting is applied after your post is published.</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Turn off comments for this post
            </p>
          </div>
          <Switch
            id="instagram-disable-comments"
            checked={disableComments}
            onCheckedChange={setDisableComments}
          />
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Note:</p>
              <p>Comment settings will be applied automatically after your post is published. You can change this setting later from Instagram&apos;s app.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
