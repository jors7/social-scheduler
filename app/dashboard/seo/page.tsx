'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Upload, Save, Plus, Trash2, Globe, Image as ImageIcon, Search, Code, Shield, Loader2, Map, Send, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SEOSettings {
  id?: string
  page_path: string
  title: string
  description: string
  keywords: string[]
  og_title: string
  og_description: string
  og_image: string
  og_type: string
  twitter_card: string
  twitter_title: string
  twitter_description: string
  twitter_image: string
  canonical_url: string
  robots: string
  author: string
  structured_data: any
  custom_meta: any
}

const defaultPages = [
  { path: '/', name: 'Homepage' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/blog', name: 'Blog' },
  { path: '/contact', name: 'Contact' },
  { path: '/support', name: 'Support' },
  { path: '/terms', name: 'Terms of Service' },
  { path: '/privacy', name: 'Privacy Policy' },
]

export default function SEOSettingsPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [seoSettings, setSeoSettings] = useState<SEOSettings[]>([])
  const [selectedPage, setSelectedPage] = useState<string>('/')
  const [currentSettings, setCurrentSettings] = useState<Partial<SEOSettings>>({
    page_path: '/',
    title: '',
    description: '',
    keywords: [],
    og_title: '',
    og_description: '',
    og_image: '',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    twitter_title: '',
    twitter_description: '',
    twitter_image: '',
    canonical_url: '',
    robots: 'index, follow',
    author: 'SocialCal',
    structured_data: {},
    custom_meta: {}
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pingingSearchEngines, setPingingSearchEngines] = useState(false)
  const [pingResults, setPingResults] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthorization()
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      fetchSEOSettings()
    }
  }, [isAuthorized])

  useEffect(() => {
    if (selectedPage && seoSettings.length > 0) {
      const settings = seoSettings.find(s => s.page_path === selectedPage)
      if (settings) {
        setCurrentSettings(settings)
      } else {
        // Reset to defaults for new page
        setCurrentSettings({
          page_path: selectedPage,
          title: '',
          description: '',
          keywords: [],
          og_title: '',
          og_description: '',
          og_image: '',
          og_type: 'website',
          twitter_card: 'summary_large_image',
          twitter_title: '',
          twitter_description: '',
          twitter_image: '',
          canonical_url: `https://www.socialcal.app${selectedPage}`,
          robots: 'index, follow',
          author: 'SocialCal',
          structured_data: {},
          custom_meta: {}
        })
      }
    }
  }, [selectedPage, seoSettings])

  const checkAuthorization = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === 'jan.orsula1@gmail.com') {
      setIsAuthorized(true)
    } else {
      setIsAuthorized(false)
      toast.error('Unauthorized: This page is restricted to admin users only')
      router.push('/dashboard')
    }
  }

  const fetchSEOSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/seo')
      const { data } = await response.json()
      if (data) {
        setSeoSettings(data)
      }
    } catch (error) {
      console.error('Error fetching SEO settings:', error)
      toast.error('Failed to load SEO settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentSettings),
      })

      if (!response.ok) throw new Error('Failed to save')

      const { data } = await response.json()
      toast.success(`SEO settings saved for ${currentSettings.page_path}`)
      
      // Update local state
      setSeoSettings(prev => {
        const index = prev.findIndex(s => s.page_path === currentSettings.page_path)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = data
          return updated
        } else {
          return [...prev, data]
        }
      })
    } catch (error) {
      console.error('Error saving SEO settings:', error)
      toast.error('Failed to save SEO settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'og_image' | 'twitter_image') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pagePath', currentSettings.page_path || '/')

      const response = await fetch('/api/seo/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const { url } = await response.json()
      
      setCurrentSettings(prev => ({
        ...prev,
        [field]: url
      }))
      
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleKeywordsChange = (value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k)
    setCurrentSettings(prev => ({
      ...prev,
      keywords
    }))
  }

  const handleStructuredDataChange = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      setCurrentSettings(prev => ({
        ...prev,
        structured_data: parsed
      }))
    } catch (error) {
      // Invalid JSON, don't update
    }
  }

  const handlePingSearchEngines = async () => {
    setPingingSearchEngines(true)
    setPingResults(null)
    
    try {
      const response = await fetch('/api/sitemap/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'manual' }),
      })

      const data = await response.json()
      setPingResults(data)
      
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error('Failed to ping some search engines')
      }
    } catch (error) {
      console.error('Error pinging search engines:', error)
      toast.error('Failed to ping search engines')
    } finally {
      setPingingSearchEngines(false)
    }
  }

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SEO Settings Manager</h1>
        <p className="text-gray-600">
          Manage meta tags, Open Graph, and structured data for all pages
        </p>
      </div>

      {/* Page Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Page</CardTitle>
          <CardDescription>Choose a page to edit its SEO settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="page-select">Page</Label>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger id="page-select">
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {defaultPages.map(page => (
                    <SelectItem key={page.path} value={page.path}>
                      {page.name} ({page.path})
                    </SelectItem>
                  ))}
                  {seoSettings
                    .filter(s => !defaultPages.find(p => p.path === s.page_path))
                    .map(s => (
                      <SelectItem key={s.page_path} value={s.page_path}>
                        Custom: {s.page_path}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom path (e.g., /new-page)"
                className="w-64"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value
                    if (value && value.startsWith('/')) {
                      setSelectedPage(value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }
                }}
              />
              <Button 
                onClick={handleSave}
                disabled={isSaving || !currentSettings.page_path}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings Tabs */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="basic">
            <Globe className="h-4 w-4 mr-2" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="opengraph">
            <ImageIcon className="h-4 w-4 mr-2" />
            Open Graph
          </TabsTrigger>
          <TabsTrigger value="twitter">
            <Search className="h-4 w-4 mr-2" />
            Twitter
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Shield className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="structured">
            <Code className="h-4 w-4 mr-2" />
            Structured Data
          </TabsTrigger>
          <TabsTrigger value="sitemap">
            <Map className="h-4 w-4 mr-2" />
            Sitemap
          </TabsTrigger>
        </TabsList>

        {/* Basic Meta Tags */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Meta Tags</CardTitle>
              <CardDescription>Essential SEO metadata for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={currentSettings.title || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="SocialCal - Schedule Posts Across All Platforms"
                  maxLength={60}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {currentSettings.title?.length || 0}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="description">Meta Description</Label>
                <Textarea
                  id="description"
                  value={currentSettings.description || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Save 15+ hours weekly with SocialCal..."
                  maxLength={160}
                  rows={3}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {currentSettings.description?.length || 0}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Textarea
                  id="keywords"
                  value={currentSettings.keywords?.join(', ') || ''}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                  placeholder="social media scheduler, content management, social media automation"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={currentSettings.author || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="SocialCal"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Open Graph */}
        <TabsContent value="opengraph">
          <Card>
            <CardHeader>
              <CardTitle>Open Graph Tags</CardTitle>
              <CardDescription>Control how your pages appear when shared on social media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="og-title">OG Title</Label>
                <Input
                  id="og-title"
                  value={currentSettings.og_title || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, og_title: e.target.value }))}
                  placeholder="SocialCal - Schedule Posts Across All Platforms"
                />
              </div>

              <div>
                <Label htmlFor="og-description">OG Description</Label>
                <Textarea
                  id="og-description"
                  value={currentSettings.og_description || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, og_description: e.target.value }))}
                  placeholder="Save 15+ hours weekly..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="og-image">OG Image</Label>
                <div className="space-y-2">
                  <Input
                    id="og-image"
                    value={currentSettings.og_image || ''}
                    onChange={(e) => setCurrentSettings(prev => ({ ...prev, og_image: e.target.value }))}
                    placeholder="https://..."
                  />
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'og_image')}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && <Loader2 className="h-8 w-8 animate-spin" />}
                  </div>
                  {currentSettings.og_image && (
                    <img 
                      src={currentSettings.og_image} 
                      alt="OG Preview" 
                      className="w-full max-w-md rounded border"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="og-type">OG Type</Label>
                <Select 
                  value={currentSettings.og_type || 'website'}
                  onValueChange={(value) => setCurrentSettings(prev => ({ ...prev, og_type: value }))}
                >
                  <SelectTrigger id="og-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Twitter Cards */}
        <TabsContent value="twitter">
          <Card>
            <CardHeader>
              <CardTitle>Twitter Card Tags</CardTitle>
              <CardDescription>Optimize how your content appears on Twitter/X</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitter-card">Card Type</Label>
                <Select 
                  value={currentSettings.twitter_card || 'summary_large_image'}
                  onValueChange={(value) => setCurrentSettings(prev => ({ ...prev, twitter_card: value }))}
                >
                  <SelectTrigger id="twitter-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                    <SelectItem value="app">App</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="twitter-title">Twitter Title</Label>
                <Input
                  id="twitter-title"
                  value={currentSettings.twitter_title || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, twitter_title: e.target.value }))}
                  placeholder="SocialCal - All-in-One Scheduler"
                />
              </div>

              <div>
                <Label htmlFor="twitter-description">Twitter Description</Label>
                <Textarea
                  id="twitter-description"
                  value={currentSettings.twitter_description || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, twitter_description: e.target.value }))}
                  placeholder="Save 15+ hours weekly..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="twitter-image">Twitter Image</Label>
                <div className="space-y-2">
                  <Input
                    id="twitter-image"
                    value={currentSettings.twitter_image || ''}
                    onChange={(e) => setCurrentSettings(prev => ({ ...prev, twitter_image: e.target.value }))}
                    placeholder="https://..."
                  />
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'twitter_image')}
                      disabled={uploadingImage}
                    />
                    {uploadingImage && <Loader2 className="h-8 w-8 animate-spin" />}
                  </div>
                  {currentSettings.twitter_image && (
                    <img 
                      src={currentSettings.twitter_image} 
                      alt="Twitter Preview" 
                      className="w-full max-w-md rounded border"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced SEO Settings</CardTitle>
              <CardDescription>Technical SEO configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="canonical">Canonical URL</Label>
                <Input
                  id="canonical"
                  value={currentSettings.canonical_url || ''}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, canonical_url: e.target.value }))}
                  placeholder="https://www.socialcal.app/..."
                />
              </div>

              <div>
                <Label htmlFor="robots">Robots Meta Tag</Label>
                <Select 
                  value={currentSettings.robots || 'index, follow'}
                  onValueChange={(value) => setCurrentSettings(prev => ({ ...prev, robots: value }))}
                >
                  <SelectTrigger id="robots">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="index, follow">Index, Follow</SelectItem>
                    <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                    <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                    <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-meta">Custom Meta Tags (JSON)</Label>
                <Textarea
                  id="custom-meta"
                  value={JSON.stringify(currentSettings.custom_meta || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setCurrentSettings(prev => ({ ...prev, custom_meta: parsed }))
                    } catch {}
                  }}
                  placeholder='{"viewport": "width=device-width, initial-scale=1"}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structured Data */}
        <TabsContent value="structured">
          <Card>
            <CardHeader>
              <CardTitle>Structured Data (JSON-LD)</CardTitle>
              <CardDescription>Add schema.org structured data for rich results</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="structured-data">JSON-LD Schema</Label>
                <Textarea
                  id="structured-data"
                  value={JSON.stringify(currentSettings.structured_data || {}, null, 2)}
                  onChange={(e) => handleStructuredDataChange(e.target.value)}
                  placeholder={`{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Name",
  "description": "Page description"
}`}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter valid JSON-LD structured data. Common types: WebPage, Article, Product, Organization
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitemap Management */}
        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <CardTitle>Sitemap Management</CardTitle>
              <CardDescription>
                Your sitemap automatically updates when you add or modify pages. Notify search engines of changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sitemap Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Dynamic Sitemap Active</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Your sitemap automatically includes:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>All static pages with proper priorities</li>
                  <li>Dynamic pages from SEO settings</li>
                  <li>Blog posts (when published)</li>
                  <li>Auto-updates every hour</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <a 
                    href="https://www.socialcal.app/sitemap.xml" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                  >
                    View Live Sitemap
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Ping Search Engines */}
              <div>
                <h4 className="font-semibold mb-3">Notify Search Engines</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Ping search engines to notify them of sitemap updates. This helps with faster indexing.
                </p>
                <Button
                  onClick={handlePingSearchEngines}
                  disabled={pingingSearchEngines}
                  className="mb-4"
                >
                  {pingingSearchEngines ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Pinging...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Ping Search Engines
                    </>
                  )}
                </Button>

                {/* Ping Results */}
                {pingResults && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium mb-2">Ping Results:</h5>
                    <div className="space-y-2">
                      {Object.entries(pingResults.results || {}).map(([engine, success]) => (
                        <div key={engine} className="flex items-center gap-2 text-sm">
                          {success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="capitalize">{engine}</span>
                          <span className={success ? 'text-green-600' : 'text-red-600'}>
                            {success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {pingResults.timestamp && (
                      <p className="text-xs text-gray-500 mt-3">
                        Last pinged: {new Date(pingResults.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Search Console Links */}
              <div>
                <h4 className="font-semibold mb-3">Search Console Tools</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Submit your sitemap directly to search engines for better control:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">G</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Google Search Console</div>
                      <div className="text-xs text-gray-500">Submit & monitor</div>
                    </div>
                  </a>
                  <a
                    href="https://www.bing.com/webmasters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-600 font-bold text-sm">B</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Bing Webmaster Tools</div>
                      <div className="text-xs text-gray-500">Submit & monitor</div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Instructions */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">How It Works:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Your sitemap updates automatically when you modify pages</li>
                  <li>Search engines check your sitemap periodically</li>
                  <li>Use "Ping Search Engines" after major updates for faster indexing</li>
                  <li>Submit sitemap URL to Search Console for best results</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Search Engine Preview</CardTitle>
          <CardDescription>How your page might appear in Google search results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-blue-600 text-xl hover:underline cursor-pointer">
              {currentSettings.title || 'Page Title'}
            </div>
            <div className="text-green-700 text-sm mt-1">
              https://www.socialcal.app{currentSettings.page_path}
            </div>
            <div className="text-gray-600 text-sm mt-1">
              {currentSettings.description || 'Page description will appear here...'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}