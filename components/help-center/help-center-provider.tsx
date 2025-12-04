'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { FAQArticle } from '@/lib/help-center/articles'

export type HelpCenterView = 'home' | 'article' | 'contact' | 'search' | 'messages'

interface HelpCenterContextType {
  isOpen: boolean
  currentView: HelpCenterView
  selectedArticle: FAQArticle | null
  searchQuery: string
  openWidget: () => void
  closeWidget: () => void
  toggleWidget: () => void
  navigateTo: (view: HelpCenterView) => void
  selectArticle: (article: FAQArticle) => void
  setSearchQuery: (query: string) => void
  goBack: () => void
}

const HelpCenterContext = createContext<HelpCenterContextType | undefined>(undefined)

export function useHelpCenter() {
  const context = useContext(HelpCenterContext)
  if (!context) {
    throw new Error('useHelpCenter must be used within a HelpCenterProvider')
  }
  return context
}

interface HelpCenterProviderProps {
  children: ReactNode
}

export function HelpCenterProvider({ children }: HelpCenterProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<HelpCenterView>('home')
  const [selectedArticle, setSelectedArticle] = useState<FAQArticle | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewHistory, setViewHistory] = useState<HelpCenterView[]>(['home'])

  const openWidget = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeWidget = useCallback(() => {
    setIsOpen(false)
    // Reset state when closing
    setTimeout(() => {
      setCurrentView('home')
      setSelectedArticle(null)
      setSearchQuery('')
      setViewHistory(['home'])
    }, 300) // Wait for close animation
  }, [])

  const toggleWidget = useCallback(() => {
    if (isOpen) {
      closeWidget()
    } else {
      openWidget()
    }
  }, [isOpen, closeWidget, openWidget])

  const navigateTo = useCallback((view: HelpCenterView) => {
    setViewHistory(prev => [...prev, view])
    setCurrentView(view)
  }, [])

  const selectArticle = useCallback((article: FAQArticle) => {
    setSelectedArticle(article)
    navigateTo('article')
  }, [navigateTo])

  const goBack = useCallback(() => {
    setViewHistory(prev => {
      if (prev.length <= 1) return prev
      const newHistory = prev.slice(0, -1)
      const previousView = newHistory[newHistory.length - 1]
      setCurrentView(previousView)
      if (previousView !== 'article') {
        setSelectedArticle(null)
      }
      return newHistory
    })
  }, [])

  const value: HelpCenterContextType = {
    isOpen,
    currentView,
    selectedArticle,
    searchQuery,
    openWidget,
    closeWidget,
    toggleWidget,
    navigateTo,
    selectArticle,
    setSearchQuery,
    goBack,
  }

  return (
    <HelpCenterContext.Provider value={value}>
      {children}
    </HelpCenterContext.Provider>
  )
}
