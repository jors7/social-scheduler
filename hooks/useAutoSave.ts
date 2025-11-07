import { useState, useEffect, useRef } from 'react'

interface AutoSaveOptions {
  interval?: number // milliseconds, default 30000 (30 seconds)
  enabled?: boolean
}

interface AutoSaveData {
  content: string
  platforms: string[]
  platformContent: Record<string, string>
  mediaUrls: (string | { url: string; thumbnailUrl?: string; type?: string })[]
}

// Helper function to strip HTML tags for clean titles
const stripHtml = (html: string) => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function useAutoSave(
  data: AutoSaveData,
  draftId: string | null,
  options: AutoSaveOptions = {}
) {
  const { interval = 30000, enabled = true } = options
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastDataRef = useRef<string>('')
  const draftIdRef = useRef<string | null>(draftId)

  // Update draft ID ref when it changes
  useEffect(() => {
    draftIdRef.current = draftId
  }, [draftId])

  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(async () => {
      // Check if data has changed
      const currentData = JSON.stringify(data)
      if (currentData === lastDataRef.current) return

      // Check if there's content to save (both content and platforms are required)
      if (!data.content || data.platforms.length === 0) return

      try {
        setIsSaving(true)
        setError(null)

        const currentDraftId = draftIdRef.current
        const endpoint = '/api/drafts'
        const method = currentDraftId ? 'PATCH' : 'POST'

        // Strip HTML from content to create clean title
        const cleanContent = stripHtml(data.content)
        const title = cleanContent.slice(0, 50) || 'Untitled'

        // Build request body
        const requestBody: any = {
          title,
          content: data.content,
          platforms: data.platforms,
          platformContent: data.platformContent,
          media_urls: data.mediaUrls
        }

        // Add draftId to body for PATCH requests (API expects it there, not in URL)
        if (currentDraftId) {
          requestBody.draftId = currentDraftId
        }

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to auto-save (${response.status})`
          console.error('Auto-save API error:', response.status, errorData)
          throw new Error(errorMessage)
        }

        const result = await response.json()

        // Update draft ID if this was a new draft
        if (!currentDraftId && result.draft?.id) {
          draftIdRef.current = result.draft.id
        }

        lastDataRef.current = currentData
        setLastSaved(new Date())

        // Store in localStorage as backup
        localStorage.setItem('autosave_backup', currentData)
        localStorage.setItem('autosave_timestamp', new Date().toISOString())
      } catch (err) {
        console.error('Auto-save error:', err)
        setError(err instanceof Error ? err.message : 'Auto-save failed')

        // Fallback to localStorage
        localStorage.setItem('autosave_backup', JSON.stringify(data))
        localStorage.setItem('autosave_timestamp', new Date().toISOString())
      } finally {
        setIsSaving(false)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [data, interval, enabled])

  // Helper function to get time ago string
  const getTimeAgo = () => {
    if (!lastSaved) return null

    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000)

    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return {
    lastSaved,
    isSaving,
    error,
    timeAgo: getTimeAgo(),
    currentDraftId: draftIdRef.current
  }
}
