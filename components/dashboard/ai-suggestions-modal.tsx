'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AICaptionService, CaptionSuggestion } from '@/lib/ai-suggestions'
import { AICaptionContextForm, CaptionContext } from '@/components/dashboard/ai-caption-context-form'
import {
  Sparkles,
  Copy,
  RefreshCw,
  Wand2,
  Hash,
  Heart,
  Lightbulb,
  Briefcase,
  Smile,
  GraduationCap,
  Loader2,
  ArrowLeft
} from 'lucide-react'

interface AISuggestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  platforms: string[]
  onSelectSuggestion: (suggestion: string) => void
}

export function AISuggestionsModal({
  open,
  onOpenChange,
  content,
  platforms,
  onSelectSuggestion
}: AISuggestionsModalProps) {
  const [step, setStep] = useState<'context' | 'suggestions'>('context')
  const [context, setContext] = useState<CaptionContext | null>(null)
  const [suggestions, setSuggestions] = useState<CaptionSuggestion[]>([])
  const [hashtags, setHashtags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTone, setSelectedTone] = useState<string>('mixed')
  const [progress, setProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Analyzing context...')

  const tones = [
    { id: 'mixed', label: 'Mixed', icon: Wand2, description: 'Variety of styles' },
    { id: 'professional', label: 'Professional', icon: Briefcase, description: 'Business-focused' },
    { id: 'casual', label: 'Casual', icon: Heart, description: 'Friendly & approachable' },
    { id: 'funny', label: 'Funny', icon: Smile, description: 'Humorous & engaging' },
    { id: 'inspiring', label: 'Inspiring', icon: Lightbulb, description: 'Motivational' },
    { id: 'educational', label: 'Educational', icon: GraduationCap, description: 'Informative' }
  ]

  const generateSuggestions = useCallback(async (tone: string = selectedTone, captionContext?: CaptionContext) => {
    if (platforms.length === 0) return

    setLoading(true)
    setProgress(0)
    setLoadingMessage('Analyzing context...')

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) return prev + 10
        if (prev < 60) return prev + 5
        if (prev < 90) return prev + 3
        return prev
      })
    }, 300)

    // Update loading messages
    setTimeout(() => setLoadingMessage('Crafting your caption...'), 1000)
    setTimeout(() => setLoadingMessage('Adding the perfect touch...'), 2500)

    try {
      const [captionSuggestions, hashtagSuggestions] = await Promise.all([
        AICaptionService.generateSuggestions({
          content,
          platforms,
          tone,
          includeHashtags: true,
          includeEmojis: true,
          context: captionContext || context || undefined
        }),
        AICaptionService.generateHashtagSuggestions(content, platforms)
      ])

      clearInterval(progressInterval)
      setProgress(100)
      setLoadingMessage('Complete!')

      // Small delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 300))

      setSuggestions(captionSuggestions)
      setHashtags(hashtagSuggestions)
      setStep('suggestions')
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Failed to generate suggestions:', error)
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [content, platforms, selectedTone, context])

  useEffect(() => {
    if (open) {
      // Reset to context form when modal opens
      setStep('context')
      setContext(null)
      setSuggestions([])
      setHashtags([])
    }
  }, [open])

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone)
    generateSuggestions(tone, context || undefined)
  }

  const handleContextSubmit = (captionContext: CaptionContext, tone: string) => {
    setContext(captionContext)
    setSelectedTone(tone)
    generateSuggestions(tone, captionContext)
  }

  const handleBackToContext = () => {
    setStep('context')
  }

  const handleSelectSuggestion = (suggestion: CaptionSuggestion) => {
    // Pass content as-is - don't append hashtags as they may already be included
    onSelectSuggestion(suggestion.content)
    onOpenChange(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getToneIcon = (tone: string) => {
    const toneData = tones.find(t => t.id === tone)
    return toneData?.icon || Wand2
  }

  const getToneBadgeColor = (tone: string) => {
    const colors = {
      professional: 'bg-blue-100 text-blue-800',
      casual: 'bg-green-100 text-green-800',
      funny: 'bg-yellow-100 text-yellow-800',
      inspiring: 'bg-purple-100 text-purple-800',
      educational: 'bg-orange-100 text-orange-800'
    }
    return colors[tone as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'suggestions' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToContext}
                className="mr-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State with Progress Bar - Show regardless of step */}
        {loading && (
          <div className="space-y-6">
            <div className="py-12 px-6">
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg animate-pulse">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{loadingMessage}</h3>
                    <p className="text-sm text-muted-foreground">Please wait while AI crafts your perfect caption</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out rounded-full relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Generating...</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content - Only show when not loading */}
        {!loading && (
          <div className="space-y-6">
            {/* Step 1: Context Form */}
            {step === 'context' && (
              <AICaptionContextForm
                onSubmit={handleContextSubmit}
                onCancel={() => onOpenChange(false)}
                loading={loading}
              />
            )}

            {/* Step 2: Suggestions Display */}
            {step === 'suggestions' && (
              <>
                <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Success Header */}
                  <div className="text-center space-y-2 sm:space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Your Caption is Ready!
                    </h3>
                  </div>

                  {/* Single Caption Display */}
                  {suggestions.length > 0 && suggestions[0] && (
                    <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                      <CardContent className="p-4 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                          <Badge
                            variant="secondary"
                            className={`${getToneBadgeColor(suggestions[0].tone)} px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold`}
                          >
                            {suggestions[0].tone.charAt(0).toUpperCase() + suggestions[0].tone.slice(1)} Tone
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateSuggestions(selectedTone, context || undefined)}
                            disabled={loading}
                            className="hover:bg-gray-100 w-full sm:w-auto"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerate
                          </Button>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                          <div className="text-sm sm:text-base mb-4 whitespace-pre-wrap leading-relaxed font-medium">
                            {suggestions[0].content}
                          </div>
                        </div>

                        {suggestions[0].hashtags && suggestions[0].hashtags.length > 0 && (
                          <div className="mb-4 sm:mb-6">
                            <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                              <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                              Hashtags
                            </h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              {suggestions[0].hashtags.map((hashtag, index) => (
                                <span
                                  key={index}
                                  className="text-xs sm:text-sm bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 text-blue-700 dark:text-blue-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium border border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow"
                                >
                                  {hashtag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-0 pt-3 sm:pt-4 border-t-2 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm sm:text-base text-foreground">{suggestions[0].characterCount}</span>
                            <span>characters</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {suggestions[0].platforms.map((platform) => (
                              <span key={platform} className="capitalize bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 sm:px-3 py-1 rounded-md font-medium text-[10px] sm:text-xs">
                                {platform}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2">
                          <Button
                            variant="outline"
                            className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
                            onClick={() => copyToClipboard(suggestions[0].content)}
                          >
                            <Copy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Copy Caption
                          </Button>
                          <Button
                            className="flex-1 h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                            onClick={() => handleSelectSuggestion(suggestions[0])}
                          >
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Use This Caption
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Popular Hashtags */}
                {hashtags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Suggested Hashtags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((hashtag, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(hashtag)}
                          className="h-8 text-xs"
                        >
                          {hashtag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Platform-specific tips */}
                {platforms.length > 0 && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Platform Tips</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {platforms.includes('twitter') && (
                        <p>• Twitter: Keep it under 280 characters, use 1-2 hashtags</p>
                      )}
                      {platforms.includes('instagram') && (
                        <p>• Instagram: Use 5-10 hashtags, emojis perform well</p>
                      )}
                      {platforms.includes('linkedin') && (
                        <p>• LinkedIn: Professional tone, ask questions to engage</p>
                      )}
                      {platforms.includes('tiktok') && (
                        <p>• TikTok: Include trending hashtags like #fyp</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
