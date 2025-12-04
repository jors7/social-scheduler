import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get conversation with all messages (admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!subscription || !['admin', 'super_admin'].includes(subscription.role || '')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .select(`
        id,
        user_id,
        subject,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get user info
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const convUser = users?.find(u => u.id === conversation.user_id)

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('support_messages')
      .select(`
        id,
        sender_type,
        sender_id,
        sender_name,
        content,
        is_read,
        created_at
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Mark user messages as read
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .eq('sender_type', 'user')
      .eq('is_read', false)

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        userId: conversation.user_id,
        userEmail: convUser?.email || 'Unknown',
        subject: conversation.subject,
        status: conversation.status,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      },
      messages: messages?.map(msg => ({
        id: msg.id,
        senderType: msg.sender_type,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        content: msg.content,
        createdAt: msg.created_at
      })) || []
    })
  } catch (error) {
    console.error('Error in admin conversation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update conversation status (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!subscription || !['admin', 'super_admin'].includes(subscription.role || '')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { status } = await request.json()

    if (!status || !['open', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('support_conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating conversation:', error)
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update conversation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
