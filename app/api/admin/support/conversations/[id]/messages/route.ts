import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSupportReplyToUser } from '@/lib/email/send'
import { requireAdmin } from '@/lib/admin/auth'

// POST - Admin reply to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin authorization
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user for sender info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
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

    // Verify conversation exists and get user info for email
    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .select('id, user_id, user_email, subject, status')
      .eq('id', id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get admin's name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create admin message
    const { data: message, error: msgError } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: id,
        sender_type: 'admin',
        sender_id: user.id,
        sender_name: profile?.full_name || 'Support Team',
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

    // Make sure conversation is open
    if (conversation.status === 'closed') {
      await supabase
        .from('support_conversations')
        .update({ status: 'open' })
        .eq('id', id)
    }

    // Send email notification to user (non-blocking)
    if (conversation.user_email) {
      const userName = conversation.user_email.split('@')[0] || 'there'
      sendSupportReplyToUser(
        conversation.user_email,
        userName,
        conversation.subject,
        content.trim(),
        profile?.full_name || 'Support Team'
      ).catch(err => {
        console.error('Failed to send support reply email to user:', err)
      })
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
    console.error('Error in admin send message API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
