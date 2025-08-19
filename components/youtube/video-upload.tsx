'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Video, Upload, X, AlertCircle, FileVideo } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoUploadProps {
  videoFile: File | null
  thumbnailFile: File | null
  onVideoChange: (file: File | null) => void
  onThumbnailChange: (file: File | null) => void
  className?: string
}

export default function VideoUpload({
  videoFile,
  thumbnailFile,
  onVideoChange,
  onThumbnailChange,
  className
}: VideoUploadProps) {
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (file) {
      // Check file size (YouTube limit is 128GB but we'll set a reasonable limit)
      const maxSize = 5 * 1024 * 1024 * 1024 // 5GB
      if (file.size > maxSize) {
        alert('Video file size must be less than 5GB')
        return
      }

      // Check file type
      const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid video file (MP4, MOV, AVI, WMV, or WebM)')
        return
      }

      onVideoChange(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (file) {
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
        return
      }

      // Check file size (YouTube limit is 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        alert('Thumbnail file size must be less than 2MB')
        return
      }

      onThumbnailChange(file)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setThumbnailPreview(url)
    }
  }

  const removeVideo = () => {
    onVideoChange(null)
    setVideoPreview(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const removeThumbnail = () => {
    onThumbnailChange(null)
    setThumbnailPreview(null)
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Video Upload */}
      <div className="space-y-2">
        <Label>Video File *</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
          {!videoFile ? (
            <div className="text-center">
              <Video className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Video
                </Button>
                <input
                  ref={videoInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleVideoChange}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                MP4, MOV, AVI, WMV, or WebM up to 5GB
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileVideo className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-medium text-sm">{videoFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(videoFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {videoPreview && (
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-64 rounded"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Upload */}
      <div className="space-y-2">
        <Label>Thumbnail (Optional)</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
          {!thumbnailFile ? (
            <div className="text-center">
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Thumbnail
                </Button>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                JPEG, PNG, GIF, or WebP up to 2MB (1280x720 recommended)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {thumbnailPreview && (
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="h-16 w-24 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium text-sm">{thumbnailFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(thumbnailFile.size)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeThumbnail}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Video upload to YouTube requires the video file to be processed. 
          Large files may take several minutes to upload and process. 
          YouTube will notify you when your video is ready.
        </AlertDescription>
      </Alert>
    </div>
  )
}