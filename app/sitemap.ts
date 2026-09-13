import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    'https://heavenly-website-rbng-2i8b9scdp-timidoskiakinwole20-9258.vercel.app'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sell`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/policy`,
      lastModified: new Date(),
    },
  ]
}
