import Link from 'next/link'
import { NavbarClient } from './blog-navbar-client'

export function BlogLayoutServer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar with client-side auth */}
      <NavbarClient />

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer - Static server component */}
      <footer className="bg-black text-white py-12 px-4 mt-20">
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
                <li><Link href="/pricing" scroll={false} className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" scroll={false} className="hover:text-white">About</Link></li>
                <li><Link href="/blog" scroll={false} className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/affiliate" scroll={false} className="hover:text-white">Affiliate Program</Link></li>
                <li><Link href="/affiliate/terms" scroll={false} className="hover:text-white">Affiliate Terms</Link></li>
              </ul>
            </div>
            <div className="md:col-span-1">
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" scroll={false} className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" scroll={false} className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/contact" scroll={false} className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 SocialCal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
