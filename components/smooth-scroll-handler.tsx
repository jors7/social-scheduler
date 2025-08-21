'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function SmoothScrollHandler() {
  const pathname = usePathname()

  useEffect(() => {
    // Only run on the homepage
    if (pathname !== '/') return

    // Check if there's a hash in the URL
    const hash = window.location.hash
    if (hash) {
      // Prevent the default jump to the anchor
      window.history.scrollRestoration = 'manual'
      
      // Scroll to top first (instantly)
      window.scrollTo(0, 0)
      
      // Then smoothly scroll to the target section
      const scrollToSection = () => {
        const id = hash.substring(1)
        const element = document.getElementById(id)
        
        if (element) {
          const headerOffset = 80 // Adjust based on your header height
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset
          
          // Use a smooth animation
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }
      
      // Wait for the page to fully load, then scroll
      if (document.readyState === 'complete') {
        setTimeout(scrollToSection, 100)
      } else {
        window.addEventListener('load', () => {
          setTimeout(scrollToSection, 100)
        })
      }
    }
    
    // Restore default scroll behavior when leaving
    return () => {
      window.history.scrollRestoration = 'auto'
    }
  }, [pathname])

  return null
}