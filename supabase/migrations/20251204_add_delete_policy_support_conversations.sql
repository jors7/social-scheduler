-- Add delete policy for support_conversations
-- Users can delete their own closed conversations

CREATE POLICY "Users can delete own closed conversations"
  ON support_conversations FOR DELETE
  USING (auth.uid() = user_id AND status = 'closed');

-- Add delete policy for support_messages
-- Users can delete messages from their own conversations (via cascade or direct)

CREATE POLICY "Users can delete messages from own conversations"
  ON support_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
      AND support_conversations.status = 'closed'
    )
  );
