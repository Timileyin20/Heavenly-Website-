import './globals.css'
import type { Metadata } from 'next'

const siteUrl = 'https://heavenly-website-orpin.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Havenly — Homes & Marketplace', template: '%s | Havenly' },
  description: 'Discover homes for rent or sale and shop new and used furniture and household essentials across the USA on Havenly.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: { type: 'website', url: siteUrl, siteName: 'Havenly', title: 'Havenly — Homes & Marketplace', description: 'Discover homes for rent or sale and shop new and used furniture and household essentials across the USA.' },
  twitter: { card: 'summary_large_image', title: 'Havenly — Homes & Marketplace', description: 'Discover homes for rent or sale and shop new and used furniture and household essentials across the USA.' },
  verification: { google: 'ElNfb3Vk8_krSQkzL2h5-tojsh9neKeKAf4ToZE-MNU' },
}

const schema = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: 'Havenly', url: siteUrl,
  description: 'USA marketplace for homes, furniture, appliances and household essentials.',
  potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/properties?search={search_term_string}`, 'query-input': 'required name=search_term_string' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /></body></html>
}
