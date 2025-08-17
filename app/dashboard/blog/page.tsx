'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkIsAdmin } from '@/lib/auth/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Copy, Calendar, Clock, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  created_at: string
  updated_at: string
  view_count: number
  featured: boolean
  category: string
  author: {
    display_name: string
    avatar_url: string
  }
}

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletePostId, setDeletePostId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!adminUser) {
        router.push('/dashboard?error=unauthorized')
        return
      }

      setIsAdmin(true)
      loadPosts()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard?error=unauthorized')
    }
  }

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:blog_authors(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPosts(data?.map(post => ({
        ...post,
        author: Array.isArray(post.author) ? post.author[0] : post.author
      })) || [])
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePostId) return

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', deletePostId)

      if (error) throw error

      toast.success('Blog post deleted successfully')
      loadPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete blog post')
    } finally {
      setDeletePostId(null)
    }
  }

  const handleDuplicate = async (post: BlogPost) => {
    try {
      const { data: originalPost, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', post.id)
        .single()

      if (fetchError) throw fetchError

      const newPost = {
        ...originalPost,
        id: undefined,
        title: `${originalPost.title} (Copy)`,
        slug: `${originalPost.slug}-copy-${Date.now()}`,
        status: 'draft',
        published_at: null,
        created_at: undefined,
        updated_at: undefined,
        view_count: 0,
        featured: false
      }

      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert([newPost])

      if (insertError) throw insertError

      toast.success('Blog post duplicated successfully')
      loadPosts()
    } catch (error) {
      console.error('Error duplicating post:', error)
      toast.error('Failed to duplicate blog post')
    }
  }

  const togglePublishStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    const updateData: any = { status: newStatus }
    
    if (newStatus === 'published' && !post.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', post.id)

      if (error) throw error

      toast.success(`Post ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`)
      loadPosts()
    } catch (error) {
      console.error('Error updating post status:', error)
      toast.error('Failed to update post status')
    }
  }

  const toggleFeaturedStatus = async (post: BlogPost) => {
    try {
      // If setting as featured, unfeatured all other posts first
      if (!post.featured) {
        const { error: unfeaturedError } = await supabase
          .from('blog_posts')
          .update({ featured: false })
          .eq('featured', true)
        
        if (unfeaturedError) throw unfeaturedError
      }

      // Toggle the featured status of this post
      const { error } = await supabase
        .from('blog_posts')
        .update({ featured: !post.featured })
        .eq('id', post.id)

      if (error) throw error

      toast.success(post.featured ? 'Post unfeatured' : 'Post set as featured')
      loadPosts()
    } catch (error) {
      console.error('Error updating featured status:', error)
      toast.error('Failed to update featured status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Blog Management</h1>
          <p className="text-gray-600 mt-2">Create and manage your blog posts</p>
        </div>
        <Button onClick={() => router.push('/dashboard/blog/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>
            Manage your blog content, schedule publications, and track performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading posts...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No posts found matching your search.' : 'No blog posts yet.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push('/dashboard/blog/new')}>
                  Create Your First Post
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {post.title}
                            {post.featured && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          {post.featured && (
                            <Badge className="mt-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                              <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{post.category || 'Uncategorized'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {post.author?.avatar_url && (
                            <img
                              src={post.author.avatar_url}
                              alt={post.author.display_name}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm">{post.author?.display_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.view_count}</TableCell>
                      <TableCell>
                        {post.published_at ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/blog/edit-post?id=${post.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/blog/${post.slug}`, '_blank')}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(post)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublishStatus(post)}>
                              <Clock className="h-4 w-4 mr-2" />
                              {post.status === 'published' ? 'Unpublish' : 'Publish'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFeaturedStatus(post)}>
                              <Star className={`h-4 w-4 mr-2 ${post.featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              {post.featured ? 'Remove from Featured' : 'Set as Featured'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeletePostId(post.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}