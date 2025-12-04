'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { useHelpCenter } from '../help-center-provider'

interface WidgetHeaderProps {
  title?: string
  subtitle?: string
}

export function WidgetHeader({
  title = 'Help Center',
  subtitle = "We're here to help"
}: WidgetHeaderProps) {
  const { closeWidget } = useHelpCenter()

  return (
    <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 px-4 py-4">
      <div className="flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <Image
              src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp"
              alt="SocialCal"
              width={32}
              height={32}
              className="w-7 h-7"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-sm text-white/80">{subtitle}</p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={closeWidget}
          className="p-2 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  )
}
