'use client'

import { Scale } from 'lucide-react'

interface LegalDeclarationsProps {
  /** Whether promotional content (Your Brand) is enabled */
  hasPromotional: boolean
  /** Whether branded content (Paid Partnership) is enabled */
  hasBrandedContent: boolean
}

/**
 * Legal Declarations Component
 *
 * Displays the required legal consent text before publishing to TikTok.
 * The text changes dynamically based on the type of commercial content selected.
 *
 * IMPORTANT: Required by TikTok's UX Guidelines for Content Sharing (Point 4).
 *
 * Exact TikTok requirements:
 * - Only "Your Brand" checked: "By posting, you agree to TikTok's Music Usage Confirmation."
 * - Only "Branded Content" checked: "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation."
 * - Both selected: "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation."
 *
 * Reference: https://developers.tiktok.com/doc/content-sharing-guidelines/
 */
export function LegalDeclarations({
  hasPromotional,
  hasBrandedContent
}: LegalDeclarationsProps) {
  // TikTok's exact requirement:
  // - Branded Content Policy is ONLY shown when branded content is selected
  // - Music Usage Confirmation is ALWAYS shown
  const showBrandedContentPolicy = hasBrandedContent

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <Scale className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-600" />
      <div className="flex-1 text-sm text-gray-700">
        <p className="leading-relaxed">
          By posting, you agree to{' '}
          {showBrandedContentPolicy && (
            <>
              <a
                href="https://www.tiktok.com/legal/bc-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                TikTok&apos;s Branded Content Policy
              </a>
              {' and '}
            </>
          )}
          <a
            href="https://www.tiktok.com/legal/music-usage-confirmation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {showBrandedContentPolicy ? 'Music Usage Confirmation' : "TikTok's Music Usage Confirmation"}
          </a>
          .
        </p>
      </div>
    </div>
  )
}
