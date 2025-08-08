'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Upload,
  Download,
  Calendar,
  Clock,
  Trash2,
  Edit,
  Eye,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { SubscriptionGate } from '@/components/subscription/subscription-gate'
import { cn } from '@/lib/utils'
import { BulkEditModal } from '@/components/posts/bulk-edit-modal'

interface BulkPost {
  id: string
  content: string
  platforms: string[]
  scheduledDateTime?: string
  mediaFiles?: File[]
  status: 'draft' | 'scheduled' | 'error'
  error?: string
  charCount: number
}

const platforms = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', charLimit: 280 },
  { id: 'instagram', name: 'Instagram', icon: '📷', charLimit: 2200 },
  { id: 'facebook', name: 'Facebook', icon: 'f', charLimit: 63206 },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', charLimit: 3000 },
  { id: 'youtube', name: 'YouTube', icon: '▶', charLimit: 5000 },
  { id: 'tiktok', name: 'TikTok', icon: '♪', charLimit: 2200 },
  { id: 'threads', name: 'Threads', icon: '@', charLimit: 500 },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', charLimit: 300 },
  { id: 'pinterest', name: 'Pinterest', icon: 'P', charLimit: 500 },
]

export default function BulkUploadPage() {
  return (
    <div className="flex-1 space-y-8 p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bulk Upload & Schedule</h2>
        <p className="text-muted-foreground">
          Upload multiple posts at once and schedule them across your social media platforms
        </p>
      </div>
      
      <SubscriptionGate feature="bulk upload">
        <BulkUploadContent />
      </SubscriptionGate>
    </div>
  )
}

function BulkUploadContent() {
  const [bulkPosts, setBulkPosts] = useState<BulkPost[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'bluesky'])
  const [defaultScheduleTime, setDefaultScheduleTime] = useState('')
  const [schedulingInterval, setSchedulingInterval] = useState(30) // minutes between posts
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingPost, setEditingPost] = useState<BulkPost | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Handle CSV file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      parseCsvContent(csvText)
    }
    reader.readAsText(file)
  }, [])

  // Parse CSV content and create bulk posts
  const parseCsvContent = (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error('CSV must have at least a header row and one data row')
        return
      }

      console.log('Parsing CSV with', lines.length, 'lines')
      console.log('First line (headers):', lines[0])
      console.log('Second line (sample):', lines[1])

      // Better CSV parsing - handle quoted commas
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          const nextChar = line[i + 1]
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"'
              i++ // Skip next quote
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''))
      console.log('Parsed headers:', headers)
      
      // Expected headers: content, platforms, schedule_time
      const contentIndex = headers.findIndex(h => h.includes('content'))
      const platformsIndex = headers.findIndex(h => h.includes('platform'))
      const scheduleIndex = headers.findIndex(h => h.includes('schedule') || h.includes('time'))

      console.log('Column indices:', { contentIndex, platformsIndex, scheduleIndex })

      if (contentIndex === -1) {
        toast.error('CSV must contain a "content" column. Found columns: ' + headers.join(', '))
        return
      }

      const posts: BulkPost[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const content = values[contentIndex] || ''
        
        console.log(`Row ${i}:`, { content: content.slice(0, 50) + '...', values })
        
        if (!content || content.length < 2) {
          console.log(`Skipping row ${i} - no content`)
          continue
        }

        const platformList = platformsIndex !== -1 && values[platformsIndex]
          ? values[platformsIndex].split('|').map(p => p.trim()).filter(p => p)
          : selectedPlatforms

        const scheduleTime = scheduleIndex !== -1 ? values[scheduleIndex] : ''

        posts.push({
          id: `bulk-${Date.now()}-${i}`,
          content,
          platforms: platformList,
          scheduledDateTime: scheduleTime,
          status: 'draft',
          charCount: content.length
        })
      }

      console.log('Parsed posts:', posts)
      setBulkPosts(posts)
      toast.success(`Imported ${posts.length} posts from CSV`)
    } catch (error) {
      console.error('CSV parsing error:', error)
      toast.error('Failed to parse CSV file: ' + error)
    }
  }

  // Generate schedule times automatically
  const generateScheduleTimes = () => {
    if (!defaultScheduleTime) {
      toast.error('Please set a start time for scheduling')
      return
    }

    const startTime = new Date(`${new Date().toISOString().split('T')[0]}T${defaultScheduleTime}`)
    
    setBulkPosts(prev => prev.map((post, index) => ({
      ...post,
      scheduledDateTime: new Date(startTime.getTime() + (index * schedulingInterval * 60 * 1000))
        .toISOString().slice(0, 16)
    })))

    toast.success('Schedule times generated for all posts')
  }

  // Process all posts for scheduling
  const processBulkScheduling = async () => {
    setIsProcessing(true)
    
    try {
      const results = await Promise.allSettled(
        bulkPosts.map(async (post) => {
          if (!post.scheduledDateTime) {
            throw new Error('Schedule time is required')
          }

          const response = await fetch('/api/posts/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: post.content,
              platforms: post.platforms,
              scheduledFor: new Date(post.scheduledDateTime).toISOString(),
              mediaUrls: []
            })
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(error)
          }

          return await response.json()
        })
      )

      // Update post statuses based on results
      setBulkPosts(prev => prev.map((post, index) => {
        const result = results[index]
        if (result.status === 'fulfilled') {
          return { ...post, status: 'scheduled' as const }
        } else {
          return { 
            ...post, 
            status: 'error' as const, 
            error: result.reason.message 
          }
        }
      }))

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const errorCount = results.length - successCount

      if (successCount > 0) {
        toast.success(`Successfully scheduled ${successCount} posts`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} posts failed to schedule`)
      }

    } catch (error) {
      console.error('Bulk scheduling error:', error)
      toast.error('Failed to process bulk scheduling')
    } finally {
      setIsProcessing(false)
    }
  }

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = 'content,platforms,schedule_time\n"Your post content here","facebook|bluesky","2024-01-01T10:00"\n"Another post","twitter|linkedin","2024-01-01T11:00"'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-posts-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: BulkPost['status']) => {
    switch (status) {
      case 'scheduled': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: BulkPost['status']) => {
    switch (status) {
      case 'scheduled': return 'text-green-700 bg-green-50 border-green-200'
      case 'error': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload Posts</span>
              </CardTitle>
              <CardDescription>
                Upload a CSV file with your post content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csvFile">CSV File</Label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Bulk upload is perfect for text posts. Add images/videos individually after upload.
                </p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Posts Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Posts Preview ({bulkPosts.length})</CardTitle>
                <CardDescription>
                  Review and edit your posts before scheduling
                </CardDescription>
              </div>
              
              {bulkPosts.length > 0 && (
                <Button
                  onClick={processBulkScheduling}
                  disabled={isProcessing || bulkPosts.every(p => !p.scheduledDateTime)}
                >
                  {isProcessing ? 'Processing...' : 'Schedule All Posts'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {bulkPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Upload className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm mb-2">No posts uploaded yet</p>
                  <p className="text-xs">Upload a CSV file to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {bulkPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className={cn(
                        'border rounded-lg p-4 space-y-3',
                        getStatusColor(post.status)
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(post.status)}
                          <span className="font-medium text-sm">Post #{index + 1}</span>
                          <span className="text-xs text-gray-500">
                            {post.charCount} characters
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPost(post)
                              setEditModalOpen(true)
                            }}
                            title="Edit post content and add media"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBulkPosts(prev => prev.filter(p => p.id !== post.id))
                            }}
                            title="Remove post"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="line-clamp-3">{post.content}</p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {post.platforms.map(platformId => {
                          const platform = platforms.find(p => p.id === platformId)
                          return platform ? (
                            <span
                              key={platformId}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-gray-100 text-xs"
                            >
                              <span>{platform.icon}</span>
                              <span>{platform.name}</span>
                            </span>
                          ) : null
                        })}
                      </div>

                      {post.scheduledDateTime && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(post.scheduledDateTime).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {post.error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          {post.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Default Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Default Settings</CardTitle>
              <CardDescription>
                These settings apply to posts that don&apos;t specify platforms in the CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Platforms</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => {
                        setSelectedPlatforms(prev =>
                          prev.includes(platform.id)
                            ? prev.filter(p => p !== platform.id)
                            : [...prev, platform.id]
                        )
                      }}
                      className={cn(
                        'flex items-center space-x-2 p-2 rounded-lg border text-sm transition-colors',
                        selectedPlatforms.includes(platform.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <span className="truncate">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={defaultScheduleTime}
                  onChange={(e) => setDefaultScheduleTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="interval">Interval (minutes)</Label>
                <input
                  id="interval"
                  type="number"
                  min="5"
                  max="1440"
                  value={schedulingInterval}
                  onChange={(e) => setSchedulingInterval(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <Button 
                onClick={generateScheduleTimes}
                disabled={!defaultScheduleTime || bulkPosts.length === 0}
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Generate Schedule
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="lg:col-span-1">
          {/* Instructions */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Instructions & Tips</span>
              </CardTitle>
              <CardDescription>
                Everything you need to know about bulk uploading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  <span className="text-lg mr-2">📊</span>
                  Best CSV Editors
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-900 min-w-0 flex-1">
                      <div className="font-semibold">Excel / Google Sheets</div>
                      <div className="text-xs text-blue-700 mt-1">Most user-friendly with visual interface</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-900 min-w-0 flex-1">
                      <div className="font-semibold">LibreOffice Calc</div>
                      <div className="text-xs text-green-700 mt-1">Free alternative to Excel</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900 min-w-0 flex-1">
                      <div className="font-semibold">VS Code</div>
                      <div className="text-xs text-gray-700 mt-1">For developers who prefer code editors</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  <span className="text-lg mr-2">🎯</span>
                  How Platforms Work
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-900 mb-1">CSV Has Platforms Column</div>
                    <div className="text-purple-700 text-xs">
                      Use format: <code className="bg-purple-200 px-1 rounded">facebook|twitter|linkedin</code>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="font-semibold text-orange-900 mb-1">CSV Missing Platforms</div>
                    <div className="text-orange-700 text-xs">
                      Uses Default Platforms selected in the left panel
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="font-semibold text-indigo-900 mb-1">Mix Both Approaches</div>
                    <div className="text-indigo-700 text-xs">
                      Each post can have different platforms - very flexible!
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600">💡</span>
                  <div className="text-xs text-yellow-800">
                    <div className="font-semibold mb-1">Pro Tip:</div>
                    <div>Start with text posts in bulk, then add images/videos individually to your most important posts for better engagement.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <BulkEditModal
        post={editingPost}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={(updatedPost) => {
          setBulkPosts(prev => 
            prev.map(p => p.id === updatedPost.id ? updatedPost : p)
          )
          toast.success('Post updated')
        }}
        availablePlatforms={platforms}
      />
    </>
  )
}