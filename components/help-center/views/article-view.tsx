'use client'

import { ArrowLeft } from 'lucide-react'
import { useHelpCenter } from '../help-center-provider'
import { ArticleContent } from '../components/article-content'
import { TocDropdown } from '../components/toc-dropdown'
import { WidgetTabs } from '../components/widget-tabs'
import { WidgetHeader } from '../components/widget-header'
import { getRelativeTime } from '@/lib/help-center/articles'

export function ArticleView() {
  const { selectedArticle, goBack } = useHelpCenter()

  if (!selectedArticle) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Article not found</p>
      </div>
    )
  }

  return (
    <>
      <WidgetHeader />
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

        {/* Article header */}
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {selectedArticle.title}
          </h1>
          <p className="text-sm text-gray-500">
            Updated {getRelativeTime(selectedArticle.updatedAt)}
          </p>
        </div>

        {/* Table of contents */}
        <div className="px-4">
          <TocDropdown content={selectedArticle.content} />
        </div>

        {/* Article content */}
        <div className="px-4 pb-6">
          <ArticleContent content={selectedArticle.content} />
        </div>
      </div>

      <WidgetTabs />
    </>
  )
}
