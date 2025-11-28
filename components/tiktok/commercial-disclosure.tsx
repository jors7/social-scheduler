'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Info, AlertCircle } from 'lucide-react'

interface CommercialDisclosureProps {
  /** Whether content disclosure is enabled */
  enabled: boolean
  /** Callback when enabled state changes */
  onEnabledChange: (enabled: boolean) => void
  /** Whether promotional content (Your Brand) is selected */
  promotionalContent: boolean
  /** Callback when promotional content changes */
  onPromotionalChange: (checked: boolean) => void
  /** Whether branded content (Paid Partnership) is selected */
  brandedContent: boolean
  /** Callback when branded content changes */
  onBrandedChange: (checked: boolean) => void
  /** Current privacy level (to show warning if branded content + private) */
  privacyLevel?: string
  /** Whether this is a photo post (for label text) */
  isPhotoPost?: boolean
}

/**
 * Commercial Content Disclosure Component
 *
 * Required by TikTok's UX Guidelines for Content Sharing (Point 3).
 *
 * Exact requirements from TikTok:
 * - Toggle labeled "Disclose video content" (OFF by default)
 * - When enabled, show "Your brand" and "Branded content" checkboxes
 * - At least one must be selected when toggle is ON
 * - Labels shown:
 *   - Your brand only: "Your photo/video will be labeled 'Promotional content'"
 *   - Branded content (or both): "Your photo/video will be labeled 'Paid partnership'"
 * - Branded content cannot be set to private visibility
 *
 * Reference: https://developers.tiktok.com/doc/content-sharing-guidelines/
 */
export function CommercialDisclosure({
  enabled,
  onEnabledChange,
  promotionalContent,
  onPromotionalChange,
  brandedContent,
  onBrandedChange,
  privacyLevel,
  isPhotoPost = false
}: CommercialDisclosureProps) {
  const hasValidSelection = promotionalContent || brandedContent
  const isPrivacyPrivate = privacyLevel === 'SELF_ONLY'
  const contentType = isPhotoPost ? 'photo' : 'video'

  // Determine the content label based on TikTok's requirements:
  // - If branded content is selected (alone or with your brand): "Paid partnership"
  // - If only your brand is selected: "Promotional content"
  const getContentLabel = () => {
    if (brandedContent) {
      return 'Paid partnership'
    }
    if (promotionalContent) {
      return 'Promotional content'
    }
    return null
  }

  const contentLabel = getContentLabel()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Content Disclosure</h4>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
            Turn on to disclose that this {contentType} promotes goods or services in exchange for something of value. Your {contentType} could promote yourself, a third party, or both.
          </div>
        </div>
      </div>

      {/* Main Toggle - Label: "Disclose video content" as per TikTok requirements */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="space-y-1 flex-1">
          <Label htmlFor="content-disclosure" className="text-base font-medium cursor-pointer">
            Disclose {contentType} content
          </Label>
          <p className="text-sm text-gray-600">
            Turn on to disclose that this {contentType} promotes goods or services in exchange for something of value.
          </p>
        </div>
        <Switch
          id="content-disclosure"
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked)
            // Reset checkboxes when disabled
            if (!checked) {
              onPromotionalChange(false)
              onBrandedChange(false)
            }
          }}
        />
      </div>

      {/* Disclosure Options - Only show when enabled */}
      {enabled && (
        <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-white">
          {/* Content Label Warning - Shows what label will be applied */}
          {contentLabel && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                Your {contentType} will be labeled &apos;{contentLabel}&apos;. This cannot be changed once your {contentType} is posted.
              </p>
            </div>
          )}

          {/* Your Brand Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <Checkbox
              id="your-brand"
              checked={promotionalContent}
              onCheckedChange={(checked) => onPromotionalChange(checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="your-brand" className="text-sm font-medium cursor-pointer">
                Your brand
              </Label>
              <p className="text-xs text-gray-600">
                You are promoting yourself or your own business. This {contentType} will be classified as Brand Organic.
              </p>
            </div>
          </div>

          {/* Branded Content Checkbox - Disabled only for private visibility */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${isPrivacyPrivate ? 'bg-gray-100' : 'bg-gray-50'}`}>
            <div className="group relative">
              <Checkbox
                id="branded-content"
                checked={brandedContent}
                onCheckedChange={(checked) => onBrandedChange(checked as boolean)}
                disabled={isPrivacyPrivate}
                className="mt-0.5"
              />
              {isPrivacyPrivate && (
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  Branded content visibility cannot be set to private.
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="branded-content" className={`text-sm font-medium ${isPrivacyPrivate ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                Branded content
              </Label>
              <p className="text-xs text-gray-600">
                {isPrivacyPrivate
                  ? 'Branded content visibility cannot be set to private. Change privacy to Public or Friends first.'
                  : `You are promoting another brand or a third party. This ${contentType} will be classified as Branded Content.`
                }
              </p>
            </div>
          </div>

          {/* Validation Warning - No selection made */}
          {!hasValidSelection && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
              <p className="text-xs text-red-800">
                You need to indicate if your content promotes yourself, a third party, or both.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
