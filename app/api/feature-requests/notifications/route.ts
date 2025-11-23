import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GetNotificationsResponse } from '@/lib/feature-requests/types';
import { MESSAGES } from '@/lib/feature-requests/constants';

// GET /api/feature-requests/notifications
// Fetch user's feature request notifications
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: MESSAGES.ERROR_NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    // Fetch notifications with related feature request details
    const { data: notifications, error: notificationsError } = await supabase
      .from('feature_notifications')
      .select(`
        *,
        feature_request:feature_requests(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 notifications

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Count unread notifications
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const response: GetNotificationsResponse = {
      notifications: notifications || [],
      unreadCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/feature-requests/notifications:', error);
    return NextResponse.json(
      { error: MESSAGES.ERROR_GENERIC },
      { status: 500 }
    );
  }
}

// PATCH /api/feature-requests/notifications
// Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: MESSAGES.ERROR_NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    // Get request body
    const { notificationIds, markAllAsRead } = await request.json();

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      const { error: updateError } = await supabase
        .from('feature_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) {
        console.error('Error marking all as read:', updateError);
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: MESSAGES.ALL_NOTIFICATIONS_READ,
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const { error: updateError } = await supabase
        .from('feature_notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', user.id); // Ensure user can only update their own notifications

      if (updateError) {
        console.error('Error marking notifications as read:', updateError);
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: MESSAGES.NOTIFICATION_MARKED_READ,
      });
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds or markAllAsRead must be provided' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in PATCH /api/feature-requests/notifications:', error);
    return NextResponse.json(
      { error: MESSAGES.ERROR_GENERIC },
      { status: 500 }
    );
  }
}
