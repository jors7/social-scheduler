'use client'

import { MessageCircle } from 'lucide-react'
import { WidgetTabs } from '../components/widget-tabs'
import { WidgetHeader } from '../components/widget-header'
import { useHelpCenter } from '../help-center-provider'

export function MessagesView() {
  const { navigateTo } = useHelpCenter()

  return (
    <>
      <WidgetHeader />
      <div className="flex-1 flex flex-col">
        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            When you send us a message, you&apos;ll see responses here.
          </p>
          <button
            onClick={() => navigateTo('contact')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all"
          >
            Start a conversation
          </button>
        </div>
      </div>

      <WidgetTabs />
    </>
  )
}
