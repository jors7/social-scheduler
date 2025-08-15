import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Check if blog tables exist and have data
    const [postsResult, authorsResult, categoriesResult] = await Promise.all([
      supabase.from('blog_posts').select('id, title, status', { count: 'exact' }).limit(5),
      supabase.from('blog_authors').select('id, display_name', { count: 'exact' }).limit(5),
      supabase.from('blog_categories').select('id, name', { count: 'exact' }).limit(5)
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        posts: {
          data: postsResult.data,
          count: postsResult.count,
          error: postsResult.error
        },
        authors: {
          data: authorsResult.data,
          count: authorsResult.count,
          error: authorsResult.error
        },
        categories: {
          data: categoriesResult.data,
          count: categoriesResult.count,
          error: categoriesResult.error
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}