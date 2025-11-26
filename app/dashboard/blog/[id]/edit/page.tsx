'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BlogEditor } from '@/components/blog/blog-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Eye, Upload, X, Calendar, Globe } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import slugify from 'slugify'
import readingTime from 'reading-time'
import { useDropzone } from 'react-dropzone'
import { checkSeoColumnsExist, prepareBlogPostData } from '@/lib/blog/utils'

interface Category {
  id: string
  name: string
  slug: string
  color: string
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  featured: boolean
  featured_image: string | null
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  author_id: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string[]
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
}

export default function EditBlogPostPage() {
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [featured, setFeatured] = useState(false)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [publishDate, setPublishDate] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')
  
  // SEO fields
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [metaKeywords, setMetaKeywords] = useState<string[]>([])
  const [metaKeywordInput, setMetaKeywordInput] = useState('')
  const [ogTitle, setOgTitle] = useState('')
  const [ogDescription, setOgDescription] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadPost()
    loadCategories()
  }, [postId])

  const loadPost = async () => {
    try {
      // Check if postId is valid
      if (!postId || postId === 'undefined') {
        console.error('Invalid post ID:', postId)
        toast.error('Invalid post ID')
        router.push('/dashboard/blog')
        return
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) {
        console.error('Error fetching post:', error)
        throw error
      }

      if (data) {
        setTitle(data.title)
        setSlug(data.slug)
        setExcerpt(data.excerpt || '')
        setContent(data.content)
        setCategory(data.category || '')
        setTags(data.tags || [])
        setFeatured(data.featured)
        setFeaturedImage(data.featured_image)
        setStatus(data.status)
        if (data.published_at) {
          const date = new Date(data.published_at)
          setPublishDate(date.toISOString().slice(0, 16))
        }
        // Load SEO fields - handle null values properly
        if (data.meta_title) setMetaTitle(data.meta_title)
        if (data.meta_description) setMetaDescription(data.meta_description)
        if (data.meta_keywords && Array.isArray(data.meta_keywords)) setMetaKeywords(data.meta_keywords)
        if (data.og_title) setOgTitle(data.og_title)
        if (data.og_description) setOgDescription(data.og_description)
        if (data.og_image) setOgImage(data.og_image)
        if (data.canonical_url) setCanonicalUrl(data.canonical_url)
      }
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Failed to load blog post')
      router.push('/dashboard/blog')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('order_index')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const uploadFeaturedImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)

      // Use the blog upload API endpoint (supports R2 with Supabase fallback)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/blog/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload featured image')
      return null
    } finally {
      setUploading(false)
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const url = await uploadFeaturedImage(file)
    if (url) {
      setFeaturedImage(url)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1
  })

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleAddMetaKeyword = () => {
    if (metaKeywordInput && !metaKeywords.includes(metaKeywordInput)) {
      setMetaKeywords([...metaKeywords, metaKeywordInput])
      setMetaKeywordInput('')
    }
  }

  const handleRemoveMetaKeyword = (keywordToRemove: string) => {
    setMetaKeywords(metaKeywords.filter(keyword => keyword !== keywordToRemove))
  }

  const calculateReadingTime = (text: string) => {
    const stats = readingTime(text)
    return Math.ceil(stats.minutes)
  }

  const handleSave = async (publishNow = false) => {
    if (!title || !content) {
      toast.error('Title and content are required')
      return
    }

    setSaving(true)
    try {
      // First, check if user is authenticated and get their author ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to edit posts')
        return
      }
      
      console.log('Current user:', user.id)
      
      // Start with minimal update to test
      const updateData: any = {
        title,
        slug,
        content,
        updated_at: new Date().toISOString()
      }
      
      // Add optional fields only if they have values
      if (excerpt) updateData.excerpt = excerpt
      if (category) updateData.category = category
      if (featuredImage) updateData.featured_image = featuredImage
      
      // Handle arrays carefully
      updateData.tags = Array.isArray(tags) ? tags : []
      updateData.featured = featured || false
      updateData.status = publishNow ? 'published' : status
      updateData.reading_time = calculateReadingTime(content)
      
      if (publishNow && !publishDate) {
        updateData.published_at = new Date().toISOString()
      } else if (publishDate) {
        updateData.published_at = new Date(publishDate).toISOString()
      }

      // Debug log to see what we're sending
      console.log('Updating post with data:', updateData)
      console.log('Post ID:', postId)

      // First try to update without select to see if it's a select issue
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', postId)
      
      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }
      
      // Then fetch the updated data separately
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      toast.success(publishNow ? 'Blog post published!' : 'Blog post updated')
      // Reload the post data to confirm changes
      await loadPost()
    } catch (error: any) {
      console.error('Error saving post:', error)
      const errorMessage = error?.message || error?.details || 'Failed to save blog post'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const getPreviewContent = () => {
    return content || '<p class="text-gray-500">Start writing to see preview...</p>'
  }

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blog post...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/blog')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Blog Post</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/blog/${slug}`, '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Live
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Publish Now
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Post Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter your blog post title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-2xl font-bold h-14"
                    />
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      placeholder="Brief description of your post (appears in listings)..."
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Content</Label>
                    <BlogEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Start writing your blog post..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>This is how your post will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  {featuredImage && (
                    <img 
                      src={featuredImage} 
                      alt={title}
                      className="w-full h-64 object-cover rounded-lg mb-6"
                    />
                  )}
                  <h1 className="text-4xl font-bold mb-4">{title || 'Untitled Post'}</h1>
                  {excerpt && (
                    <p className="text-xl text-gray-600 mb-6">{excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <span>{calculateReadingTime(content)} min read</span>
                    {category && (
                      <>
                        <span>•</span>
                        <span>{categories.find(c => c.slug === category)?.name}</span>
                      </>
                    )}
                  </div>
                  <div 
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              {featuredImage ? (
                <div className="relative">
                  <img 
                    src={featuredImage} 
                    alt="Featured" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFeaturedImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  placeholder="url-friendly-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="tags"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                  />
                  <Button onClick={handleAddTag} size="sm">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured Post</Label>
                <Switch
                  id="featured"
                  checked={featured}
                  onCheckedChange={setFeatured}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: 'draft' | 'published' | 'archived') => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status === 'published' && (
                <div>
                  <Label htmlFor="publishDate">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Publish Date
                  </Label>
                  <Input
                    id="publishDate"
                    type="datetime-local"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Optimize for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  placeholder="SEO title (defaults to post title)"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {metaTitle ? metaTitle.length : title.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  placeholder="SEO description (defaults to excerpt)"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {metaDescription ? metaDescription.length : excerpt.length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="metaKeywords"
                    placeholder="Add keyword..."
                    value={metaKeywordInput}
                    onChange={(e) => setMetaKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddMetaKeyword()
                      }
                    }}
                  />
                  <Button onClick={handleAddMetaKeyword} size="sm">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metaKeywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                      <button
                        onClick={() => handleRemoveMetaKeyword(keyword)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  placeholder="https://example.com/blog/post"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use the default URL
                </p>
              </div>

              <Separator />

              <div>
                <Label htmlFor="ogTitle">Open Graph Title</Label>
                <Input
                  id="ogTitle"
                  placeholder="Title for social sharing (defaults to post title)"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ogDescription">Open Graph Description</Label>
                <Textarea
                  id="ogDescription"
                  placeholder="Description for social sharing (defaults to excerpt)"
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="ogImage">Open Graph Image URL</Label>
                <Input
                  id="ogImage"
                  placeholder="Image URL for social sharing (defaults to featured image)"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}