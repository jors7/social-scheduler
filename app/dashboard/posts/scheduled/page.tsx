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
  Calendar,
  Play,
  Pause,
  Eye,
  Send
} from 'lucide-react'

const mockScheduledPosts = [
  {
    id: 1,
    title: 'Product Launch Announcement',
    content: 'Excited to announce our latest product that will revolutionize how you manage social media...',
    platforms: ['twitter', 'facebook', 'linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-08-05 10:00 AM',
    timeUntilPost: '2 days, 14 hours',
    createdAt: '2024-08-01',
    isActive: true
  },
  {
    id: 2,
    title: 'Behind the Scenes Video',
    content: 'Take a look at how we build our products from idea to launch. Our team works tirelessly...',
    platforms: ['instagram', 'tiktok', 'youtube'],
    status: 'scheduled',
    scheduledFor: '2024-08-04 4:00 PM',
    timeUntilPost: '1 day, 6 hours',
    createdAt: '2024-07-30',
    isActive: true
  },
  {
    id: 3,
    title: 'Weekly Industry Report',
    content: 'This week in tech: AI advancements, new social media features, and market trends that matter...',
    platforms: ['linkedin', 'twitter'],
    status: 'scheduled',
    scheduledFor: '2024-08-06 9:00 AM',
    timeUntilPost: '3 days, 11 hours',
    createdAt: '2024-08-02',
    isActive: true
  },
  {
    id: 4,
    title: 'Customer Spotlight',
    content: 'Meet Sarah, one of our amazing customers who increased her engagement by 300% using our platform...',
    platforms: ['instagram', 'facebook'],
    status: 'scheduled',
    scheduledFor: '2024-08-07 2:30 PM',
    timeUntilPost: '4 days, 4 hours',
    createdAt: '2024-08-01',
    isActive: false
  },
  {
    id: 5,
    title: 'Quick Tip Tuesday',
    content: '💡 Pro tip: The best time to post on LinkedIn is between 8-10 AM on weekdays. Try it and see the difference!',
    platforms: ['linkedin'],
    status: 'scheduled',
    scheduledFor: '2024-08-06 8:30 AM',
    timeUntilPost: '3 days, 10 hours',
    createdAt: '2024-08-03',
    isActive: true
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

export default function ScheduledPostsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<number[]>([])
  const [filterStatus, setFilterStatus] = useState('all') // all, active, paused

  const filteredPosts = mockScheduledPosts.filter(post => {
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterStatus === 'active' && !post.isActive) return false
    if (filterStatus === 'paused' && post.isActive) return false
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

  const activePosts = filteredPosts.filter(post => post.isActive).length
  const pausedPosts = filteredPosts.filter(post => !post.isActive).length

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? Clock : Pause
  }

  const getUrgencyColor = (timeUntil: string) => {
    if (timeUntil.includes('hour') && !timeUntil.includes('day')) {
      return 'text-red-600 font-medium'
    } else if (timeUntil.includes('1 day')) {
      return 'text-orange-600 font-medium'
    }
    return 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scheduled Posts</h1>
        <p className="text-gray-600 mt-1">Manage your upcoming social media posts</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search scheduled posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Posts</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          More Filters
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
                <p className="text-2xl font-bold">{filteredPosts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Play className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold">{activePosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Pause className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paused</p>
                <p className="text-2xl font-bold">{pausedPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold">3</p>
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
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button variant="outline" size="sm">
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No scheduled posts found</p>
              <p className="text-sm text-gray-400">Schedule your first post to see it here</p>
              <Button className="mt-4" onClick={() => window.location.href = '/dashboard/create/new'}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule a Post
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
              const StatusIcon = getStatusIcon(post.isActive)
              
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
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{post.title}</h3>
                              <span className={cn(
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                getStatusColor(post.isActive)
                              )}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {post.isActive ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 mb-3 line-clamp-2">{post.content}</p>
                            
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                  {post.scheduledFor}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className={cn(
                                  "text-sm",
                                  getUrgencyColor(post.timeUntilPost)
                                )}>
                                  in {post.timeUntilPost}
                                </span>
                              </div>
                              
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
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs">
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs">
                                <Eye className="mr-1 h-3 w-3" />
                                Preview
                              </Button>
                              {post.isActive ? (
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Pause className="mr-1 h-3 w-3" />
                                  Pause
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="text-xs">
                                  <Play className="mr-1 h-3 w-3" />
                                  Resume
                                </Button>
                              )}
                              <Button size="sm" className="text-xs">
                                <Send className="mr-1 h-3 w-3" />
                                Post Now
                              </Button>
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