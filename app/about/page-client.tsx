'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BarChart, Menu, ChevronRight, Clock, TrendingUp, Users, Layers, Zap, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AuthModals } from '@/components/auth/auth-modals'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { Navbar } from '@/components/layout/navbar'
export default function AboutPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
    setUserEmail(user?.email || null)
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Shared Navbar Component */}
      <Navbar 
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignInClick={() => setSignInOpen(true)}
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignInClick={() => setSignInOpen(true)}
        onSignUpClick={() => setSignUpOpen(true)}
      />

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl py-20 px-8">
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold mb-4 leading-tight text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700 }}>
            About Us
          </h1>
          <p className="text-xl text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400 }}>
            The story behind SocialCal
          </p>
        </div>

        {/* Content Sections */}
        <div className="prose prose-lg max-w-none">
          <section className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              Built for People Who Are Done Wasting Time on Social Media
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400, lineHeight: '1.7' }}>
              <p>
                This isn&apos;t just another scheduling tool.<br />
                It&apos;s the tool I wish I had when I was trying to grow without burning out.
              </p>
              <p>
                I know what it&apos;s like to have great content… and still fall behind.<br />
                To be full of ideas, but constantly overwhelmed by posting schedules, platform chaos, and the never-ending pressure to &quot;stay consistent.&quot;
              </p>
              <p>
                I&apos;ve run pages. I&apos;ve built brands. I&apos;ve coached creators and solopreneurs who had something valuable to share but couldn&apos;t keep up with posting across Instagram, TikTok, LinkedIn, YouTube, Threads, and more — let alone repurposing content or tracking performance.
              </p>
              <p>
                And the truth is, most tools weren&apos;t built for us.<br />
                They were built for teams. For agencies. For companies with time, staff, and resources.<br />
                Not for someone doing it all themselves.
              </p>
              <p className="font-semibold text-gray-900" style={{ fontSize: '1.125rem' }}>
                So I built one that was.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              Why We Exist
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400, lineHeight: '1.7' }}>
              <p>
                We created this platform to help real creators and business owners save time, stay consistent, and take back control of their content — without needing a full-time content manager or 10 open tabs.
              </p>
              <p>
                It&apos;s simple. It&apos;s fast. It works across every major platform.<br />
                And it&apos;s designed to help you post with intention — whether that means growing your audience, driving traffic, or just finally sticking to a content plan you can keep up with.
              </p>
              <p>
                This isn&apos;t about doing <em>more</em>.<br />
                It&apos;s about doing the right things — better, easier, and on your terms.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              Our Mission
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400, lineHeight: '1.7' }}>
              <p>
                Our mission is to help you stay visible without feeling constantly &quot;on.&quot;<br />
                To give you a calm, clear place to plan, schedule, and repurpose your content — and know that your business is still growing, even when you&apos;re not online.
              </p>
              <p>
                We&apos;re here to make consistency effortless.<br />
                To support creators who are building something meaningful.<br />
                And to give you back the most valuable thing you have: time.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              Who We&apos;re For
            </h2>
            <div className="text-lg text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400, lineHeight: '1.7' }}>
              <p className="mb-4">
                We built this for creators, solopreneurs, personal brands, educators, and small teams who are tired of:
              </p>
              <ul className="list-disc pl-6 space-y-3 mb-6 text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400 }}>
                <li>Scrambling to post</li>
                <li>Losing content ideas in 12 different docs</li>
                <li>Posting inconsistently</li>
                <li>Repeating the same copy-paste process across 5 platforms</li>
                <li>Wondering if the algorithm just hates them</li>
              </ul>
              <p className="font-semibold text-gray-900" style={{ fontSize: '1.125rem' }}>
                If that&apos;s you, you&apos;re in the right place.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              How We&apos;re Different
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400, lineHeight: '1.7' }}>
              <p>
                This isn&apos;t just a calendar with a queue — and it&apos;s definitely not another overpriced tool built for agencies.
              </p>
              <p>
                We created the most creator-friendly, budget-friendly scheduler on the market.<br />
                All the core features you need to stay consistent across platforms — without paying $30, $50, or $100 a month like with most tools.
              </p>
              <p>
                We believe content scheduling should be accessible, not expensive.<br />
                That&apos;s why we&apos;ve made it radically affordable — with flexible plans that don&apos;t punish you for growing. No bloated features. No locked-out tools. Just one streamlined system that helps you post smarter, faster, and everywhere you need to be.
              </p>
              <p>
                You can schedule once and publish across multiple platforms.<br />
                You can organize your content by format, campaign, or platform.<br />
                You can easily repurpose your top content — instead of starting from scratch each time.<br />
                And you can do it all without breaking your budget.
              </p>
              <p>
                This is how you stay consistent and show up like a pro — even if you&apos;re just getting started.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 700, lineHeight: '1.2' }}>
              This Is Just the Beginning
            </h2>
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 400, lineHeight: '1.7' }}>
              <p>
                We believe social media should work for you — not the other way around.
              </p>
              <p>
                That&apos;s why we&apos;re building tools that give you clarity, control, and confidence.<br />
                You already know what to say. You already have something worth sharing.<br />
                Now, you finally have a tool that helps you share it — on schedule, on message, and without the stress.
              </p>
              <p className="font-semibold text-gray-900" style={{ fontSize: '1.125rem' }}>
                We&apos;re creators too.<br />
                And we&apos;re here to help you build something that lasts.
              </p>
            </div>
          </section>
        </div>

        {/* CTA Section - Same style as homepage */}
        <div className="text-center mt-20 pt-16 border-t border-gray-200">
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

      {/* Footer - Same as homepage */}
      <footer className="bg-gray-900 text-white py-12 px-4 mt-20">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-2xl font-bold mb-4 text-white">SocialCal</h3>
              <p className="text-gray-400">
                The all-in-one social media scheduler for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 SocialCal. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <AuthModals
        signInOpen={signInOpen}
        signUpOpen={signUpOpen}
        onSignInOpenChange={setSignInOpen}
        onSignUpOpenChange={setSignUpOpen}
      />
    </div>
  )
}