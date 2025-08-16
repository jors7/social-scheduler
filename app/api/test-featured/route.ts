import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }
  
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  
  try {
    // Check if any posts have featured = true
    const { data: allPosts, error: allError } = await supabase
      .from('blog_posts')
      .select('id, title, featured')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
    
    // Try to get featured post
    const { data: featuredPost, error: featuredError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .single()
    
    return NextResponse.json({
      allPostsCount: allPosts?.length || 0,
      postsWithFeatured: allPosts?.filter(p => p.featured === true) || [],
      featuredPost: featuredPost || null,
      featuredError: featuredError?.message || null,
      featuredErrorCode: featuredError?.code || null
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}