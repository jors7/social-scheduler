'use client'

import { Send } from 'lucide-react'
import { WidgetHeader } from '../components/widget-header'
import { StatusIndicator } from '../components/status-indicator'
import { SearchBox } from '../components/search-box'
import { FAQList } from '../components/faq-list'
import { WidgetTabs } from '../components/widget-tabs'
import { useHelpCenter } from '../help-center-provider'

export function HomeView() {
  const { navigateTo } = useHelpCenter()

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <WidgetHeader />

        <StatusIndicator status="operational" />

        {/* Send message button */}
        <div className="px-4 py-3">
          <button
            onClick={() => navigateTo('contact')}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors group"
          >
            <span className="font-medium text-gray-700 group-hover:text-gray-900">
              Send us a message
            </span>
            <Send className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
          </button>
        </div>

        <SearchBox />

        <FAQList showCategories={true} />
      </div>

      <WidgetTabs />
    </>
  )
}
