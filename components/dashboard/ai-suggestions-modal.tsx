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

      setSuggestions(captionSuggestions)
      setHashtags(hashtagSuggestions)
      setStep('suggestions')
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    } finally {
      setLoading(false)
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

  const handleContextSubmit = (captionContext: CaptionContext) => {
    setContext(captionContext)
    generateSuggestions(selectedTone, captionContext)
  }

  const handleBackToContext = () => {
    setStep('context')
  }

  const handleSelectSuggestion = (suggestion: CaptionSuggestion) => {
    const fullContent = suggestion.hashtags.length > 0 
      ? `${suggestion.content}\n\n${suggestion.hashtags.join(' ')}`
      : suggestion.content
    onSelectSuggestion(fullContent)
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
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Caption Suggestions
          </DialogTitle>
        </DialogHeader>

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
          {/* Tone Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">Choose Style</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tones.map((tone) => {
                const Icon = tone.icon
                return (
                  <Button
                    key={tone.id}
                    variant={selectedTone === tone.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToneChange(tone.id)}
                    className="justify-start h-auto p-3"
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">{tone.label}</div>
                        <div className="text-xs opacity-70">{tone.description}</div>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-muted-foreground">Generating suggestions...</span>
            </div>
          )}

          {/* Suggestions */}
          {!loading && suggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Caption Suggestions</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateSuggestions()}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="space-y-3">
                {suggestions.map((suggestion) => {
                  const Icon = getToneIcon(suggestion.tone)
                  return (
                    <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge 
                            variant="secondary" 
                            className={getToneBadgeColor(suggestion.tone)}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {suggestion.tone}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(suggestion.content)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSelectSuggestion(suggestion)}
                            >
                              Use This
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm mb-3 whitespace-pre-wrap">{suggestion.content}</p>
                        
                        {suggestion.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {suggestion.hashtags.map((hashtag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {hashtag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>{suggestion.characterCount} characters</span>
                          <div className="flex items-center space-x-2">
                            {suggestion.platforms.map((platform) => (
                              <span key={platform} className="capitalize">
                                {platform}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Popular Hashtags */}
          {!loading && hashtags.length > 0 && (
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
      </DialogContent>
    </Dialog>
  )
}