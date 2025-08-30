'use client'

import { HeroSection } from './hero-section'
import { PlatformsSection } from './platforms-section'

interface HeroWithPlatformsProps {
  isAuthenticated: boolean | null
  onSignInClick: () => void
}

export function HeroWithPlatforms({ isAuthenticated, onSignInClick }: HeroWithPlatformsProps) {
  return (
    <div className="relative overflow-x-hidden">
      {/* Shared animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="absolute inset-0 overflow-hidden">
          {/* Top left purple blob */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          
          {/* Top right blue blob */}
          <div className="absolute top-40 right-[-100px] md:right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          
          {/* Middle pink blob */}
          <div className="absolute top-96 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          
          {/* Bottom blue blob for platforms section */}
          <div className="absolute bottom-20 right-40 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>
      </div>
      
      {/* Content sections with relative positioning */}
      <div className="relative z-10">
        <HeroSection 
          isAuthenticated={isAuthenticated} 
          onSignInClick={onSignInClick}
        />
        <PlatformsSection />
      </div>
    </div>
  )
}