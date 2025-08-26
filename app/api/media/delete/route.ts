import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { r2Storage } from '@/lib/r2/storage'

export async function DELETE(request: NextRequest) {
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

    // Get media IDs from request
    const { ids } = await request.json()
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No media IDs provided' },
        { status: 400 }
      )
    }

    // Fetch media items from database to get R2 keys
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media_library')
      .select('id, filename, user_id')
      .in('id', ids)
      .eq('user_id', user.id) // Ensure user owns these files

    if (fetchError) {
      throw fetchError
    }

    if (!mediaItems || mediaItems.length === 0) {
      return NextResponse.json(
        { error: 'No media items found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete from R2 storage
    const r2Keys = mediaItems.map(item => item.filename).filter(Boolean)
    if (r2Keys.length > 0) {
      try {
        await r2Storage.deleteMany(r2Keys)
      } catch (r2Error) {
        console.error('R2 deletion error:', r2Error)
        // Continue even if R2 deletion fails (we'll still remove from DB)
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('media_library')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      deleted: mediaItems.length
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete media' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'