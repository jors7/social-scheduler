'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const STORAGE_KEY = 'sidebar-collapsed'

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      setIsCollapsedState(saved === 'true')
    }
    setIsHydrated(true)
  }, [])

  // Save to localStorage whenever state changes (after hydration)
  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Prevent flash of wrong state during hydration
  if (!isHydrated) {
    return (
      <SidebarContext.Provider value={{ isCollapsed: false, setIsCollapsed, toggleCollapsed }}>
        {children}
      </SidebarContext.Provider>
    )
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
