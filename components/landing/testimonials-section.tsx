'use client'

import { Card, CardContent } from '@/components/ui/card'

const testimonials = [
  // First row testimonials
  [
    "SocialCal has completely transformed our social media strategy. We're saving 15+ hours every week!",
    "The AI suggestions are spot on! My engagement has increased by 200% in just two months.",
    "Finally, a tool that understands small businesses. Simple, powerful, and affordable.",
    "Scheduling across 9 platforms used to be a nightmare. Now it takes me 10 minutes.",
    "The analytics dashboard alone is worth the price. I can finally track ROI properly.",
    "My team loves how intuitive everything is. Zero learning curve!",
  ],
  // Second row testimonials
  [
    "Game-changer for content creators! I can focus on creating instead of posting.",
    "Doubled my client base since using SocialCal. The time savings are incredible.",
    "The bulk upload feature is a lifesaver. I schedule a month's content in one go.",
    "Customer support is exceptional. They actually listen and implement feedback.",
    "Best investment for my personal brand. Period.",
    "Switched from Hootsuite and never looked back. This is so much better!",
  ],
]

export function TestimonialsSection() {
  return (
    <section className="py-20 overflow-x-hidden overflow-y-visible relative">
      {/* Animated gradient background with white at top for smooth transition */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/30 to-purple-50">
        <div className="absolute inset-0">
          <div className="absolute top-40 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-4000"></div>
        </div>
      </div>
      
      <div className="relative z-10 mb-16">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4 text-gray-900">
          <span className="block sm:inline">Loved by content</span>
          <span className="block sm:inline sm:ml-1">creators worldwide</span>
        </h2>
        <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Join thousands of satisfied users who have transformed their social media game
        </p>
      </div>
      
      {/* First row - scrolling left to right */}
      <div className="relative z-10 mb-8">
        <div className="flex animate-scroll-right">
          {/* Duplicate the testimonials for seamless loop */}
          {[...testimonials[0], ...testimonials[0]].map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[280px] sm:w-[380px] mx-2 sm:mx-3"
            >
              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 h-[100px] sm:h-[120px] border-gray-100">
                <CardContent className="h-full flex items-center justify-center p-4 sm:p-5">
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal text-center">
                    {testimonial}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        {/* Fade gradients on both sides */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
      </div>
      
      {/* Second row - scrolling right to left */}
      <div className="relative z-10">
        <div className="flex animate-scroll-left">
          {/* Duplicate the testimonials for seamless loop */}
          {[...testimonials[1], ...testimonials[1]].map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[280px] sm:w-[380px] mx-2 sm:mx-3"
            >
              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 h-[100px] sm:h-[120px] border-gray-100">
                <CardContent className="h-full flex items-center justify-center p-4 sm:p-5">
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal text-center">
                    {testimonial}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        {/* Fade gradients on both sides */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-white/90 via-white/50 to-transparent pointer-events-none z-10" />
      </div>
    </section>
  )
}