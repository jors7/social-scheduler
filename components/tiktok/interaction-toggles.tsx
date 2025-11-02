'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Info } from 'lucide-react'

interface InteractionTogglesProps {
  /** Whether comments are allowed (default: false) */
  allowComment: boolean
  /** Whether duet is allowed (default: false) */
  allowDuet: boolean
  /** Whether stitch is allowed (default: false) */
  allowStitch: boolean
  /** Whether comments are disabled by creator settings */
  commentDisabled: boolean
  /** Whether duet is disabled by creator settings */
  duetDisabled: boolean
  /** Whether stitch is disabled by creator settings */
  stitchDisabled: boolean
  /** Whether this is a photo post (photos only support comments) */
  isPhotoPost: boolean
  /** Callback when any setting changes */
  onChange: (setting: 'comment' | 'duet' | 'stitch', value: boolean) => void
}

/**
 * Interaction Toggles Component
 *
 * Displays toggles for Comment, Duet, and Stitch interactions.
 * All toggles are OFF by default and users must manually enable them.
 *
 * IMPORTANT: This component is required by TikTok's UX Guidelines.
 * - NO defaults - users must manually enable each interaction
 * - Grey out and disable interactions that are disabled by creator settings
 * - For photo posts, only show "Allow Comment" option
 *
 * Reference: https://developers.tiktok.com/doc/content-sharing-guidelines/
 */
export function InteractionToggles({
  allowComment,
  allowDuet,
  allowStitch,
  commentDisabled,
  duetDisabled,
  stitchDisabled,
  isPhotoPost,
  onChange
}: InteractionTogglesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Interaction Settings</h4>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
            Control who can interact with your content. All options are off by default - enable the ones you want.
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Allow Comment Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1 flex-1">
            <Label
              htmlFor="allow-comment"
              className={`text-sm font-medium cursor-pointer ${commentDisabled ? 'text-gray-400' : ''}`}
            >
              Allow comments
            </Label>
            <p className={`text-xs ${commentDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
              {commentDisabled
                ? 'Comments are disabled in your TikTok settings'
                : 'Let people comment on your post'
              }
            </p>
          </div>
          <Switch
            id="allow-comment"
            checked={allowComment}
            onCheckedChange={(checked) => onChange('comment', checked)}
            disabled={commentDisabled}
          />
        </div>

        {/* Allow Duet Toggle - Only for video posts */}
        {!isPhotoPost && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label
                htmlFor="allow-duet"
                className={`text-sm font-medium cursor-pointer ${duetDisabled ? 'text-gray-400' : ''}`}
              >
                Allow duet
              </Label>
              <p className={`text-xs ${duetDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {duetDisabled
                  ? 'Duet is disabled in your TikTok settings'
                  : 'Let people create duets with your video'
                }
              </p>
            </div>
            <Switch
              id="allow-duet"
              checked={allowDuet}
              onCheckedChange={(checked) => onChange('duet', checked)}
              disabled={duetDisabled}
            />
          </div>
        )}

        {/* Allow Stitch Toggle - Only for video posts */}
        {!isPhotoPost && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label
                htmlFor="allow-stitch"
                className={`text-sm font-medium cursor-pointer ${stitchDisabled ? 'text-gray-400' : ''}`}
              >
                Allow stitch
              </Label>
              <p className={`text-xs ${stitchDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {stitchDisabled
                  ? 'Stitch is disabled in your TikTok settings'
                  : 'Let people stitch clips from your video'
                }
              </p>
            </div>
            <Switch
              id="allow-stitch"
              checked={allowStitch}
              onCheckedChange={(checked) => onChange('stitch', checked)}
              disabled={stitchDisabled}
            />
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> All interaction options are off by default. Enable the ones you want for your post.
        </p>
      </div>
    </div>
  )
}
