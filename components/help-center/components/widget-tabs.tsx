'use client'

import { Home, MessageCircle, HelpCircle } from 'lucide-react'
import { useHelpCenter, HelpCenterView } from '../help-center-provider'
import { cn } from '@/lib/utils'

interface Tab {
  id: HelpCenterView
  label: string
  icon: typeof Home
}

const tabs: Tab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'search', label: 'Help', icon: HelpCircle },
]

export function WidgetTabs() {
  const { currentView, navigateTo, setSearchQuery } = useHelpCenter()

  const handleTabClick = (tabId: HelpCenterView) => {
    if (tabId === 'search') {
      setSearchQuery('')
    }
    navigateTo(tabId)
  }

  // Determine which tab is active based on current view
  const getActiveTab = () => {
    if (currentView === 'article' || currentView === 'contact') return 'home'
    return currentView
  }

  const activeTab = getActiveTab()

  return (
    <div className="border-t border-gray-100 bg-white">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                isActive
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
