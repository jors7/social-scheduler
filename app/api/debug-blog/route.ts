import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Try to check if tables exist
    const results = {
      postsTable: null as any,
      authorsTable: null as any,
      categoriesTable: null as any,
      postsCount: null as any,
      authorsCount: null as any,
      error: null as any
    }
    
    try {
      // Check blog_posts table
      const postsQuery = await supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
      
      results.postsTable = {
        exists: !postsQuery.error || postsQuery.error.code !== '42P01',
        error: postsQuery.error,
        count: postsQuery.count
      }
    } catch (e) {
      results.postsTable = { exists: false, error: e }
    }
    
    try {
      // Check blog_authors table
      const authorsQuery = await supabase
        .from('blog_authors')
        .select('id', { count: 'exact', head: true })
      
      results.authorsTable = {
        exists: !authorsQuery.error || authorsQuery.error.code !== '42P01',
        error: authorsQuery.error,
        count: authorsQuery.count
      }
    } catch (e) {
      results.authorsTable = { exists: false, error: e }
    }
    
    try {
      // Check blog_categories table
      const categoriesQuery = await supabase
        .from('blog_categories')
        .select('id', { count: 'exact', head: true })
      
      results.categoriesTable = {
        exists: !categoriesQuery.error || categoriesQuery.error.code !== '42P01',
        error: categoriesQuery.error,
        count: categoriesQuery.count
      }
    } catch (e) {
      results.categoriesTable = { exists: false, error: e }
    }
    
    // Try to get actual data counts
    if (results.postsTable.exists) {
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
      results.postsCount = count
    }
    
    if (results.authorsTable.exists) {
      const { count } = await supabase
        .from('blog_authors')
        .select('*', { count: 'exact', head: true })
      results.authorsCount = count
    }
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        tablesExist: results.postsTable.exists && results.authorsTable.exists,
        hasData: (results.postsCount || 0) > 0 && (results.authorsCount || 0) > 0
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}