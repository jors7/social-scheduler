'use client'

import { useState } from 'react'
import { ArrowUp, Loader2, Check, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeatureRequest } from '@/lib/feature-requests/types'
import { getCategoryConfig, getStatusConfig } from '@/lib/feature-requests/constants'

interface FeatureRequestCardProps {
  feature: FeatureRequest
  hasVoted: boolean
  onVote: (featureId: string) => Promise<void>
}

export function FeatureRequestCard({ feature, hasVoted, onVote }: FeatureRequestCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const categoryConfig = getCategoryConfig(feature.category)
  const statusConfig = getStatusConfig(feature.status)

  const handleVote = async () => {
    if (hasVoted || isVoting) return

    setIsVoting(true)
    try {
      await onVote(feature.id)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-lg border-2 transition-all",
        hasVoted
          ? "border-blue-300 bg-blue-50/50"
          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/20"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{categoryConfig.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
              {feature.title}
            </h4>
            {/* Hide vote button for completed features */}
            {feature.status !== 'completed' && (
              <button
                onClick={handleVote}
                disabled={isVoting || hasVoted}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                  hasVoted
                    ? "bg-blue-100 text-blue-700 cursor-not-allowed"
                    : "bg-green-100 text-green-700 hover:bg-green-200",
                  isVoting && "opacity-50"
                )}
                title={hasVoted ? "You voted for this" : "Vote for this feature"}
              >
                {hasVoted ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">Voted</span>
                  </>
                ) : isVoting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">{feature.vote_count}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Description */}
          {feature.description && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {feature.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer - Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Category Badge */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          categoryConfig.color
        )}>
          {categoryConfig.name}
        </span>

        {/* Status Badge */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          statusConfig.color
        )}>
          <span>{statusConfig.icon}</span>
          <span>{statusConfig.label}</span>
        </span>

        {/* Custom Badge */}
        {feature.is_custom && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-100 text-purple-700 border-purple-200">
            👤 Community
          </span>
        )}
      </div>
    </div>
  )
}
