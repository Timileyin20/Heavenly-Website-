import './globals.css'
import type { Metadata } from 'next'

const siteUrl = 'https://heavenly-website-orpin.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Havenly — Homes & Marketplace',
    template: '%s | Havenly',
  },
  description:
    'Havenly is a modern USA marketplace to discover homes for rent or sale and shop new and used furniture and household essentials.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Havenly',
    title: 'Havenly — Homes & Marketplace',
    description:
      'Discover homes for rent or sale and shop new and used furniture and household essentials on Havenly.',
  },
  twitter: {
    card: 'summary',
    title: 'Havenly — Homes & Marketplace',
    description:
      'Discover homes for rent or sale and shop new and used furniture and household essentials on Havenly.',
  },
  verification: {
    google: 'ElNfb3Vk8_krSQkzL2h5-tojsh9neKeKAf4ToZE-MNU',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
