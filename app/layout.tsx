import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Havenly — Homes & Marketplace',
  description: 'A modern USA marketplace for homes, furniture and household essentials.',
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
