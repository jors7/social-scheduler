'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mail, Clock, Headphones, CreditCard, Lightbulb, Handshake, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AuthModals } from '@/components/auth/auth-modals'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { Navbar } from '@/components/layout/navbar'
import GradientCTA from '@/components/landing/gradient-cta'

export default function ContactPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      toast.success('Message sent! We\'ll get back to you within 24 hours.')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
      />

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl py-20 px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Get in Touch</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold mb-4 leading-tight text-gray-900">
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We&apos;re here to help and answer any questions you might have
          </p>
        </motion.div>

        {/* Contact Methods */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-20"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Email */}
            <div className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl border border-gray-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="p-4 rounded-xl bg-blue-50 text-blue-600 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Email Us
                </h3>
              </div>
              <p className="text-lg text-gray-700 mb-4">
                Send us an email anytime, and we&apos;ll get back to you within 24 hours.
              </p>
              <a
                href="mailto:jan@socialcal.app"
                className="text-xl font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                jan@socialcal.app
              </a>
            </div>

            {/* Response Time */}
            <div className="group bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl border border-gray-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="p-4 rounded-xl bg-green-50 text-green-600 mr-4 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Response Time
                </h3>
              </div>
              <p className="text-lg text-gray-700">
                We typically respond to all inquiries within <span className="font-semibold">24 hours</span> during business days.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Contact Form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-20"
        >
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Send Us a Message
              </h2>
              <p className="text-lg text-gray-600">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">Name</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="subject" className="text-gray-700 font-medium">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What is this about?"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-gray-700 font-medium">Message</Label>
                <Textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us more about your question or feedback..."
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2 inline" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.section>

        {/* Common Topics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              What Can We Help You With?
            </h2>
            <p className="text-lg text-gray-600">
              Common topics our team can assist you with
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Technical Support */}
            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg border border-gray-200 border-l-4 border-l-blue-500 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Technical Support
                </h3>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <Headphones className="h-5 w-5" />
                </div>
              </div>
              <p className="text-gray-700">
                Having issues with the platform? Need help connecting your social media accounts? We&apos;re here to help you get everything running smoothly.
              </p>
            </div>

            {/* Billing & Subscriptions */}
            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg border border-gray-200 border-l-4 border-l-green-500 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Billing & Subscriptions
                </h3>
                <div className="p-3 rounded-lg bg-green-50 text-green-600">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <p className="text-gray-700">
                Questions about pricing, billing, or managing your subscription? We can help clarify any concerns about your account.
              </p>
            </div>

            {/* Feature Requests */}
            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg border border-gray-200 border-l-4 border-l-purple-500 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Feature Requests
                </h3>
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                  <Lightbulb className="h-5 w-5" />
                </div>
              </div>
              <p className="text-gray-700">
                Have an idea for a new feature? We love hearing from our users about how we can make SocialCal even better.
              </p>
            </div>

            {/* Partnerships & Collaborations */}
            <div className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg border border-gray-200 border-l-4 border-l-pink-500 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Partnerships & Collaborations
                </h3>
                <div className="p-3 rounded-lg bg-pink-50 text-pink-600">
                  <Handshake className="h-5 w-5" />
                </div>
              </div>
              <p className="text-gray-700">
                Interested in partnering with us? Let&apos;s discuss how we can work together to help more creators succeed.
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* CTA Section */}
      <GradientCTA />

      {/* Footer - Same as homepage */}
      <footer className="bg-black text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
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
            <div>
              <h4 className="font-semibold mb-4">Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/affiliate" className="hover:text-white">Affiliate Program</Link></li>
                <li><Link href="/affiliate/login" className="hover:text-white">Affiliate Login</Link></li>
                <li><Link href="/affiliate/terms" className="hover:text-white">Affiliate Terms</Link></li>
              </ul>
            </div>
            <div className="md:col-span-1">
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
        onSignInOpenChange={setSignInOpen}
      />
    </div>
  )
}