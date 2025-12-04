import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List all conversations (admin only)
export async function GET(request: NextRequest) {
  try {
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    // Build query - include user_email from the conversation
    let query = supabase
      .from('support_conversations')
      .select(`
        id,
        user_id,
        user_email,
        subject,
        status,
        last_message_at,
        created_at,
        support_messages (
          id,
          content,
          sender_type,
          sender_name,
          is_read,
          created_at
        )
      `)
      .order('last_message_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Process conversations - use stored user_email
    const processedConversations = conversations?.map(conv => {
      const messages = conv.support_messages || []
      const lastMessage = messages.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      const unreadCount = messages.filter((m: any) =>
        m.sender_type === 'user' && !m.is_read
      ).length

      return {
        id: conv.id,
        userId: conv.user_id,
        userEmail: conv.user_email || 'Unknown',
        subject: conv.subject,
        status: conv.status,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderType: lastMessage.sender_type,
          senderName: lastMessage.sender_name,
          createdAt: lastMessage.created_at
        } : null,
        unreadCount,
        messageCount: messages.length
      }
    })

    // Get stats
    const totalConversations = conversations?.length || 0
    const openConversations = conversations?.filter(c => c.status === 'open').length || 0
    const closedConversations = conversations?.filter(c => c.status === 'closed').length || 0
    const unreadConversations = processedConversations?.filter(c => c.unreadCount > 0).length || 0

    return NextResponse.json({
      conversations: processedConversations,
      stats: {
        total: totalConversations,
        open: openConversations,
        closed: closedConversations,
        unread: unreadConversations
      }
    })
  } catch (error) {
    console.error('Error in admin conversations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
