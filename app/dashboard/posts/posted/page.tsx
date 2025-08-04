'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Send,
  ExternalLink,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mockPostedPosts = [
  {
    id: 1,
    title: 'Weekly Tips Thread',
    content: 'Here are 5 tips to improve your productivity this week...',
    platforms: ['twitter', 'instagram'],
    status: 'posted',
    postedAt: '2024-01-20 2:00 PM',
    createdAt: '2024-01-19',
    stats: {
      likes: 234,
      comments: 45,
      shares: 12,
      views: 1850
    }
  },
  {
    id: 2,
    title: 'Industry News Update',
    content: 'Breaking news in the tech industry that affects our market...',
    platforms: ['linkedin', 'facebook'],
    status: 'posted',
    postedAt: '2024-01-18 9:00 AM',
    createdAt: '2024-01-17',
    stats: {
      likes: 156,
      comments: 23,
      shares: 8,
      views: 980
    }
  },
  {
    id: 3,
    title: 'Customer Success Story',
    content: 'Celebrating our client\'s amazing results using our platform...',
    platforms: ['twitter', 'linkedin', 'facebook'],
    status: 'posted',
    postedAt: '2024-01-16 11:30 AM',
    createdAt: '2024-01-15',
    stats: {
      likes: 89,
      comments: 12,
      shares: 15,
      views: 650
    }
  },
  {
    id: 4,
    title: 'Product Feature Highlight',
    content: 'Showcasing our latest feature that helps users save time...',
    platforms: ['instagram', 'tiktok'],
    status: 'posted',
    postedAt: '2024-01-14 3:15 PM',
    createdAt: '2024-01-13',
    stats: {
      likes: 412,
      comments: 67,
      shares: 28,
      views: 3200
    }
  },
]

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📷',
  facebook: 'f',
  linkedin: 'in',
  youtube: '▶',
  tiktok: '♪',
}

export default function PostedPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])

  const filteredPosts = mockPostedPosts.filter(post => {
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const togglePostSelection = (postId: number) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  const toggleAllPosts = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id))
    }
  }

  const getTotalEngagement = (stats: any) => {
    return stats.likes + stats.comments + stats.shares
  }

  const getEngagementRate = (stats: any) => {
    const total = getTotalEngagement(stats)
    return ((total / stats.views) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Posted</h1>
        <p className="text-gray-600 mt-1">View and analyze your published posts</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posted content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold">{filteredPosts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">
                  {filteredPosts.reduce((sum, post) => sum + post.stats.views, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">❤️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold">
                  {filteredPosts.reduce((sum, post) => sum + post.stats.likes, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">💬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Engagement</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    filteredPosts.reduce((sum, post) => sum + getTotalEngagement(post.stats), 0) /
                    filteredPosts.reduce((sum, post) => sum + post.stats.views, 0) * 100
                  )}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <Card className="bg-primary/10 border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-sm font-medium">
              {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Original
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Send className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No posted content found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4">
              <input
                type="checkbox"
                checked={selectedPosts.length === filteredPosts.length}
                onChange={toggleAllPosts}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
            
            {filteredPosts.map(post => {              
              return (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-start p-4 gap-4">
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="mt-1 rounded border-gray-300"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{post.title}</h3>
                            <p className="text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <Send className="h-4 w-4 text-green-500" />
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">
                                  Posted
                                </span>
                              </div>
                              
                              <span className="text-sm text-gray-500">
                                {post.postedAt}
                              </span>
                              
                              <div className="flex gap-1">
                                {post.platforms.map(platform => (
                                  <span
                                    key={platform}
                                    className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs"
                                  >
                                    {platformIcons[platform] || platform[0].toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {/* Performance Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Views</p>
                                <p className="text-lg font-bold">{post.stats.views.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Likes</p>
                                <p className="text-lg font-bold">{post.stats.likes}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Comments</p>
                                <p className="text-lg font-bold">{post.stats.comments}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Shares</p>
                                <p className="text-lg font-bold">{post.stats.shares}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Engagement</p>
                                <p className="text-lg font-bold">{getEngagementRate(post.stats)}%</p>
                              </div>
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
