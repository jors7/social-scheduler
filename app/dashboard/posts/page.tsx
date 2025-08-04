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
  Clock,
  Send,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mockPosts = [
  {
    id: 1,
    title: 'Product Launch Announcement',
    content: 'Excited to announce our latest product that will revolutionize...',
    platforms: ['twitter', 'facebook', 'linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-01-25 10:00 AM',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    title: 'Weekly Tips Thread',
    content: 'Here are 5 tips to improve your productivity this week...',
    platforms: ['twitter', 'instagram'],
    status: 'posted',
    postedAt: '2024-01-20 2:00 PM',
    createdAt: '2024-01-19',
    stats: {
      likes: 234,
      comments: 45,
      shares: 12
    }
  },
  {
    id: 3,
    title: 'Customer Success Story',
    content: 'Read how Company X increased their revenue by 150% using...',
    platforms: ['linkedin'],
    status: 'draft',
    createdAt: '2024-01-18',
  },
  {
    id: 4,
    title: 'Behind the Scenes',
    content: 'Take a look at how we build our products from idea to launch...',
    platforms: ['instagram', 'tiktok', 'youtube'],
    status: 'scheduled',
    scheduledFor: '2024-01-28 4:00 PM',
    createdAt: '2024-01-17',
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

const tabs = [
  { id: 'all', label: 'All Posts', icon: FileText },
  { id: 'scheduled', label: 'Scheduled', icon: Clock },
  { id: 'posted', label: 'Posted', icon: Send },
  { id: 'draft', label: 'Drafts', icon: Edit },
]

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])

  const filteredPosts = mockPosts.filter(post => {
    if (activeTab !== 'all' && post.status !== activeTab) return false
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700'
      case 'posted': return 'bg-green-100 text-green-700'
      case 'draft': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return Clock
      case 'posted': return Send
      case 'draft': return FileText
      default: return FileText
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Posts</h1>
        <p className="text-gray-600 mt-1">Manage all your social media posts</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posts..."
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No posts found</p>
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
              const StatusIcon = getStatusIcon(post.status)
              
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
                          <div>
                            <h3 className="font-semibold text-lg">{post.title}</h3>
                            <p className="text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4 text-gray-400" />
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded-full font-medium",
                                  getStatusColor(post.status)
                                )}>
                                  {post.status}
                                </span>
                              </div>
                              
                              <span className="text-sm text-gray-500">
                                {post.scheduledFor || post.postedAt || `Created ${post.createdAt}`}
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
                            
                            {post.stats && (
                              <div className="flex gap-4 mt-3 text-sm text-gray-600">
                                <span>{post.stats.likes} likes</span>
                                <span>{post.stats.comments} comments</span>
                                <span>{post.stats.shares} shares</span>
                              </div>
                            )}
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
