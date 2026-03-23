import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cheggie Studios',
  description:
    'Cheggie Studios pomaže finance i trading kreatorima da od jednog snimka dobiju transkript, pronađu najbolje momente, slože priču i pripreme sadržaj za objavu.',
  keywords: ['transkript', 'video', 'sadržaj', 'finance', 'trading', 'kreatori'],
  authors: [{ name: 'Cheggie Studios' }],
  openGraph: {
    title: 'Cheggie Studios',
    description:
      'Pretvori market insight u premium sadržaj brže.',
    type: 'website',
    locale: 'sr_RS',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#0a0a0f] text-[hsl(0_0%_95%)]">
        {children}
      </body>
    </html>
  )
}
