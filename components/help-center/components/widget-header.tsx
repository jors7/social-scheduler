'use client'

import Image from 'next/image'

interface WidgetHeaderProps {
  title?: string
  subtitle?: string
}

export function WidgetHeader({
  title = 'Need support?',
  subtitle = 'How can we help?'
}: WidgetHeaderProps) {
  return (
    <div className="p-6 pb-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4">
        <Image
          src="https://pub-741f812143544724bbdccee81d8672f5.r2.dev/static-assets/SocialCal.webp"
          alt="SocialCal"
          width={40}
          height={40}
          className="w-10 h-10"
        />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <p className="text-2xl font-bold text-gray-900">{subtitle}</p>
    </div>
  )
}
