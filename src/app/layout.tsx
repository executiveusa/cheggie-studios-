import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LogoIntro } from '@/components/logo-intro'
import { ChatWidget } from '@/components/chat/chat-widget'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'Cheggie Studios — AI video workflow za finance kreatore',
    template: '%s | Cheggie Studios',
  },
  description:
    'Pretvori market insight u premium sadržaj brže. Transkripti, search, story builder i subtitle export za srpske finance i trading kreatore.',
  keywords: ['transkript', 'video', 'sadržaj', 'finance', 'trading', 'kreatori', 'AI', 'subtitle'],
  authors: [{ name: 'Cheggie Studios' }],
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://cheggiestudios.com'),
  openGraph: {
    title: 'Cheggie Studios — AI video workflow za finance kreatore',
    description: 'Pretvori market insight u premium sadržaj brže.',
    type: 'website',
    locale: 'sr_RS',
    siteName: 'Cheggie Studios',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cheggie Studios',
    description: 'Pretvori market insight u premium sadržaj brže.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#0a0a0f] text-[hsl(0_0%_95%)]">
        <LogoIntro />
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
