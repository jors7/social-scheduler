'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
  color?: string
}

interface BlogCategoriesProps {
  categories: Category[]
  activeCategory?: string
}

export function BlogCategories({ categories, activeCategory }: BlogCategoriesProps) {
  const searchParams = useSearchParams()

  const buildCategoryUrl = (slug?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('category', slug)
    } else {
      params.delete('category')
    }
    params.delete('page') // Reset to page 1 when changing category
    return `/blog?${params.toString()}`
  }

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12">
      <Link
        href={buildCategoryUrl()}
        className={cn(
          "px-6 py-2.5 rounded-full font-medium transition-all",
          "hover:shadow-md hover:scale-105",
          !activeCategory
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
            : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
        )}
      >
        All Posts
      </Link>
      
      {categories.map((category) => (
        <Link
          key={category.id}
          href={buildCategoryUrl(category.slug)}
          className={cn(
            "px-6 py-2.5 rounded-full font-medium transition-all",
            "hover:shadow-md hover:scale-105",
            activeCategory === category.slug
              ? "text-white shadow-lg"
              : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
          )}
          style={{
            background: activeCategory === category.slug 
              ? `linear-gradient(135deg, ${category.color || '#3B82F6'}, ${adjustColor(category.color || '#3B82F6', -20)})`
              : undefined
          }}
        >
          {category.name}
        </Link>
      ))}
    </div>
  )
}

// Helper function to darken color for gradient
function adjustColor(color: string, amount: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}