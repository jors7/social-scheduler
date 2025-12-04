'use client'

import { ChevronRight, Link, Calendar, CreditCard, BarChart3, Rocket } from 'lucide-react'
import { useHelpCenter } from '../help-center-provider'
import { FAQArticle, faqCategories, getArticlesByCategory, FAQCategory } from '@/lib/help-center/articles'

const categoryIcons = {
  'getting-started': Rocket,
  'platform-connections': Link,
  'posting-scheduling': Calendar,
  'analytics': BarChart3,
  'billing-subscription': CreditCard,
}

interface FAQListProps {
  articles?: FAQArticle[]
  showCategories?: boolean
}

export function FAQList({ articles, showCategories = true }: FAQListProps) {
  const { selectArticle } = useHelpCenter()

  if (articles) {
    // Show flat list of articles
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-1">
          {articles.map((article) => (
            <FAQItem
              key={article.id}
              article={article}
              onClick={() => selectArticle(article)}
            />
          ))}
        </div>
      </div>
    )
  }

  // Show categorized list
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <p className="text-sm font-medium text-gray-500 mb-3">Popular articles</p>
      <div className="space-y-4">
        {faqCategories.map((category) => {
          const articles = getArticlesByCategory(category.id as FAQCategory)
          const Icon = categoryIcons[category.id as keyof typeof categoryIcons]

          return (
            <div key={category.id}>
              {showCategories && (
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {category.name}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {articles.slice(0, 3).map((article) => (
                  <FAQItem
                    key={article.id}
                    article={article}
                    onClick={() => selectArticle(article)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface FAQItemProps {
  article: FAQArticle
  onClick: () => void
}

function FAQItem({ article, onClick }: FAQItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      <span className="text-sm text-gray-700 group-hover:text-gray-900 pr-2">
        {article.title}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
    </button>
  )
}
