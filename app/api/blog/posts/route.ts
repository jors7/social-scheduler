import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '9')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'
    const featured = searchParams.get('featured') === 'true'

    const offset = (page - 1) * limit
    const supabase = createClient()

    // Build query
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(display_name, avatar_url, bio)
      `, { count: 'exact' })
      .eq('status', 'published')

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (featured) {
      query = query.eq('featured', true)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('view_count', { ascending: false })
        break
      case 'oldest':
        query = query.order('published_at', { ascending: true })
        break
      case 'newest':
      default:
        query = query.order('published_at', { ascending: false })
    }

    // Execute query with pagination
    const { data: posts, count, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching blog posts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch blog posts' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      posts: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })

    // Add cache headers for public blog data
    // Cache for 5 minutes (300 seconds) with stale-while-revalidate
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error in blog posts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}