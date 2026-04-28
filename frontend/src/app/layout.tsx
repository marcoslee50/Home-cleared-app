import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lifetold — Preserve Their Story',
  description: 'Create a lifelike tribute — a living archive of voice, memory and presence — for the people who shaped your life.',
  openGraph: {
    title: 'Lifetold',
    description: 'A living archive of voice, memory and presence.',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="bg-cream text-ink font-sans antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1B3A2D',
              color: '#F5F0E8',
              borderRadius: '8px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  )
}
