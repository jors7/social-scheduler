import { Plus_Jakarta_Sans, Figtree } from 'next/font/google'

// Plus Jakarta Sans is a geometric sans similar to Stolzl
const plusJakarta = Plus_Jakarta_Sans({ 
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-plus-jakarta'
})

const figtree = Figtree({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-figtree'
})

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${plusJakarta.variable} ${figtree.variable}`}>
      {children}
    </div>
  )
}