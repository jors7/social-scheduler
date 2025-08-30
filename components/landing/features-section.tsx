'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, BarChart, Zap, Shield, Layers, Sparkles } from 'lucide-react'

const features = [
  {
    title: 'Multi-Platform Publishing',
    description: 'Post to all your social media accounts with one click. Save time and maintain consistency across all platforms.',
    icon: Zap,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Smart Scheduling',
    description: 'Schedule posts in advance for optimal engagement times. Our AI analyzes your audience for the best posting schedule.',
    icon: Calendar,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    title: 'AI Caption Suggestions',
    description: 'Get AI-powered caption suggestions tailored to each platform. Boost engagement with optimized content.',
    icon: Sparkles,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track performance across all platforms in one place. Get insights to improve your social media strategy.',
    icon: BarChart,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Content Library',
    description: 'Store and organize your media assets. Access your images, videos, and templates anytime from anywhere.',
    icon: Layers,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    title: 'Draft Management',
    description: 'Save your ideas as drafts and perfect them over time. Organize, search, and quickly turn drafts into scheduled posts.',
    icon: Shield,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-gradient-to-b from-white via-gray-50/50 to-white scroll-mt-20">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-semibold text-sm">Core Features</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Everything you need to succeed
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to streamline your social media workflow and boost engagement
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient border effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
              
              {/* Card Content */}
              <div className="relative h-full p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1">
                {/* Title with Icon and Badge */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-lg ${feature.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                      {feature.title}
                    </h3>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            Ready to transform your social media strategy?
          </p>
          <Link href="/pricing">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
            Get Started Free
          </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}