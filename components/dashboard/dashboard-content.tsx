'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/sidebar-context'

interface DashboardContentProps {
  children: ReactNode
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isCollapsed } = useSidebar()

  return (
    <div className={cn(
      "transition-all duration-300",
      isCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
    )}>
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
