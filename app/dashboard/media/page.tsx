'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { SubscriptionGateWrapper as SubscriptionGate } from '@/components/subscription/subscription-gate-wrapper'
import {
  Upload,
  Search,
  Filter,
  Trash2,
  Download,
  Copy,
  Image as ImageIcon,
  Video,
  FileText,
  MoreVertical,
  Grid,
  List,
  Calendar,
  HardDrive,
  X,
  Check,
  Loader2,
  Eye,
  Tag
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface MediaItem {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  url: string
  thumbnail_url?: string
  width?: number
  height?: number
  duration?: number
  metadata?: any
  tags: string[]
  used_in_posts: number
  last_used_at?: string
  created_at: string
}

interface MediaStats {
  total_files: number
  total_size_mb: number
  images_count: number
  videos_count: number
  unused_count: number
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([])
  const [stats, setStats] = useState<MediaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'images' | 'videos' | 'unused'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPreview, setShowPreview] = useState<MediaItem | null>(null)
  const [dragActive, setDragActive] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadMedia()
    loadStats()
  }, [])

  useEffect(() => {
    filterMedia()
  }, [media, searchTerm, filterType])

  const loadMedia = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMedia(data || [])
    } catch (error) {
      console.error('Error loading media:', error)
      toast.error('Failed to load media library')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      const { data, error } = await supabase
        .rpc('get_media_stats', { user_uuid: user.id })

      if (error) throw error

      if (data && data.length > 0) {
        setStats(data[0])
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const filterMedia = () => {
    let filtered = [...media]

    // Apply type filter
    if (filterType === 'images') {
      filtered = filtered.filter(item => item.mime_type.startsWith('image/'))
    } else if (filterType === 'videos') {
      filtered = filtered.filter(item => item.mime_type.startsWith('video/'))
    } else if (filterType === 'unused') {
      filtered = filtered.filter(item => item.used_in_posts === 0)
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.original_name.toLowerCase().includes(term) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    setFilteredMedia(filtered)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFileUpload(files)
    }
  }

  const handleFileUpload = async (files: File[]) => {
    setUploading(true)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      toast.error('Please sign in to upload files')
      setUploading(false)
      return
    }

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast.error(`${file.name} is not a valid image or video file`)
          continue
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024 // 50MB
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large. Maximum size is 50MB`)
          continue
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        console.log('Uploading file:', fileName)
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          // Check if it's a bucket error
          if (uploadError.message?.includes('bucket')) {
            toast.error('Storage bucket not configured. Please run the storage setup SQL in Supabase.')
          } else if (uploadError.message?.includes('row level security')) {
            toast.error('Storage permissions error. Please check storage policies.')
          } else {
            toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName)

        console.log('File uploaded, URL:', publicUrl)

        // Get image dimensions if it's an image
        let dimensions: { width: number | null; height: number | null } = { width: null, height: null }
        if (file.type.startsWith('image/')) {
          dimensions = await getImageDimensions(file)
        }

        // Save to media library
        const { error: dbError } = await supabase
          .from('media_library')
          .insert({
            user_id: user.id,
            filename: fileName,
            original_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            url: publicUrl,
            width: dimensions.width,
            height: dimensions.height,
            tags: []
          })

        if (dbError) {
          console.error('Database error:', dbError)
          // Try to delete the uploaded file since we couldn't save it to DB
          await supabase.storage.from('post-media').remove([fileName])
          toast.error(`Failed to save ${file.name} to library: ${dbError.message}`)
          continue
        }

        toast.success(`${file.name} uploaded successfully`)
      }

      // Reload media and stats
      await loadMedia()
      await loadStats()
    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error(error.message || 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const getImageDimensions = (file: File): Promise<{ width: number | null; height: number | null }> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({ width: null, height: null })
        return
      }
      const img = document.createElement('img')
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        resolve({ width: null, height: null })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleDelete = async () => {
    const itemsToDelete = Array.from(selectedItems)
    if (itemsToDelete.length === 0) return

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError

      // Delete from storage and database
      for (const itemId of itemsToDelete) {
        const item = media.find(m => m.id === itemId)
        if (!item) continue

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('post-media')
          .remove([item.filename])

        if (storageError) console.error('Storage deletion error:', storageError)

        // Delete from database
        const { error: dbError } = await supabase
          .from('media_library')
          .delete()
          .eq('id', itemId)

        if (dbError) throw dbError
      }

      toast.success(`${itemsToDelete.length} item(s) deleted`)
      setSelectedItems(new Set())
      setShowDeleteDialog(false)
      await loadMedia()
      await loadStats()
    } catch (error) {
      console.error('Error deleting media:', error)
      toast.error('Failed to delete media')
    }
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copied to clipboard')
  }

  const downloadFile = async (item: MediaItem) => {
    try {
      const response = await fetch(item.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.original_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <SubscriptionGate feature="media_library">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-gray-600 mt-1">Manage your uploaded images and videos</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                    <p className="text-2xl font-bold">{stats.total_files}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold">{stats.total_size_mb} MB</p>
                  </div>
                  <HardDrive className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Images</p>
                    <p className="text-2xl font-bold">{stats.images_count}</p>
                  </div>
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Videos</p>
                    <p className="text-2xl font-bold">{stats.videos_count}</p>
                  </div>
                  <Video className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or tag..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterType('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'images' ? 'default' : 'outline'}
                  onClick={() => setFilterType('images')}
                  size="sm"
                >
                  Images
                </Button>
                <Button
                  variant={filterType === 'videos' ? 'default' : 'outline'}
                  onClick={() => setFilterType('videos')}
                  size="sm"
                >
                  Videos
                </Button>
                <Button
                  variant={filterType === 'unused' ? 'default' : 'outline'}
                  onClick={() => setFilterType('unused')}
                  size="sm"
                >
                  Unused
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>
                {selectedItems.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedItems.size})
                  </Button>
                )}
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) {
                      handleFileUpload(files)
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Grid/List */}
        <div
          className={cn(
            "min-h-[400px] border-2 border-dashed rounded-lg transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-gray-200"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No media found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Drag and drop files here or click upload'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                    selectedItems.has(item.id) ? "border-primary ring-2 ring-primary" : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => {
                    const newSelection = new Set(selectedItems)
                    if (newSelection.has(item.id)) {
                      newSelection.delete(item.id)
                    } else {
                      newSelection.add(item.id)
                    }
                    setSelectedItems(newSelection)
                  }}
                >
                  <div className="aspect-square bg-gray-100">
                    {item.mime_type.startsWith('image/') ? (
                      <img
                        src={item.url}
                        alt={item.original_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowPreview(item)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(item.url)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadFile(item)
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {selectedItems.has(item.id) && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                  {item.used_in_posts > 0 && (
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      {item.used_in_posts} posts
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer",
                    selectedItems.has(item.id) && "bg-primary/5"
                  )}
                  onClick={() => {
                    const newSelection = new Set(selectedItems)
                    if (newSelection.has(item.id)) {
                      newSelection.delete(item.id)
                    } else {
                      newSelection.add(item.id)
                    }
                    setSelectedItems(newSelection)
                  }}
                >
                  <div className="flex-shrink-0">
                    {item.mime_type.startsWith('image/') ? (
                      <img
                        src={item.url}
                        alt={item.original_name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.original_name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatFileSize(item.file_size)}</span>
                      {item.width && item.height && (
                        <span>{item.width} × {item.height}</span>
                      )}
                      <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                      {item.used_in_posts > 0 && (
                        <Badge variant="secondary">{item.used_in_posts} posts</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(item.url)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadFile(item)
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowPreview(item)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(item.url)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadFile(item)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedItems(new Set([item.id]))
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Media</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedItems.size} item(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        {showPreview && (
          <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{showPreview.original_name}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{formatFileSize(showPreview.file_size)}</span>
                    {showPreview.width && showPreview.height && (
                      <span>{showPreview.width} × {showPreview.height}</span>
                    )}
                    <span>{format(new Date(showPreview.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                {showPreview.mime_type.startsWith('image/') ? (
                  <img
                    src={showPreview.url}
                    alt={showPreview.original_name}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <video
                    src={showPreview.url}
                    controls
                    className="w-full rounded-lg"
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => copyToClipboard(showPreview.url)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button onClick={() => downloadFile(showPreview)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SubscriptionGate>
  )
}