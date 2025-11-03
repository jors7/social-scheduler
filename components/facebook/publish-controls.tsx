'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Info, ThumbsUp } from 'lucide-react'

interface FacebookPublishControlsProps {
  publishAsDraft: boolean
  setPublishAsDraft: (publishAsDraft: boolean) => void
}

/**
 * Facebook Publish Controls Component
 *
 * Allows users to control when their Facebook posts are published:
 * - Publish immediately (default)
 * - Save as draft (for later review and publishing)
 *
 * API Reference: https://developers.facebook.com/docs/graph-api/reference/page/feed
 */
export function FacebookPublishControls({
  publishAsDraft,
  setPublishAsDraft
}: FacebookPublishControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThumbsUp className="h-5 w-5 text-[#1877F2]" />
          Facebook Settings
        </CardTitle>
        <CardDescription>
          Control how your post is published
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Draft Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="facebook-draft-mode">Save as draft</Label>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Enable this to save your post as a draft instead of publishing immediately. You can review and publish it later from your Facebook Page.
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {publishAsDraft
                ? 'Post will be saved as draft for later review'
                : 'Post will be published immediately'}
            </p>
          </div>
          <Switch
            id="facebook-draft-mode"
            checked={publishAsDraft}
            onCheckedChange={setPublishAsDraft}
          />
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Draft Mode Tips:</p>
              <ul className="space-y-0.5">
                <li>• <strong>Immediate publishing</strong> makes your content live right away</li>
                <li>• <strong>Draft mode</strong> lets you review before going live</li>
                <li>• Drafts can be edited and published from your Facebook Page</li>
                <li>• Use drafts for collaborative review workflows</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
