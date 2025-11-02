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
}

/**
 * Commercial Content Disclosure Component
 *
 * Required by TikTok's UX Guidelines for Content Sharing.
 *
 * Features:
 * - Toggle to enable/disable content disclosure (OFF by default)
 * - Two checkboxes when enabled:
 *   1. Promotional content (Your Brand) - for creator's own business
 *   2. Paid partnership (Branded Content) - for third-party brands
 * - At least one checkbox MUST be selected when toggle is ON
 * - Validation: Branded content cannot be posted with "Private" visibility
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
  privacyLevel
}: CommercialDisclosureProps) {
  const hasValidSelection = promotionalContent || brandedContent
  const showPrivacyWarning = brandedContent && privacyLevel === 'SELF_ONLY'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Content Disclosure</h4>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
            Indicate if your content promotes yourself, a third party, or both. Required for commercial content.
          </div>
        </div>
      </div>

      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="space-y-1 flex-1">
          <Label htmlFor="content-disclosure" className="text-base font-medium cursor-pointer">
            Content Disclosure Setting
          </Label>
          <p className="text-sm text-gray-600">
            Enable if your content is promotional or sponsored
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
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              <strong>Required:</strong> Select at least one option below to indicate what type of content this is.
            </p>
          </div>

          {/* Promotional Content (Your Brand) Checkbox */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              id="promotional-content"
              checked={promotionalContent}
              onCheckedChange={(checked) => onPromotionalChange(checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="promotional-content" className="text-sm font-medium cursor-pointer">
                Promotional content
              </Label>
              <p className="text-xs text-gray-600">
                Your Brand - Content promoting your own business, products, or services
              </p>
            </div>
          </div>

          {/* Branded Content (Paid Partnership) Checkbox */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              id="branded-content"
              checked={brandedContent}
              onCheckedChange={(checked) => onBrandedChange(checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="branded-content" className="text-sm font-medium cursor-pointer">
                Paid partnership
              </Label>
              <p className="text-xs text-gray-600">
                Branded Content - Content promoting a third-party brand or sponsor
              </p>
            </div>
          </div>

          {/* Validation Warning - No selection made */}
          {!hasValidSelection && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
              <p className="text-xs text-red-800">
                <strong>Warning:</strong> You need to indicate if your content promotes yourself, a third party, or both
              </p>
            </div>
          )}

          {/* Privacy Warning - Branded content with private visibility */}
          {showPrivacyWarning && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                <strong>Privacy Restriction:</strong> Branded content visibility cannot be set to private. Please select Public or Friends.
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>What to select:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li><strong>Promotional content only:</strong> You&apos;re promoting your own business</li>
                <li><strong>Paid partnership only:</strong> You&apos;re promoting someone else&apos;s brand</li>
                <li><strong>Both:</strong> You&apos;re promoting your business AND a partner brand</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
