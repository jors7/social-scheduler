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
 * IMPORTANT: Required by TikTok's UX Guidelines for Content Sharing.
 *
 * Declaration variations:
 * - Default: Music Usage Confirmation
 * - Promotional only: Music Usage + Brand Account Policy
 * - Branded only: Music Usage + Branded Content Policy
 * - Both: Music Usage + Both policies
 *
 * Reference: https://developers.tiktok.com/doc/content-sharing-guidelines/
 */
export function LegalDeclarations({
  hasPromotional,
  hasBrandedContent
}: LegalDeclarationsProps) {
  // Determine which policies to show
  const policies: string[] = []

  // Always include Music Usage Confirmation
  policies.push(
    '<a href="https://www.tiktok.com/legal/music-usage-confirmation" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">TikTok\'s Music Usage Confirmation</a>'
  )

  // Add Branded Content Policy if branded content is enabled
  if (hasBrandedContent) {
    policies.push(
      '<a href="https://www.tiktok.com/legal/bc-policy" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">Branded Content Policy</a>'
    )
  }

  // Add Brand Account Policy if promotional content is enabled
  if (hasPromotional) {
    policies.push(
      '<a href="https://www.tiktok.com/legal/brand-account-policy" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">Brand Account Policy</a>'
    )
  }

  // Format the policies list
  const formattedPolicies = policies.length === 1
    ? policies[0]
    : policies.length === 2
    ? `${policies[0]} and ${policies[1]}`
    : `${policies.slice(0, -1).join(', ')}, and ${policies[policies.length - 1]}`

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <Scale className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-600" />
      <div className="flex-1 text-sm text-gray-700">
        <p className="leading-relaxed">
          By posting, you agree to{' '}
          <span dangerouslySetInnerHTML={{ __html: formattedPolicies }} />
          .
        </p>
      </div>
    </div>
  )
}
