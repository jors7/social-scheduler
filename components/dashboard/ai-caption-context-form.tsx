'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Megaphone,
  Rocket,
  Lightbulb,
  Video,
  MessageCircle,
  BookOpen,
  Sparkles
} from 'lucide-react'

export interface CaptionContext {
  template?: string
  topic: string
  keyMessage?: string
  audience?: string
  cta?: string[]
}

interface AICaptionContextFormProps {
  onSubmit: (context: CaptionContext) => void
  onCancel: () => void
  loading?: boolean
}

const templates = [
  { id: 'announcement', label: 'Announcement', icon: Megaphone, description: 'Share news or updates' },
  { id: 'launch', label: 'Launch', icon: Rocket, description: 'Product or feature release' },
  { id: 'tip', label: 'Tip/How-to', icon: Lightbulb, description: 'Educational content' },
  { id: 'behind-scenes', label: 'Behind the Scenes', icon: Video, description: 'Show your process' },
  { id: 'qa', label: 'Q&A', icon: MessageCircle, description: 'Answer questions' },
  { id: 'story', label: 'Story', icon: BookOpen, description: 'Share experiences' },
]

const ctaOptions = [
  { id: 'visit', label: 'Visit website' },
  { id: 'comment', label: 'Comment below' },
  { id: 'share', label: 'Share this post' },
  { id: 'signup', label: 'Sign up' },
  { id: 'learn-more', label: 'Learn more' },
  { id: 'shop', label: 'Shop now' },
]

export function AICaptionContextForm({ onSubmit, onCancel, loading = false }: AICaptionContextFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>()
  const [topic, setTopic] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [audience, setAudience] = useState('')
  const [selectedCtas, setSelectedCtas] = useState<string[]>([])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)

    // Auto-fill topic placeholder based on template
    const placeholders: Record<string, string> = {
      'announcement': 'Announcing our...',
      'launch': 'Launching our new...',
      'tip': 'How to...',
      'behind-scenes': 'Behind the scenes of...',
      'qa': 'Answering questions about...',
      'story': 'Story about...',
    }

    if (!topic) {
      setTopic(placeholders[templateId] || '')
    }
  }

  const handleCtaToggle = (ctaId: string) => {
    setSelectedCtas(prev =>
      prev.includes(ctaId)
        ? prev.filter(id => id !== ctaId)
        : [...prev, ctaId]
    )
  }

  const handleSubmit = () => {
    if (!topic.trim()) return

    onSubmit({
      template: selectedTemplate,
      topic: topic.trim(),
      keyMessage: keyMessage.trim() || undefined,
      audience: audience.trim() || undefined,
      cta: selectedCtas.length > 0 ? selectedCtas : undefined,
    })
  }

  const isValid = topic.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Tell me about your post</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          The more context you provide, the better your AI-generated captions will be
        </p>
      </div>

      {/* Template Selection */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Choose a Template (Optional)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {templates.map((template) => {
            const Icon = template.icon
            return (
              <Button
                key={template.id}
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTemplateSelect(template.id)}
                className="h-auto p-3 text-left"
                type="button"
              >
                <div className="flex items-start gap-2 w-full">
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{template.label}</div>
                    <div className="text-xs opacity-70 line-clamp-1">{template.description}</div>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Topic (Required) */}
      <div>
        <Label htmlFor="topic" className="text-sm font-medium">
          What&apos;s this post about? <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Launching our new mobile app that helps people track their fitness goals"
          className="mt-2 min-h-[80px]"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Be specific! Include key details about what makes this post interesting.
        </p>
      </div>

      {/* Key Message (Optional) */}
      <div>
        <Label htmlFor="keyMessage" className="text-sm font-medium">
          Key Message (Optional)
        </Label>
        <Input
          id="keyMessage"
          value={keyMessage}
          onChange={(e) => setKeyMessage(e.target.value)}
          placeholder="e.g., Makes fitness tracking simple and fun for everyone"
          className="mt-2"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          What&apos;s the main takeaway you want people to remember?
        </p>
      </div>

      {/* Target Audience (Optional) */}
      <div>
        <Label htmlFor="audience" className="text-sm font-medium">
          Target Audience (Optional)
        </Label>
        <Input
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g., Young professionals, fitness enthusiasts, busy parents"
          className="mt-2"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Who is this post for?
        </p>
      </div>

      {/* Call to Action (Optional) */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Call to Action (Optional)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {ctaOptions.map((cta) => (
            <Button
              key={cta.id}
              variant={selectedCtas.includes(cta.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCtaToggle(cta.id)}
              className="justify-start"
              type="button"
              disabled={loading}
            >
              {cta.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? 'Generating...' : 'Generate Captions'}
        </Button>
      </div>
    </div>
  )
}
