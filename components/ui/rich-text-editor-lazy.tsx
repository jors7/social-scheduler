'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

// Loading skeleton for the editor
const EditorSkeleton = () => (
  <div className="border rounded-lg p-4 min-h-[200px] animate-pulse bg-gray-50">
    <div className="flex gap-2 mb-3 border-b pb-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="w-8 h-8 bg-gray-200 rounded" />
      ))}
    </div>
    <div className="space-y-2 mt-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
)

// Dynamically import the TipTap editor only when needed
const RichTextEditor = dynamic(
  () => import('./rich-text-editor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => <EditorSkeleton />,
    ssr: false // Disable SSR for editor to avoid hydration issues
  }
)

interface RichTextEditorLazyProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
}

export function RichTextEditorLazy(props: RichTextEditorLazyProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <EditorSkeleton />
  }

  return <RichTextEditor {...props} />
}

export default RichTextEditorLazy