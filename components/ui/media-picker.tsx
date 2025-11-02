'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Image,
  Upload,
  Search,
  Check,
  Loader2,
  Grid,
  List,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { extractVideoThumbnail, isVideoFile } from '@/lib/utils/video-thumbnail'

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
  created_at: string
}

interface MediaPickerProps {
  onSelect: (urls: string[]) => void
  multiple?: boolean
  accept?: string
  trigger?: React.ReactNode
  selectedUrls?: string[]
}

export function MediaPicker({
  onSelect,
  multiple = true,
  accept = 'image/*,video/*',
  trigger,
  selectedUrls = []
}: MediaPickerProps) {
  const [open, setOpen] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(selectedUrls))
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploading, setUploading] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadMedia()
    }
  }, [open])

  useEffect(() => {
    setSelectedItems(new Set(selectedUrls))
  }, [selectedUrls])

  const loadMedia = async () => {
    setLoading(true)
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

  const handleFileUpload = async (files: File[]) => {
    setUploading(true)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      toast.error('Please sign in to upload files')
      setUploading(false)
      return
    }

    try {
      const uploadedUrls: string[] = []
      
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast.error(`${file.name} is not a valid image or video file`)
          continue
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName)

        // Get image dimensions if it's an image
        let dimensions: { width: number | null; height: number | null } = { width: null, height: null }
        let thumbnailUrl: string | null = null

        if (file.type.startsWith('image/')) {
          dimensions = await getImageDimensions(file)
        } else if (isVideoFile(file)) {
          // Extract video thumbnail
          const thumbnailFile = await extractVideoThumbnail(file)
          if (thumbnailFile) {
            // Upload thumbnail
            const thumbFileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}_thumb.jpg`
            const { error: thumbError } = await supabase.storage
              .from('post-media')
              .upload(thumbFileName, thumbnailFile)

            if (!thumbError) {
              const { data: { publicUrl: thumbUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(thumbFileName)
              thumbnailUrl = thumbUrl
            }
          }
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
            thumbnail_url: thumbnailUrl,
            width: dimensions.width,
            height: dimensions.height,
            tags: []
          })

        if (dbError) throw dbError

        uploadedUrls.push(publicUrl)
        toast.success(`${file.name} uploaded successfully`)
      }

      // Reload media
      await loadMedia()
      
      // Auto-select uploaded files
      if (uploadedUrls.length > 0) {
        if (multiple) {
          setSelectedItems(new Set([...Array.from(selectedItems), ...uploadedUrls]))
        } else {
          setSelectedItems(new Set([uploadedUrls[0]]))
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Failed to upload files')
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

  const handleSelect = (url: string) => {
    const newSelection = new Set(selectedItems)
    if (multiple) {
      if (newSelection.has(url)) {
        newSelection.delete(url)
      } else {
        newSelection.add(url)
      }
    } else {
      newSelection.clear()
      newSelection.add(url)
    }
    setSelectedItems(newSelection)
  }

  const handleConfirm = () => {
    onSelect(Array.from(selectedItems))
    setOpen(false)
  }

  const filteredMedia = media.filter(item => {
    if (!searchTerm) return true
    return item.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Image className="h-4 w-4 mr-2" />
            Select from Library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Select media from your library or upload new files
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => document.getElementById('media-picker-upload')?.click()}
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
              id="media-picker-upload"
              type="file"
              multiple={multiple}
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length > 0) {
                  handleFileUpload(files)
                }
              }}
            />
          </div>

          {/* Media Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">
                  No media found. Upload some files to get started.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-4 gap-4">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                      selectedItems.has(item.url)
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleSelect(item.url)}
                  >
                    <div className="aspect-square bg-gray-100">
                      {item.mime_type.startsWith('image/') ? (
                        <img
                          src={item.url}
                          alt={item.original_name}
                          className="w-full h-full object-cover"
                        />
                      ) : item.thumbnail_url ? (
                        <div className="relative w-full h-full">
                          <img
                            src={item.thumbnail_url}
                            alt={item.original_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/60 rounded-full p-2">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            <p className="text-xs text-gray-500">Video</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedItems.has(item.url) && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-primary text-white rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
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
                      "flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer",
                      selectedItems.has(item.url) && "bg-primary/5"
                    )}
                    onClick={() => handleSelect(item.url)}
                  >
                    <div className="flex-shrink-0 relative">
                      {item.mime_type.startsWith('image/') ? (
                        <img
                          src={item.url}
                          alt={item.original_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : item.thumbnail_url ? (
                        <>
                          <img
                            src={item.thumbnail_url}
                            alt={item.original_name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(item.file_size)} • {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {selectedItems.has(item.url) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={selectedItems.size === 0}>
                Select
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}