import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { r2Storage } from '@/lib/r2/storage'

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const pagePath = formData.get('pagePath') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Generate unique filename for R2
    const fileExt = file.name.split('.').pop()
    const fileName = `seo-og-${pagePath.replace(/\//g, '-')}-${Date.now()}.${fileExt}`
    const key = `seo-images/${fileName}`

    // Upload to R2
    const uploadResult = await r2Storage.upload(file, key, file.type)

    return NextResponse.json({
      url: uploadResult.url,
      path: key
    })
  } catch (error) {
    console.error('Error uploading OG image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}