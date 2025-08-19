import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('path')

    if (pagePath) {
      // Get specific page SEO settings
      const { data, error } = await supabase
        .from('seo_settings')
        .select('*')
        .eq('page_path', pagePath)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return NextResponse.json({ data })
    } else {
      // Get all SEO settings
      const { data, error } = await supabase
        .from('seo_settings')
        .select('*')
        .order('page_path')

      if (error) throw error

      return NextResponse.json({ data })
    }
  } catch (error) {
    console.error('Error fetching SEO settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SEO settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== 'jan.orsula1@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { page_path, ...seoData } = body

    // Upsert SEO settings
    const { data, error } = await supabase
      .from('seo_settings')
      .upsert({
        page_path,
        ...seoData,
        updated_by: user.id
      }, {
        onConflict: 'page_path'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating SEO settings:', error)
    return NextResponse.json(
      { error: 'Failed to update SEO settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== 'jan.orsula1@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('path')

    if (!pagePath) {
      return NextResponse.json(
        { error: 'Page path is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('seo_settings')
      .delete()
      .eq('page_path', pagePath)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting SEO settings:', error)
    return NextResponse.json(
      { error: 'Failed to delete SEO settings' },
      { status: 500 }
    )
  }
}