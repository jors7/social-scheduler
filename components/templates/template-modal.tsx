'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'

interface Template {
  id?: string
  name: string
  description: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  category: string
  tags: string[]
  is_public: boolean
}

interface TemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: Template | null
  onSave: () => void
}

const availablePlatforms = [
  'facebook',
  'twitter',
  'instagram',
  'linkedin',
  'bluesky',
  'threads',
  'pinterest'
]

const categories = [
  'marketing',
  'announcement',
  'engagement',
  'educational',
  'promotional',
  'other'
]

export function TemplateModal({ open, onOpenChange, template, onSave }: TemplateModalProps) {
  const [formData, setFormData] = useState<Template>({
    name: '',
    description: '',
    content: '',
    platforms: [],
    platform_content: {},
    category: 'other',
    tags: [],
    is_public: false
  })
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (template) {
      setFormData(template)
    } else {
      setFormData({
        name: '',
        description: '',
        content: '',
        platforms: [],
        platform_content: {},
        category: 'other',
        tags: [],
        is_public: false
      })
    }
  }, [template])

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast.error('Please provide a name and content for the template')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (template?.id) {
        // Update existing template
        const { error } = await supabase
          .from('post_templates')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)

        if (error) throw error
        toast.success('Template updated successfully')
      } else {
        // Create new template
        const { error } = await supabase
          .from('post_templates')
          .insert({
            ...formData,
            user_id: user.id
          })

        if (error) throw error
        toast.success('Template created successfully')
      }

      onSave()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.toLowerCase()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription>
            Save frequently used content as a template for quick reuse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Weekly Product Update"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this template"
              className="mt-1"
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter your template content..."
              rows={6}
              className="mt-1"
            />
          </div>

          {/* Platforms */}
          <div>
            <Label>Default Platforms</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {availablePlatforms.map(platform => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform}
                    checked={formData.platforms.includes(platform)}
                    onCheckedChange={() => handlePlatformToggle(platform)}
                  />
                  <Label
                    htmlFor={platform}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg mt-1"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Allow other users to use this template
              </p>
            </div>
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_public: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}