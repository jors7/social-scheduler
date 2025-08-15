import React from 'react';
import { motion } from 'framer-motion';

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Why Smart Creators Are Ditching Overpriced Schedulers
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Your time matters. Your money matters. Your content deserves a tool that respects both. Here's how SocialCal makes it happen:
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
              className="relative flex flex-col lg:flex-row items-center gap-8"
            >
              {/* Step number on timeline - centered vertically */}
              <div className="flex-shrink-0 relative self-start lg:self-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                  1
                </div>
                <div className="absolute -inset-2 bg-blue-100 rounded-full -z-10 animate-pulse"></div>
              </div>

              {/* Content */}
              <div className="flex-1 lg:pl-8">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  No Bloat. No Learning Curve.
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                  Get set up in minutes — not hours. Our clean, creator-first dashboard lets you start scheduling right away. No overwhelming menus, no clunky setup.
                </p>
              </div>

              {/* Visual mockup */}
              <div className="w-full lg:w-80">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="space-y-4">
                    {/* Simple dashboard mockup */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
                        <span className="text-sm font-semibold">SocialCal</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-20 h-8 bg-gray-100 rounded-lg"></div>
                        <div className="w-20 h-8 bg-blue-500 rounded-lg"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 bg-gray-50 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg mb-2"></div>
                        <div className="w-12 h-2 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-20 bg-gray-50 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg mb-2"></div>
                        <div className="w-12 h-2 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-20 bg-gray-50 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg mb-2"></div>
                        <div className="w-12 h-2 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <span className="text-xs text-green-600 font-medium">✓ Setup complete in 2 minutes</span>
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
              className="relative flex flex-col lg:flex-row items-center gap-8"
            >
              {/* Visual mockup - Pricing comparison (moved left to align with circle above) */}
              <div className="w-full lg:w-80 lg:ml-0">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Price Comparison</span>
                    </div>
                    {/* Competitor pricing */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Competitor A</span>
                        <span className="text-sm font-bold text-gray-900">$59/mo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Competitor B</span>
                        <span className="text-sm font-bold text-gray-900">$49/mo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 border-2 border-green-500 rounded-lg">
                        <span className="text-sm font-semibold text-green-700">SocialCal</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">$9/mo</span>
                          <div className="text-xs text-green-600">Save 80%+</div>
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
                  Why pay $50+/mo for features you'll never use? SocialCal packs the essentials — cross-platform scheduling, smart calendar, and repurposing tools — for a fraction of the price.
                </p>
              </div>

              {/* Step number on right side - centered vertically */}
              <div className="flex-shrink-0 relative order-first lg:order-last self-start lg:self-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                  2
                </div>
                <div className="absolute -inset-2 bg-green-100 rounded-full -z-10 animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>
            </motion.div>

            {/* Block 3 - Text Left, Image Right, Circle on Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex flex-col lg:flex-row items-center gap-8"
            >
              {/* Step number on timeline - centered vertically */}
              <div className="flex-shrink-0 relative self-start lg:self-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                  3
                </div>
                <div className="absolute -inset-2 bg-purple-100 rounded-full -z-10 animate-pulse" style={{animationDelay: '1s'}}></div>
              </div>

              {/* Content */}
              <div className="flex-1 lg:pl-8">
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  Built for All Major Platforms (Yes, Even Threads & Bluesky)
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                  Schedule once and publish across Instagram, X (Twitter), LinkedIn, Facebook, TikTok, Pinterest, YouTube, Threads, and Bluesky. We've got you covered everywhere.
                </p>
              </div>

              {/* Visual mockup - Platform grid */}
              <div className="w-full lg:w-80">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <span className="text-xs text-purple-600 font-medium">9 Platforms Connected</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {['Instagram', 'X', 'LinkedIn', 'Facebook', 'TikTok', 'Pinterest', 'YouTube', 'Threads', 'Bluesky'].map((platform, i) => (
                        <div key={platform} className="relative">
                          <div className="h-14 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100 flex flex-col items-center justify-center p-2">
                            <div className="w-5 h-5 bg-purple-400 rounded mb-1"></div>
                            <span className="text-[9px] text-gray-600">{platform}</span>
                          </div>
                          {/* Connected indicator */}
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[7px]">✓</span>
                          </div>
                        </div>
                      ))}
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
              className="relative flex flex-col lg:flex-row items-center gap-8"
            >
              {/* Visual mockup - User types (moved left to align with circle above) */}
              <div className="w-full lg:w-80 lg:ml-0">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <span className="text-xs text-pink-600 font-medium">Built for You</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                        <div className="w-10 h-10 bg-pink-200 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">Solopreneurs</div>
                          <div className="text-xs text-gray-600">Manage everything yourself</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                        <div className="w-10 h-10 bg-pink-200 rounded-full flex items-center justify-center">
                          <span className="text-lg">🎨</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">Content Creators</div>
                          <div className="text-xs text-gray-600">Focus on creating, not posting</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                        <div className="w-10 h-10 bg-pink-200 rounded-full flex items-center justify-center">
                          <span className="text-lg">👥</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">Small Teams</div>
                          <div className="text-xs text-gray-600">Collaborate efficiently</div>
                        </div>
                      </div>
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
              <div className="flex-shrink-0 relative order-first lg:order-last self-start lg:self-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 relative">
                  4
                </div>
                <div className="absolute -inset-2 bg-pink-100 rounded-full -z-10 animate-pulse" style={{animationDelay: '1.5s'}}></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;