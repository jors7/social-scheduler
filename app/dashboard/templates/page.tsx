'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  FileText,
  Plus,
  Search,
  Copy,
  Edit,
  Trash2,
  Star,
  Globe,
  Lock,
  Hash,
  Calendar,
  TrendingUp,
  Filter,
  MoreVertical
} from 'lucide-react'
import { TemplateModal } from '@/components/templates/template-modal'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
  description: string
  content: string
  platforms: string[]
  platform_content: Record<string, string>
  category: string
  tags: string[]
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('post_templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('usage_count', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const { error } = await supabase
        .from('post_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      
      toast.success('Template deleted successfully')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleUseTemplate = async (template: Template) => {
    // Increment usage count
    await supabase.rpc('increment_template_usage', { template_id: template.id })
    
    // Navigate to create page with template data
    const templateData = encodeURIComponent(JSON.stringify({
      content: template.content,
      platforms: template.platforms,
      platform_content: template.platform_content
    }))
    router.push(`/dashboard/create/new?template=${templateData}`)
  }

  const handleDuplicate = async (template: Template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('post_templates')
        .insert({
          user_id: user.id,
          name: `${template.name} (Copy)`,
          description: template.description,
          content: template.content,
          platforms: template.platforms,
          platform_content: template.platform_content,
          category: template.category,
          tags: template.tags,
          is_public: false
        })

      if (error) throw error
      
      toast.success('Template duplicated successfully')
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const categories = ['all', 'marketing', 'announcement', 'engagement', 'educational', 'promotional', 'other']
  
  const filteredTemplates = templates.filter(template => {
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !template.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedCategory !== 'all' && template.category !== selectedCategory) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-pulse" />
          <p className="text-gray-500">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Post Templates</h1>
          <p className="text-gray-600 mt-1">Save and reuse your best-performing content</p>
        </div>
        <Button onClick={() => {
          setEditingTemplate(null)
          setShowModal(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Times Used</p>
                <p className="text-2xl font-bold">
                  {templates.reduce((sum, t) => sum + t.usage_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Public Templates</p>
                <p className="text-2xl font-bold">
                  {templates.filter(t => t.is_public).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.name}
                    {template.is_public ? (
                      <Globe className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </CardTitle>
                  {template.description && (
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Content Preview */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {template.content}
                  </p>
                </div>

                {/* Platforms */}
                <div className="flex flex-wrap gap-1">
                  {template.platforms.map(platform => (
                    <Badge key={platform} variant="secondary" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map(tag => (
                      <span key={tag} className="text-xs text-gray-500">
                        <Hash className="inline h-3 w-3" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Used {template.usage_count} times</span>
                  {template.category && (
                    <Badge variant="outline">{template.category}</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template)
                      setShowModal(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No templates found</p>
            <Button onClick={() => {
              setEditingTemplate(null)
              setShowModal(true)
            }}>
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Modal */}
      {showModal && (
        <TemplateModal
          open={showModal}
          onOpenChange={setShowModal}
          template={editingTemplate}
          onSave={() => {
            fetchTemplates()
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}