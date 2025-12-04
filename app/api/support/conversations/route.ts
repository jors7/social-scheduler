import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSupportTicketToAdmin } from '@/lib/email/send'

// GET - List user's conversations
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get conversations with last message preview
    const { data: conversations, error } = await supabase
      .from('support_conversations')
      .select(`
        id,
        subject,
        status,
        last_message_at,
        created_at,
        support_messages (
          id,
          content,
          sender_type,
          is_read,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Process conversations to include last message and unread count
    const processedConversations = conversations?.map(conv => {
      const messages = conv.support_messages || []
      const lastMessage = messages.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      const unreadCount = messages.filter((m: any) =>
        m.sender_type === 'admin' && !m.is_read
      ).length

      return {
        id: conv.id,
        subject: conv.subject,
        status: conv.status,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderType: lastMessage.sender_type,
          createdAt: lastMessage.created_at
        } : null,
        unreadCount
      }
    })

    return NextResponse.json({ conversations: processedConversations })
  } catch (error) {
    console.error('Error in conversations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { subject, message } = await request.json()

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      )
    }

    // Get user's name for the message
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create conversation with user email for admin visibility
    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .insert({
        user_id: user.id,
        user_email: user.email,
        subject: subject.trim()
      })
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Create first message
    const { error: msgError } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'user',
        sender_id: user.id,
        sender_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        content: message.trim()
      })

    if (msgError) {
      console.error('Error creating message:', msgError)
      // Try to clean up the conversation
      await supabase.from('support_conversations').delete().eq('id', conversation.id)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    // Send email notification to admin (non-blocking)
    sendSupportTicketToAdmin(
      user.email || 'Unknown',
      subject.trim(),
      message.trim(),
      conversation.id
    ).catch(err => {
      console.error('Failed to send support ticket email to admin:', err)
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        createdAt: conversation.created_at
      }
    })
  } catch (error) {
    console.error('Error in create conversation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
