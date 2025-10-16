'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'

interface VideoMetadataProps {
  title: string
  description: string
  tags: string[]
  categoryId: string
  privacyStatus: 'private' | 'unlisted' | 'public'
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onTagsChange: (tags: string[]) => void
  onCategoryChange: (categoryId: string) => void
  onPrivacyChange: (privacy: 'private' | 'unlisted' | 'public') => void
}

// YouTube video categories
const videoCategories = [
  { id: '1', name: 'Film & Animation' },
  { id: '2', name: 'Autos & Vehicles' },
  { id: '10', name: 'Music' },
  { id: '15', name: 'Pets & Animals' },
  { id: '17', name: 'Sports' },
  { id: '18', name: 'Short Movies' },
  { id: '19', name: 'Travel & Events' },
  { id: '20', name: 'Gaming' },
  { id: '21', name: 'Videoblogging' },
  { id: '22', name: 'People & Blogs' },
  { id: '23', name: 'Comedy' },
  { id: '24', name: 'Entertainment' },
  { id: '25', name: 'News & Politics' },
  { id: '26', name: 'Howto & Style' },
  { id: '27', name: 'Education' },
  { id: '28', name: 'Science & Technology' },
  { id: '29', name: 'Nonprofits & Activism' },
  { id: '30', name: 'Movies' },
  { id: '31', name: 'Anime/Animation' },
  { id: '32', name: 'Action/Adventure' },
  { id: '33', name: 'Classics' },
  { id: '34', name: 'Comedy' },
  { id: '35', name: 'Documentary' },
  { id: '36', name: 'Drama' },
  { id: '37', name: 'Family' },
  { id: '38', name: 'Foreign' },
  { id: '39', name: 'Horror' },
  { id: '40', name: 'Sci-Fi/Fantasy' },
  { id: '41', name: 'Thriller' },
  { id: '42', name: 'Shorts' },
  { id: '43', name: 'Shows' },
  { id: '44', name: 'Trailers' },
]

export default function VideoMetadata({
  title,
  description,
  tags,
  categoryId,
  privacyStatus,
  onTitleChange,
  onDescriptionChange,
  onTagsChange,
  onCategoryChange,
  onPrivacyChange,
}: VideoMetadataProps) {
  const [newTag, setNewTag] = useState('')

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="space-y-6">
      {/* Video Title */}
      <div className="space-y-2">
        <Label htmlFor="video-title">Video Title *</Label>
        <Input
          id="video-title"
          placeholder="Enter your video title (max 100 characters)"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={100}
        />
        <p className="text-xs text-gray-500">
          {title.length}/100 characters
        </p>
      </div>

      {/* Video Description */}
      <div className="space-y-2">
        <Label htmlFor="video-description">Description</Label>
        <Textarea
          id="video-description"
          placeholder="Describe your video (max 5000 characters)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={5000}
          rows={6}
        />
        <p className="text-xs text-gray-500">
          {description.length}/5000 characters
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="video-tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="video-tags"
            placeholder="Add tags (press Enter)"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-2 py-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Tags help viewers find your video. Use up to 500 characters total.
        </p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="video-category">Category</Label>
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger id="video-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {videoCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Privacy Status */}
      <div className="space-y-2">
        <Label htmlFor="video-privacy">Privacy</Label>
        <Select value={privacyStatus} onValueChange={onPrivacyChange}>
          <SelectTrigger id="video-privacy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">
              <div>
                <div className="font-medium">Private</div>
                <div className="text-xs text-gray-500">Only you can view</div>
              </div>
            </SelectItem>
            <SelectItem value="unlisted">
              <div>
                <div className="font-medium">Unlisted</div>
                <div className="text-xs text-gray-500">Anyone with the link can view</div>
              </div>
            </SelectItem>
            <SelectItem value="public">
              <div>
                <div className="font-medium">Public</div>
                <div className="text-xs text-gray-500">Everyone can view</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}