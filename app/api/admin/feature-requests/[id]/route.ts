import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin/auth';
import type { UpdateFeatureRequestForm } from '@/lib/feature-requests/types';

// PATCH /api/admin/feature-requests/[id]
// Update feature request (status, priority, admin notes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const supabase = await createClient();

    // Get request body
    const updates: UpdateFeatureRequestForm = await request.json();

    // Build update object
    const updateData: any = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;

      // Auto-set completed_at when status is completed
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (updates.priority !== undefined) {
      updateData.priority = updates.priority;
    }

    if (updates.admin_notes !== undefined) {
      updateData.admin_notes = updates.admin_notes;
    }

    if (updates.estimated_completion_date !== undefined) {
      updateData.estimated_completion_date = updates.estimated_completion_date;
    }

    if (updates.completed_at !== undefined) {
      updateData.completed_at = updates.completed_at;
    }

    // Update feature request
    const { data: updatedFeature, error: updateError } = await supabase
      .from('feature_requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating feature request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feature request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feature: updatedFeature,
      message: 'Feature request updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/feature-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/feature-requests/[id]
// Delete feature request (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check super admin authorization
  const authError = await requireSuperAdmin(request)
  if (authError) return authError

  try {
    const supabase = await createClient();

    // Delete feature request (cascade will delete votes and notifications)
    const { error: deleteError } = await supabase
      .from('feature_requests')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting feature request:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete feature request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feature request deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/feature-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
