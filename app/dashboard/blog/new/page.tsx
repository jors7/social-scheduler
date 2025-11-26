'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NewBlogPostPage() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [featured, setFeatured] = useState(false)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [featuredImageBlur, setFeaturedImageBlur] = useState<string | null>(null)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
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
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    // Auto-generate slug from title
    if (title && !slug) {
      const generatedSlug = slugify(title, { lower: true, strict: true })
      setSlug(generatedSlug)
    }
  }, [title])

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
      
      // Generate blur placeholder
      try {
        const response = await fetch('/api/generate-blur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url }),
        })
        
        if (response.ok) {
          const { blur } = await response.json()
          setFeaturedImageBlur(blur)
        }
      } catch (error) {
        console.error('Error generating blur:', error)
      }
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
      // Get current user for author
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get or create author profile
      let { data: author } = await supabase
        .from('blog_authors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!author) {
        // Create author profile if doesn't exist
        const { data: newAuthor, error: authorError } = await supabase
          .from('blog_authors')
          .insert([{
            user_id: user.id,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Author',
            avatar_url: user.user_metadata?.avatar_url
          }])
          .select()
          .single()

        if (authorError) throw authorError
        author = newAuthor
      }

      // Check if SEO columns exist
      const seoEnabled = await checkSeoColumnsExist()
      
      // Prepare the data
      const rawData: any = {
        title,
        slug,
        excerpt,
        content,
        category,
        tags,
        featured,
        featured_image: featuredImage,
        featured_image_blur: featuredImageBlur,
        author_id: author?.id,
        status: publishNow ? 'published' : status,
        published_at: publishNow ? new Date().toISOString() : (publishDate || null),
        reading_time: calculateReadingTime(content)
      }
      
      // Add SEO fields if enabled
      if (seoEnabled) {
        rawData.meta_title = metaTitle
        rawData.meta_description = metaDescription
        rawData.meta_keywords = metaKeywords
        rawData.og_title = ogTitle
        rawData.og_description = ogDescription
        rawData.og_image = ogImage
        rawData.canonical_url = canonicalUrl
      }
      
      // Clean the data
      const postData = prepareBlogPostData(rawData, seoEnabled)
      
      console.log('Creating post with data:', postData)

      const { data, error } = await supabase
        .from('blog_posts')
        .insert([postData])
        .select()
        .single()

      if (error) throw error

      toast.success(publishNow ? 'Blog post published!' : 'Blog post saved as draft')
      router.push('/dashboard/blog')
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error('Failed to save blog post')
    } finally {
      setSaving(false)
    }
  }

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const getPreviewContent = () => {
    return content || '<p class="text-gray-500">Start writing to see preview...</p>'
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
          <h1 className="text-3xl font-bold">Create New Blog Post</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
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
                    onClick={() => {
                      setFeaturedImage(null)
                      setFeaturedImageBlur(null)
                    }}
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
                <Select value={status} onValueChange={(value: 'draft' | 'published') => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
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