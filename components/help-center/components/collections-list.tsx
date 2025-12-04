'use client'

import { ChevronRight, Link, Calendar, CreditCard, BarChart3 } from 'lucide-react'
import { faqCategories, getArticlesByCategory, FAQCategory, faqArticles } from '@/lib/help-center/articles'
import { useHelpCenter } from '../help-center-provider'
import { useState } from 'react'

const categoryIcons = {
  'platform-connections': Link,
  'posting-scheduling': Calendar,
  'analytics': BarChart3,
  'billing-subscription': CreditCard,
}

interface CollectionArticlesProps {
  category: FAQCategory
  onBack: () => void
}

function CollectionArticles({ category, onBack }: CollectionArticlesProps) {
  const { selectArticle } = useHelpCenter()
  const articles = getArticlesByCategory(category)
  const categoryInfo = faqCategories.find(c => c.id === category)

  return (
    <div>
      {/* Back to collections */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span className="text-sm font-medium">All collections</span>
      </button>

      {/* Category header */}
      <div className="px-4 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">{categoryInfo?.name}</h2>
        <p className="text-sm text-gray-500">{articles.length} articles</p>
      </div>

      {/* Articles list */}
      <div className="divide-y divide-gray-100">
        {articles.map((article) => (
          <button
            key={article.id}
            onClick={() => selectArticle(article)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-sm text-gray-700 pr-2">{article.title}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function CollectionsList() {
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | null>(null)

  if (selectedCategory) {
    return (
      <CollectionArticles
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
      />
    )
  }

  const totalArticles = faqArticles.length

  return (
    <div>
      {/* Collections count */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">
          {faqCategories.length} collections
        </p>
      </div>

      {/* Collections list */}
      <div className="divide-y divide-gray-100">
        {faqCategories.map((category) => {
          const Icon = categoryIcons[category.id as keyof typeof categoryIcons]
          const articles = getArticlesByCategory(category.id)

          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{category.name}</p>
                  <p className="text-sm text-gray-500">{articles.length} articles</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
