import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { r2Storage } from '@/lib/r2/storage'

export const maxDuration = 300 // 5 minutes for large files

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB for videos, 50MB for images)
    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isVideo ? '500MB' : '50MB'}.` },
        { status: 400 }
      )
    }

    // Generate unique key for R2
    const key = r2Storage.generateKey(user.id, file.name)

    // Upload to R2
    const { url } = await r2Storage.upload(file, key, file.type)

    return NextResponse.json({
      url,
      key,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('video/') ? 'video' : 'image'
    })
  } catch (error) {
    console.error('Post media upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
