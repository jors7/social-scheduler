import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Send a message to a conversation
export async function POST(
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

    const { content } = await request.json()

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Verify conversation exists and belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get user's name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create message
    const { data: message, error: msgError } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: id,
        sender_type: 'user',
        sender_id: user.id,
        sender_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        content: content.trim()
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error creating message:', msgError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // If conversation was closed, reopen it
    if (conversation.status === 'closed') {
      await supabase
        .from('support_conversations')
        .update({ status: 'open' })
        .eq('id', id)
    }

    return NextResponse.json({
      message: {
        id: message.id,
        senderType: message.sender_type,
        senderName: message.sender_name,
        content: message.content,
        createdAt: message.created_at
      }
    })
  } catch (error) {
    console.error('Error in send message API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
