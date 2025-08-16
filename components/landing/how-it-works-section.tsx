import React from 'react';
import { motion } from 'framer-motion';

const HowItWorksSection = () => {
  return (
    <section className="py-20 pb-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Why Smart Creators Are Ditching Overpriced Schedulers
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Your time matters. Your money matters. Your content deserves a tool that respects both. Here&apos;s how SocialCal makes it happen:
          </p>
        </div>

        {/* Content blocks with timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-green-400 to-pink-600 hidden lg:block"></div>
          
          <div className="space-y-16">
            {/* Block 1 - Text Left, Image Right, Circle on Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Mobile: Text above Image */}
              <div className="lg:hidden">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 relative">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No Confusion. No Learning Curve.
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Get set up in minutes — not hours. Our clean, creator-first dashboard lets you start scheduling right away. No overwhelming menus, no clunky setup.
                    </p>
                  </div>
                </div>
                
                {/* Mobile Image - Same as Desktop */}
                <div className="w-full px-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 shadow-2xl border border-blue-100">
                    <div className="space-y-5">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Quick Setup</h4>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Progress visualization */}
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                              <div className="h-full w-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                              <div className="h-full w-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                              <div className="h-full w-3/4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2">
                        <span>Get Started</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-8">
                {/* Step number on timeline - centered vertically */}
                <div className="flex-shrink-0 relative self-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                    1
                  </div>
                  <div className="absolute -inset-2 bg-blue-100 rounded-full -z-10 animate-pulse"></div>
                </div>

                {/* Content */}
                <div className="flex-1 pl-8">
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                    No Confusion. No Learning Curve.
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                    Get set up in minutes — not hours. Our clean, creator-first dashboard lets you start scheduling right away. No overwhelming menus, no clunky setup.
                  </p>
                </div>

                {/* Visual mockup */}
                <div className="w-80">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 shadow-2xl border border-blue-100">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Quick Setup</h4>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Progress visualization */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                            <div className="h-full w-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                            <div className="h-full w-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                            <div className="h-full w-3/4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2">
                      <span>Get Started</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </motion.div>

            {/* Block 2 - Image Left, Text Right, Circle on Right */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              {/* Mobile: Text above Image */}
              <div className="lg:hidden">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 relative">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      The Most Affordable Scheduler on the Market
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Why pay $50+/mo for features you&apos;ll never use? SocialCal packs the essentials — cross-platform scheduling, smart calendar, and repurposing tools — for a fraction of the price.
                    </p>
                  </div>
                </div>
                
                {/* Mobile Image - Same as Desktop */}
                <div className="w-full px-4 mb-8">
                  <div className="bg-gradient-to-br from-green-50 to-white rounded-3xl p-8 shadow-2xl border border-green-100">
                    <div className="space-y-5">
                      {/* Header with icon */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Save More</h4>
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Price comparison bars */}
                      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Others</span>
                            <span className="text-xs font-semibold text-gray-700">$50+</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-gradient-to-r from-gray-300 to-gray-400 rounded-full"></div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-green-600">SocialCal</span>
                            <span className="text-xs font-bold text-green-600">$9</span>
                          </div>
                          <div className="h-3 bg-green-50 rounded-full overflow-hidden">
                            <div className="h-full w-1/5 bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                          </div>
                        </div>
                        
                        {/* Savings badge */}
                        <div className="flex items-center justify-center pt-2">
                          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-md">
                            Save 80%+
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-8">
                {/* Visual mockup - Pricing comparison (moved left to align with circle above) */}
                <div className="w-80 ml-0">
                <div className="bg-gradient-to-br from-green-50 to-white rounded-3xl p-8 shadow-2xl border border-green-100">
                  <div className="space-y-5">
                    {/* Header with icon */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Save More</h4>
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Price comparison bars */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Others</span>
                          <span className="text-xs font-semibold text-gray-700">$50+</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-gradient-to-r from-gray-300 to-gray-400 rounded-full"></div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-green-600">SocialCal</span>
                          <span className="text-xs font-bold text-green-600">$9</span>
                        </div>
                        <div className="h-3 bg-green-50 rounded-full overflow-hidden">
                          <div className="h-full w-1/5 bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Savings badge */}
                      <div className="flex items-center justify-center pt-2">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-md">
                          Save 80%+
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 lg:pr-8">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  The Most Affordable Scheduler on the Market
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                  Why pay $50+/mo for features you&apos;ll never use? SocialCal packs the essentials — cross-platform scheduling, smart calendar, and repurposing tools — for a fraction of the price.
                </p>
              </div>

                {/* Step number on right side - centered vertically */}
                <div className="flex-shrink-0 relative order-last self-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                    2
                  </div>
                  <div className="absolute -inset-2 bg-green-100 rounded-full -z-10 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                </div>
              </div>
            </motion.div>

            {/* Block 3 - Text Left, Image Right, Circle on Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Mobile: Text above Image */}
              <div className="lg:hidden">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 relative">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Built for All Major Platforms (Yes, Even Threads & Bluesky)
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Schedule once and publish across Instagram, X (Twitter), LinkedIn, Facebook, TikTok, Pinterest, YouTube, Threads, and Bluesky. We&apos;ve got you covered everywhere.
                    </p>
                  </div>
                </div>
                
                {/* Mobile Image - Same as Desktop */}
                <div className="w-full px-4 mb-8">
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 shadow-2xl border border-purple-100">
                    <div className="space-y-5">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">All Platforms</h4>
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Platform icons grid */}
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                            <div key={i} className="relative">
                              <div className="aspect-square bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 flex items-center justify-center hover:shadow-md transition-shadow">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg shadow-sm"></div>
                              </div>
                              {/* Connected dot */}
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status text */}
                      <div className="text-center">
                        <span className="text-xs font-semibold text-purple-600">9 Platforms Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-8">
                {/* Step number on timeline - centered vertically */}
                <div className="flex-shrink-0 relative self-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                    3
                  </div>
                  <div className="absolute -inset-2 bg-purple-100 rounded-full -z-10 animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>

                {/* Content */}
                <div className="flex-1 pl-8">
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                    Built for All Major Platforms (Yes, Even Threads & Bluesky)
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                    Schedule once and publish across Instagram, X (Twitter), LinkedIn, Facebook, TikTok, Pinterest, YouTube, Threads, and Bluesky. We&apos;ve got you covered everywhere.
                  </p>
                </div>

                {/* Visual mockup - Platform grid */}
                <div className="w-80">
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 shadow-2xl border border-purple-100">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">All Platforms</h4>
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Platform icons grid */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                          <div key={i} className="relative">
                            <div className="aspect-square bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 flex items-center justify-center hover:shadow-md transition-shadow">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg shadow-sm"></div>
                            </div>
                            {/* Connected dot */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status text */}
                    <div className="text-center">
                      <span className="text-xs font-semibold text-purple-600">9 Platforms Ready</span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </motion.div>

            {/* Block 4 - Image Left, Text Right, Circle on Right */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              {/* Mobile: Text above Image */}
              <div className="lg:hidden">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 relative">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Designed for Solopreneurs, Creators, and Small Teams
                    </h3>
                    <p className="text-base text-gray-600 leading-relaxed">
                      Unlike enterprise platforms built for marketing departments, SocialCal was designed with solo creators and lean brands in mind — so every feature is relevant, simple, and effective.
                    </p>
                  </div>
                </div>
                
                {/* Mobile Image - Same as Desktop */}
                <div className="w-full px-4 mb-8">
                  <div className="bg-gradient-to-br from-pink-50 to-white rounded-3xl p-8 shadow-2xl border border-pink-100">
                    <div className="space-y-5">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">Made for You</h4>
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* User segments */}
                      <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className="space-y-3">
                          {/* Solo */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                              <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-500 rounded"></div>
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-100 rounded w-24"></div>
                            </div>
                          </div>
                          
                          {/* Creators */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                              <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full"></div>
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-100 rounded w-32"></div>
                            </div>
                          </div>
                          
                          {/* Teams */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                              <div className="flex gap-0.5">
                                <div className="w-2 h-2 bg-gradient-to-br from-pink-400 to-pink-500 rounded-sm"></div>
                                <div className="w-2 h-2 bg-gradient-to-br from-pink-400 to-pink-500 rounded-sm"></div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-100 rounded w-20"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom text */}
                      <div className="text-center">
                        <span className="text-xs font-semibold text-pink-600">Perfect Fit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-8">
                {/* Visual mockup - User types (moved left to align with circle above) */}
                <div className="w-80 ml-0">
                <div className="bg-gradient-to-br from-pink-50 to-white rounded-3xl p-8 shadow-2xl border border-pink-100">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Made for You</h4>
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* User segments */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="space-y-3">
                        {/* Solo */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                            <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-500 rounded"></div>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 rounded w-24"></div>
                          </div>
                        </div>
                        
                        {/* Creators */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                            <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 rounded w-32"></div>
                          </div>
                        </div>
                        
                        {/* Teams */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl flex items-center justify-center">
                            <div className="flex gap-0.5">
                              <div className="w-2 h-2 bg-gradient-to-br from-pink-400 to-pink-500 rounded-sm"></div>
                              <div className="w-2 h-2 bg-gradient-to-br from-pink-400 to-pink-500 rounded-sm"></div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 rounded w-20"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom text */}
                    <div className="text-center">
                      <span className="text-xs font-semibold text-pink-600">Perfect Fit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 lg:pr-8">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  Designed for Solopreneurs, Creators, and Small Teams
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                  Unlike enterprise platforms built for marketing departments, SocialCal was designed with solo creators and lean brands in mind — so every feature is relevant, simple, and effective.
                </p>
              </div>

                {/* Step number on right side - centered vertically */}
                <div className="flex-shrink-0 relative order-last self-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                    4
                  </div>
                  <div className="absolute -inset-2 bg-pink-100 rounded-full -z-10 animate-pulse" style={{animationDelay: '1.5s'}}></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;