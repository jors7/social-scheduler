'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import { WidgetTabs } from '../components/widget-tabs'
import { WidgetHeader } from '../components/widget-header'
import { useHelpCenter } from '../help-center-provider'

interface Conversation {
  id: string
  subject: string
  status: 'open' | 'closed'
  lastMessageAt: string
  createdAt: string
  lastMessage: {
    content: string
    senderType: 'user' | 'admin'
    createdAt: string
  } | null
  unreadCount: number
}

export function MessagesView() {
  const { navigateTo, selectConversation } = useHelpCenter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/support/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <>
      <WidgetHeader title="Messages" subtitle="Your conversations" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Start a conversation with our support team.
            </p>
            <button
              onClick={() => navigateTo('contact')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          /* Conversation list */
          <div className="flex-1 overflow-y-auto">
            {/* New conversation button */}
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={() => navigateTo('contact')}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all"
              >
                + New conversation
              </button>
            </div>

            {/* Conversations */}
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {conv.subject}
                        </h3>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-purple-600 text-white text-xs font-medium rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {conv.lastMessage.senderType === 'admin' && (
                            <span className="text-purple-600 font-medium">Support: </span>
                          )}
                          {truncateText(conv.lastMessage.content, 50)}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                      {conv.status === 'closed' ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <WidgetTabs />
    </>
  )
}
