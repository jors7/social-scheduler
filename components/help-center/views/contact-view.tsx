'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react'
import { useHelpCenter } from '../help-center-provider'
import { WidgetTabs } from '../components/widget-tabs'
import { WidgetHeader } from '../components/widget-header'
import { createClient } from '@/lib/supabase/client'

export function ContactView() {
  const { goBack, selectConversation } = useHelpCenter()
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/support/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          message: formData.message.trim()
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 401) {
          setError('Please log in to send a message')
        } else {
          throw new Error(data.error || 'Failed to send message')
        }
        return
      }

      const data = await response.json()
      setIsSubmitted(true)

      // Navigate to the conversation after a short delay
      setTimeout(() => {
        selectConversation(data.conversation.id)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthenticated === false) {
    return (
      <>
        <WidgetHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to send a message to our support team.
          </p>
          <a
            href="/login"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all"
          >
            Sign in
          </a>
        </div>
        <WidgetTabs />
      </>
    )
  }

  if (isSubmitted) {
    return (
      <>
        <WidgetHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h2>
          <p className="text-gray-600 mb-4">
            We&apos;ll get back to you as soon as possible.
          </p>
          <p className="text-sm text-gray-400">
            Opening your conversation...
          </p>
        </div>
        <WidgetTabs />
      </>
    )
  }

  return (
    <>
      <WidgetHeader title="New Message" subtitle="We typically respond within 24 hours" />
      <div className="flex-1 overflow-y-auto">
        {/* Back button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm"
              placeholder="How can we help?"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm resize-none"
              placeholder="Describe your issue or question in detail..."
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isAuthenticated === null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send message
              </>
            )}
          </button>
        </form>
      </div>

      <WidgetTabs />
    </>
  )
}
