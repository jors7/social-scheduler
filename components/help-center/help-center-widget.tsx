'use client'

import { useHelpCenter } from './help-center-provider'
import { HomeView } from './views/home-view'
import { ArticleView } from './views/article-view'
import { ContactView } from './views/contact-view'
import { SearchResultsView } from './views/search-results-view'
import { MessagesView } from './views/messages-view'
import { cn } from '@/lib/utils'

export function HelpCenterWidget() {
  const { isOpen, currentView } = useHelpCenter()

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />
      case 'article':
        return <ArticleView />
      case 'contact':
        return <ContactView />
      case 'search':
        return <SearchResultsView />
      case 'messages':
        return <MessagesView />
      default:
        return <HomeView />
    }
  }

  return (
    <>
      {/* Widget */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out',
          'border border-gray-200',
          isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
      >
        {/* View content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderView()}
        </div>
      </div>
    </>
  )
}
