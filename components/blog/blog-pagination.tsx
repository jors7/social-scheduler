'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BlogPaginationProps {
  currentPage: number
  totalPages: number
  searchParams: { category?: string; search?: string; page?: string }
}

export function BlogPagination({ currentPage, totalPages, searchParams }: BlogPaginationProps) {
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams.category) params.set('category', searchParams.category)
    if (searchParams.search) params.set('search', searchParams.search)
    if (page > 1) params.set('page', page.toString())
    
    return `/blog${params.toString() ? `?${params.toString()}` : ''}`
  }

  const renderPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Link
          key={i}
          href={buildPageUrl(i)}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all",
            currentPage === i
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          {i}
        </Link>
      )
    }

    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {/* Previous Button */}
      <Link
        href={buildPageUrl(currentPage - 1)}
        className={cn(
          "p-2 rounded-lg transition-all",
          currentPage === 1
            ? "pointer-events-none opacity-50"
            : "hover:bg-gray-100"
        )}
        aria-disabled={currentPage === 1}
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      {/* Page Numbers */}
      {renderPageNumbers()}

      {/* Next Button */}
      <Link
        href={buildPageUrl(currentPage + 1)}
        className={cn(
          "p-2 rounded-lg transition-all",
          currentPage === totalPages
            ? "pointer-events-none opacity-50"
            : "hover:bg-gray-100"
        )}
        aria-disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  )
}