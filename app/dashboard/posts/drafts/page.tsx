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
  FileText,
  Send,
  Calendar,
  Save,
  Clock
} from 'lucide-react'

const mockDraftPosts = [
  {
    id: 1,
    title: 'Customer Success Story',
    content: 'Read how Company X increased their revenue by 150% using our platform...',
    platforms: ['linkedin'],
    status: 'draft',
    createdAt: '2024-01-18',
    lastModified: '2024-01-20 3:30 PM',
    wordCount: 145,
    isComplete: false
  },
  {
    id: 2,
    title: 'Upcoming Product Launch',
    content: 'We\'re excited to announce our biggest product launch yet! Coming soon...',
    platforms: ['twitter', 'facebook', 'instagram'],
    status: 'draft',
    createdAt: '2024-01-17',
    lastModified: '2024-01-19 10:15 AM',
    wordCount: 89,
    isComplete: true
  },
  {
    id: 3,
    title: 'Industry Insights Blog Promotion',
    content: 'Check out our latest blog post about industry trends and what they mean...',
    platforms: ['linkedin', 'twitter'],
    status: 'draft',
    createdAt: '2024-01-16',
    lastModified: '2024-01-16 4:45 PM',
    wordCount: 234,
    isComplete: true
  },
  {
    id: 4,
    title: '',
    content: 'Just started working on this new post about our team culture and values...',
    platforms: ['instagram'],
    status: 'draft',
    createdAt: '2024-01-15',
    lastModified: '2024-01-15 2:20 PM',
    wordCount: 67,
    isComplete: false
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

export default function DraftPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])
  const [sortBy, setSortBy] = useState('modified') // 'modified', 'created', 'title'

  const filteredPosts = mockDraftPosts
    .filter(post => {
      if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'modified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      }
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

  const completeDrafts = filteredPosts.filter(post => post.isComplete).length
  const incompleteDrafts = filteredPosts.filter(post => !post.isComplete).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Drafts</h1>
        <p className="text-gray-600 mt-1">Continue working on your saved drafts</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search drafts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="modified">Sort by Last Modified</option>
          <option value="created">Sort by Created Date</option>
          <option value="title">Sort by Title</option>
        </select>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-gray-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Drafts</p>
                <p className="text-2xl font-bold">{filteredPosts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ready to Publish</p>
                <p className="text-2xl font-bold">{completeDrafts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Edit className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{incompleteDrafts}</p>
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
              {selectedPosts.length} draft{selectedPosts.length > 1 ? 's' : ''} selected
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
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button size="sm">
                <Send className="mr-2 h-4 w-4" />
                Publish Now
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
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No drafts found</p>
              <p className="text-sm text-gray-400">Start creating content to see your drafts here</p>
              <Button className="mt-4" onClick={() => window.location.href = '/dashboard/create/new'}>
                <Edit className="mr-2 h-4 w-4" />
                Create New Post
              </Button>
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
                <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                {post.title || <span className="text-gray-400 italic">Untitled Draft</span>}
                              </h3>
                              {post.isComplete && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <span className="mr-1">✓</span>
                                  Ready
                                </span>
                              )}
                              {!post.isComplete && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  <Edit className="mr-1 h-3 w-3" />
                                  In Progress
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                                  Draft
                                </span>
                              </div>
                              
                              <span className="text-sm text-gray-500">
                                <Clock className="inline h-3 w-3 mr-1" />
                                Modified {post.lastModified}
                              </span>
                              
                              <span className="text-sm text-gray-500">
                                {post.wordCount} words
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
                            
                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline" className="text-xs">
                                <Edit className="mr-1 h-3 w-3" />
                                Continue Editing
                              </Button>
                              {post.isComplete && (
                                <>
                                  <Button size="sm" variant="outline" className="text-xs">
                                    <Calendar className="mr-1 h-3 w-3" />
                                    Schedule
                                  </Button>
                                  <Button size="sm" className="text-xs">
                                    <Send className="mr-1 h-3 w-3" />
                                    Publish Now
                                  </Button>
                                </>
                              )}
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}