'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info, AlertCircle } from 'lucide-react'
import { CreatorInfoDisplay } from './creator-info-display'
import { InteractionToggles } from './interaction-toggles'
import { CommercialDisclosure } from './commercial-disclosure'
import { LegalDeclarations } from './legal-declarations'
import { CreatorInfo, PrivacyLevel, PRIVACY_LEVEL_LABELS } from '@/lib/tiktok/creator-info'

interface TikTokVideoSettingsProps {
  // Title (separate from caption/content)
  title: string
  setTitle: (title: string) => void

  // Privacy Level (NO default - user must select)
  privacyLevel: PrivacyLevel | ''
  setPrivacyLevel: (level: PrivacyLevel) => void

  // Interaction Settings
  allowComment: boolean
  setAllowComment: (allow: boolean) => void
  allowDuet: boolean
  setAllowDuet: (allow: boolean) => void
  allowStitch: boolean
  setAllowStitch: (allow: boolean) => void

  // Commercial Content Disclosure
  contentDisclosureEnabled: boolean
  setContentDisclosureEnabled: (enabled: boolean) => void
  promotionalContent: boolean
  setPromotionalContent: (enabled: boolean) => void
  brandedContent: boolean
  setBrandedContent: (enabled: boolean) => void

  // Whether this is a photo post (photos only support comments, not duet/stitch)
  isPhotoPost?: boolean
}

/**
 * TikTok Video Settings Component (Redesigned for TikTok Audit Compliance)
 *
 * This component implements ALL requirements from TikTok's UX Guidelines:
 * 1. ✅ Display creator info (username/avatar) from creator_info API
 * 2. ✅ Title field (separate from description)
 * 3. ✅ Privacy level selector with NO default (user must manually select)
 * 4. ✅ Interaction toggles (Comment/Duet/Stitch) with NO defaults
 * 5. ✅ Commercial content disclosure with validation
 * 6. ✅ Legal compliance declarations
 * 7. ✅ Privacy + commercial content validation (branded cannot be private)
 * 8. ✅ Creator settings respected (grey out disabled interactions)
 *
 * Reference: https://developers.tiktok.com/doc/content-sharing-guidelines/
 */
export function TikTokVideoSettings({
  title,
  setTitle,
  privacyLevel,
  setPrivacyLevel,
  allowComment,
  setAllowComment,
  allowDuet,
  setAllowDuet,
  allowStitch,
  setAllowStitch,
  contentDisclosureEnabled,
  setContentDisclosureEnabled,
  promotionalContent,
  setPromotionalContent,
  brandedContent,
  setBrandedContent,
  isPhotoPost = false
}: TikTokVideoSettingsProps) {
  // Creator info state
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null)
  const [loadingCreatorInfo, setLoadingCreatorInfo] = useState(true)
  const [creatorInfoError, setCreatorInfoError] = useState<string | null>(null)

  // Fetch creator info when component mounts
  useEffect(() => {
    fetchCreatorInfo()
  }, [])

  const fetchCreatorInfo = async () => {
    try {
      setLoadingCreatorInfo(true)
      setCreatorInfoError(null)

      const response = await fetch('/api/tiktok/creator-info')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch creator info')
      }

      const data = await response.json()
      setCreatorInfo(data.data)
    } catch (error) {
      console.error('Error fetching creator info:', error)
      setCreatorInfoError(error instanceof Error ? error.message : 'Failed to load creator info')

      // Set default values if API fails
      setCreatorInfo({
        creator_username: 'Unknown',
        creator_avatar_url: '',
        privacy_level_options: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
        comment_disabled: false,
        duet_disabled: false,
        stitch_disabled: false,
        max_video_post_duration_sec: 600
      })
    } finally {
      setLoadingCreatorInfo(false)
    }
  }

  // Validation: Check if all required fields are filled
  const hasValidPrivacyLevel = privacyLevel !== ''
  const hasValidCommercialContent = !contentDisclosureEnabled || (promotionalContent || brandedContent)
  const hasValidPrivacyForBranded = !brandedContent || privacyLevel !== 'SELF_ONLY'

  // Calculate character counts
  const titleCharCount = title.length
  const titleMaxChars = isPhotoPost ? 150 : 2200

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-black">♪</span>
          TikTok {isPhotoPost ? 'Photo' : 'Video'} Settings
        </CardTitle>
        <CardDescription>
          Configure your TikTok post settings. All fields are required for publishing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Creator Info Display */}
        {creatorInfoError ? (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Failed to load TikTok account info</p>
              <p className="text-xs mt-1">{creatorInfoError}</p>
            </div>
          </div>
        ) : creatorInfo ? (
          <CreatorInfoDisplay
            username={creatorInfo.creator_username}
            avatarUrl={creatorInfo.creator_avatar_url}
            isLoading={loadingCreatorInfo}
          />
        ) : null}

        {/* Title Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tiktok-title">
              Title {!isPhotoPost && '(Optional)'}
            </Label>
            <span className={`text-xs ${titleCharCount > titleMaxChars ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {titleCharCount} / {titleMaxChars}
            </span>
          </div>
          <Input
            id="tiktok-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isPhotoPost ? "Add a catchy title..." : "Add an optional title..."}
            maxLength={titleMaxChars}
            className={titleCharCount > titleMaxChars ? 'border-red-500' : ''}
          />
          <p className="text-xs text-gray-600">
            {isPhotoPost
              ? 'A short, attention-grabbing title for your photo post'
              : 'An optional title separate from your video caption'
            }
          </p>
        </div>

        {/* Privacy Level Selector - NO DEFAULT VALUE */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="tiktok-privacy">Privacy Level *</Label>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Choose who can see this post. You must manually select a privacy level.
              </div>
            </div>
          </div>
          <Select
            value={privacyLevel}
            onValueChange={(value) => {
              setPrivacyLevel(value as PrivacyLevel)

              // Only uncheck branded content if private is selected
              // (TikTok requirement: Branded content visibility cannot be private)
              // Your Brand (promotional content) is still allowed for private posts
              if (value === 'SELF_ONLY') {
                if (brandedContent) setBrandedContent(false)
              }
            }}
          >
            <SelectTrigger id="tiktok-privacy" className={!hasValidPrivacyLevel ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select who can see this post..." />
            </SelectTrigger>
            <SelectContent>
              {creatorInfo?.privacy_level_options.map((level) => {
                const info = PRIVACY_LEVEL_LABELS[level]
                // TikTok requirement: Branded content visibility cannot be private
                const isDisabledForBrandedContent = level === 'SELF_ONLY' && brandedContent
                return (
                  <div key={level} className="group relative">
                    <SelectItem
                      value={level}
                      disabled={isDisabledForBrandedContent}
                      className={isDisabledForBrandedContent ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-xs text-gray-600">
                          {isDisabledForBrandedContent
                            ? 'Branded content visibility cannot be set to private'
                            : info.description
                          }
                        </div>
                      </div>
                    </SelectItem>
                    {/* Tooltip for disabled private option - TikTok UX requirement */}
                    {isDisabledForBrandedContent && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                        Branded content visibility cannot be set to private.
                      </div>
                    )}
                  </div>
                )
              })}
            </SelectContent>
          </Select>
          {!hasValidPrivacyLevel && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              You must select a privacy level before publishing
            </p>
          )}
        </div>

        {/* Interaction Toggles (Comment/Duet/Stitch) */}
        {creatorInfo && (
          <InteractionToggles
            allowComment={allowComment}
            allowDuet={allowDuet}
            allowStitch={allowStitch}
            commentDisabled={creatorInfo.comment_disabled}
            duetDisabled={creatorInfo.duet_disabled}
            stitchDisabled={creatorInfo.stitch_disabled}
            isPhotoPost={isPhotoPost}
            onChange={(setting, value) => {
              if (setting === 'comment') setAllowComment(value)
              if (setting === 'duet') setAllowDuet(value)
              if (setting === 'stitch') setAllowStitch(value)
            }}
          />
        )}

        {/* Commercial Content Disclosure */}
        <CommercialDisclosure
          enabled={contentDisclosureEnabled}
          onEnabledChange={setContentDisclosureEnabled}
          promotionalContent={promotionalContent}
          onPromotionalChange={setPromotionalContent}
          brandedContent={brandedContent}
          onBrandedChange={setBrandedContent}
          privacyLevel={privacyLevel}
          isPhotoPost={isPhotoPost}
        />

        {/* Legal Declarations */}
        <LegalDeclarations
          hasPromotional={promotionalContent}
          hasBrandedContent={brandedContent}
        />

        {/* Requirements Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {isPhotoPost ? 'TikTok Photo Requirements:' : 'TikTok Video Requirements:'}
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            {isPhotoPost ? (
              <>
                <li>• Photos: 1 to 35 images</li>
                <li>• Title: Up to 150 characters</li>
                <li>• Description: Up to 4,000 characters</li>
                <li>• Image format: JPG, PNG recommended</li>
              </>
            ) : (
              <>
                <li>• Duration: 3 seconds to {creatorInfo ? Math.floor(creatorInfo.max_video_post_duration_sec / 60) : 10} minutes</li>
                <li>• Aspect ratio: 9:16 (vertical) recommended</li>
                <li>• File size: Up to 287.6 MB</li>
                <li>• Formats: MP4, MOV, AVI, WMV, FLV, MKV</li>
              </>
            )}
          </ul>
        </div>

        {/* Validation Summary */}
        {(!hasValidPrivacyLevel || !hasValidCommercialContent || !hasValidPrivacyForBranded) && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Action Required
            </h4>
            <ul className="text-xs text-amber-800 space-y-1">
              {!hasValidPrivacyLevel && <li>• Select a privacy level</li>}
              {!hasValidCommercialContent && <li>• Select at least one commercial content option (or disable content disclosure)</li>}
              {!hasValidPrivacyForBranded && <li>• Branded content cannot be set to private - change privacy level to Public or Friends</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
