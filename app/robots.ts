import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/auth/',
        '/checkout/',
        '/choose-role/',
        '/dashboard/',
        '/forgot-password/',
        '/orders/',
        '/signin/',
        '/signup/',
        '/update-password/',
      ],
    },
    sitemap: 'https://heavenly-website-orpin.vercel.app/sitemap.xml',
  }
}
