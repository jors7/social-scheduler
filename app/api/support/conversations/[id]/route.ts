import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get conversation with all messages
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

    // Get conversation (RLS will ensure user can only see their own)
    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .select(`
        id,
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

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('support_messages')
      .select(`
        id,
        sender_type,
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

    // Mark admin messages as read
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .eq('sender_type', 'admin')
      .eq('is_read', false)

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      },
      messages: messages?.map(msg => ({
        id: msg.id,
        senderType: msg.sender_type,
        senderName: msg.sender_name,
        content: msg.content,
        createdAt: msg.created_at
      })) || []
    })
  } catch (error) {
    console.error('Error in conversation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
