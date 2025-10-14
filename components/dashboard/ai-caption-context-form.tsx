'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sparkles,
  Briefcase,
  Heart,
  Lightbulb
} from 'lucide-react'

export interface CaptionContext {
  tone: string
  topic: string
  keyMessage?: string
  audience?: string
}

interface AICaptionContextFormProps {
  onSubmit: (context: CaptionContext, tone: string) => void
  onCancel: () => void
  loading?: boolean
}

const tones = [
  { id: 'professional', label: 'Professional', icon: Briefcase, description: 'Business-focused & credible' },
  { id: 'casual', label: 'Casual', icon: Heart, description: 'Friendly & relatable' },
  { id: 'inspiring', label: 'Inspiring', icon: Lightbulb, description: 'Motivational & uplifting' },
]

export function AICaptionContextForm({ onSubmit, onCancel, loading = false }: AICaptionContextFormProps) {
  const [selectedTone, setSelectedTone] = useState<string>('professional')
  const [topic, setTopic] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [audience, setAudience] = useState('')

  const handleSubmit = () => {
    if (!topic.trim() || !selectedTone) return

    onSubmit({
      tone: selectedTone,
      topic: topic.trim(),
      keyMessage: keyMessage.trim() || undefined,
      audience: audience.trim() || undefined,
    }, selectedTone)
  }

  const isValid = topic.trim().length > 0 && selectedTone

  return (
    <div className="space-y-8">
      {/* Header with Gradient */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-2">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Caption Generator
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Tell us about your post and we&apos;ll craft the perfect caption
          </p>
        </div>
      </div>

      {/* Tone Selection */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <Label className="text-base font-semibold mb-4 block flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Choose Your Tone <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {tones.map((tone) => {
            const Icon = tone.icon
            const isSelected = selectedTone === tone.id
            return (
              <Button
                key={tone.id}
                variant={isSelected ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSelectedTone(tone.id)}
                className={`h-auto p-5 flex-col gap-3 transition-all duration-200 ${
                  isSelected
                    ? 'shadow-lg scale-105 bg-gradient-to-br from-blue-500 to-purple-600 border-0'
                    : 'hover:shadow-md hover:scale-102 hover:border-blue-300'
                }`}
                type="button"
              >
                <Icon className={`h-7 w-7 ${isSelected ? 'text-white' : ''}`} />
                <div className="text-center">
                  <div className={`font-semibold text-sm ${isSelected ? 'text-white' : ''}`}>{tone.label}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-white/90' : 'opacity-70'}`}>{tone.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Topic (Required) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <Label htmlFor="topic" className="text-base font-semibold mb-3 block flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          What&apos;s this post about? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Launching our new mobile app that helps people track their fitness goals"
          className="min-h-[100px] text-base resize-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
          <span className="text-blue-500 font-semibold">💡 Tip:</span>
          Be specific! Include key details about what makes this post interesting.
        </p>
      </div>

      {/* Optional Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Key Message */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <Label htmlFor="keyMessage" className="text-sm font-semibold mb-3 block">
            Key Message <span className="text-gray-400 font-normal">(Optional)</span>
          </Label>
          <Input
            id="keyMessage"
            value={keyMessage}
            onChange={(e) => setKeyMessage(e.target.value)}
            placeholder="e.g., Simple & fun for everyone"
            className="focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Main takeaway for your audience
          </p>
        </div>

        {/* Target Audience */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <Label htmlFor="audience" className="text-sm font-semibold mb-3 block">
            Target Audience <span className="text-gray-400 font-normal">(Optional)</span>
          </Label>
          <Input
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g., Young professionals"
            className="focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Who is this post for?
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-6">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-12 text-base"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="flex-1 h-12 text-base bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          {loading ? 'Generating...' : 'Generate Caption'}
        </Button>
      </div>
    </div>
  )
}
