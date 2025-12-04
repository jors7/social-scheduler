'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Search, ArrowRight, BookOpen } from 'lucide-react'
import { useHelpCenter } from '../help-center-provider'
import { FAQList } from '../components/faq-list'
import { WidgetTabs } from '../components/widget-tabs'
import { WidgetHeader } from '../components/widget-header'
import { searchArticles, FAQArticle, faqArticles } from '@/lib/help-center/articles'
import { createClient } from '@/lib/supabase/client'

interface AIResponse {
  answer: string
  articles: FAQArticle[]
  sourceArticleId?: string | null
  followUpQuestions?: string[]
}

export function SearchResultsView() {
  const { searchQuery, setSearchQuery, selectArticle } = useHelpCenter()
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [localResults, setLocalResults] = useState<FAQArticle[]>([])

  // Find the source article by ID
  const sourceArticle = aiResponse?.sourceArticleId
    ? faqArticles.find(a => a.id === aiResponse.sourceArticleId)
    : null

  // Handle clicking a follow-up question
  const handleFollowUpClick = (question: string) => {
    setSearchQuery(question)
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLocalResults([])
      setAiResponse(null)
      return
    }

    // First, do local search
    const results = searchArticles(searchQuery)
    setLocalResults(results)

    // Then, try AI search
    const fetchAIResponse = async () => {
      setIsLoading(true)
      try {
        // Get current user ID for logging
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const response = await fetch('/api/help-center/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            userId: user?.id || null
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setAiResponse(data)
        }
      } catch (error) {
        console.error('AI search failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAIResponse()
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const hasSearchQuery = searchQuery.trim().length > 0

  return (
    <>
      <WidgetHeader />
      <div className="flex-1 overflow-y-auto">
        {/* Search input */}
        <div className="px-4 py-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help"
                className="w-full pl-4 pr-10 py-3 rounded-full border border-gray-200 bg-white focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all outline-none text-sm"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </form>
        </div>

        {/* Show popular articles when no search, or search results when searching */}
        {!hasSearchQuery ? (
          <FAQList showCategories={true} />
        ) : (
          <>
            {/* AI Response */}
            {isLoading && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 p-4 bg-purple-50 rounded-xl">
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-purple-700">Searching with AI...</span>
                </div>
              </div>
            )}

            {aiResponse?.answer && !isLoading && (
              <div className="px-4 py-3">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">AI Answer</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {aiResponse.answer}
                  </p>

                  {/* Source article link */}
                  {sourceArticle && (
                    <button
                      onClick={() => selectArticle(sourceArticle)}
                      className="mt-3 flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read more: {sourceArticle.title}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {/* Follow-up questions */}
                  {aiResponse.followUpQuestions && aiResponse.followUpQuestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-100">
                      <p className="text-xs text-purple-600 mb-2">Related questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {aiResponse.followUpQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleFollowUpClick(question)}
                            className="text-xs px-2.5 py-1.5 bg-white rounded-full border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search results */}
            <div className="px-4 py-2">
              <p className="text-sm font-medium text-gray-500 mb-2">
                {localResults.length > 0
                  ? `${localResults.length} article${localResults.length === 1 ? '' : 's'} found`
                  : 'No articles found'}
              </p>
            </div>

            {localResults.length > 0 && (
              <FAQList articles={localResults} showCategories={false} />
            )}

            {/* No results */}
            {localResults.length === 0 && !isLoading && (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500 mb-2">No results found for &quot;{searchQuery}&quot;</p>
                <p className="text-sm text-gray-400">
                  Try different keywords or send us a message
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <WidgetTabs />
    </>
  )
}
