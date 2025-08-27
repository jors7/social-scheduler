'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, Video, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { validateVideoFile, formatFileSize } from '@/lib/youtube/upload'

interface YouTubeUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: (videoUrl: string, videoId: string) => void
}

const YOUTUBE_CATEGORIES = [
  { id: '1', name: 'Film & Animation' },
  { id: '2', name: 'Autos & Vehicles' },
  { id: '10', name: 'Music' },
  { id: '15', name: 'Pets & Animals' },
  { id: '17', name: 'Sports' },
  { id: '19', name: 'Travel & Events' },
  { id: '20', name: 'Gaming' },
  { id: '22', name: 'People & Blogs' },
  { id: '23', name: 'Comedy' },
  { id: '24', name: 'Entertainment' },
  { id: '25', name: 'News & Politics' },
  { id: '26', name: 'Howto & Style' },
  { id: '27', name: 'Education' },
  { id: '28', name: 'Science & Technology' },
];

export function YouTubeUploadDialog({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: YouTubeUploadDialogProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [categoryId, setCategoryId] = useState('22') // Default: People & Blogs
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'public' | 'unlisted'>('private')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateVideoFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setVideoFile(file)
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setTitle(nameWithoutExt)
    }
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Thumbnail must be an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Thumbnail must be less than 2MB')
      return
    }

    setThumbnailFile(file)
  }

  const handleUpload = async () => {
    if (!videoFile || !title.trim()) {
      toast.error('Please select a video and enter a title')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('video', videoFile)
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }
      formData.append('title', title)
      formData.append('description', description)
      formData.append('tags', tags)
      formData.append('categoryId', categoryId)
      formData.append('privacyStatus', privacyStatus)

      // Start upload with progress tracking
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(progress)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            toast.success('Video uploaded to YouTube successfully!')
            onUploadComplete(response.video.url, response.video.id)
            onOpenChange(false)
            resetForm()
          } else {
            toast.error(response.error || 'Upload failed')
          }
        } else {
          const error = JSON.parse(xhr.responseText)
          toast.error(error.error || 'Upload failed')
        }
        setIsUploading(false)
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        toast.error('Upload failed. Please try again.')
        setIsUploading(false)
      })

      // Send request
      xhr.open('POST', '/api/media/upload/youtube')
      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload video')
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setVideoFile(null)
    setThumbnailFile(null)
    setTitle('')
    setDescription('')
    setTags('')
    setCategoryId('22')
    setPrivacyStatus('private')
    setUploadProgress(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-600" />
            Upload Video to YouTube
          </DialogTitle>
          <DialogDescription>
            Upload a video directly to your YouTube channel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video File */}
          <div className="space-y-2">
            <Label htmlFor="video">Video File *</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              {videoFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">{videoFile.name}</span>
                    <span className="text-sm text-gray-500">
                      ({formatFileSize(videoFile.size)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVideoFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label htmlFor="video-input" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to select video or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">
                      MP4, MOV, AVI, WMV, FLV, WebM (max 5GB)
                    </span>
                  </div>
                  <input
                    id="video-input"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoSelect}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              maxLength={100}
              disabled={isUploading}
            />
            <span className="text-xs text-gray-500">{title.length}/100</span>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={4}
              maxLength={5000}
              disabled={isUploading}
            />
            <span className="text-xs text-gray-500">{description.length}/5000</span>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              disabled={isUploading}
            />
            <span className="text-xs text-gray-500">
              Separate tags with commas (e.g., tutorial, coding, javascript)
            </span>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={isUploading}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YOUTUBE_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy Status */}
          <div className="space-y-2">
            <Label htmlFor="privacy">Privacy</Label>
            <Select 
              value={privacyStatus} 
              onValueChange={(value) => setPrivacyStatus(value as typeof privacyStatus)}
              disabled={isUploading}
            >
              <SelectTrigger id="privacy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              {thumbnailFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">{thumbnailFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setThumbnailFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label htmlFor="thumbnail-input" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Image className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to select thumbnail</span>
                    <span className="text-xs text-gray-500">JPG, PNG (max 2MB)</span>
                  </div>
                  <input
                    id="thumbnail-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailSelect}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!videoFile || !title.trim() || isUploading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload to YouTube
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}