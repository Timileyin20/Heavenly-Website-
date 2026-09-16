import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const baseUrl = 'https://heavenly-website-orpin.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return urls
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')
    .eq('moderation_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (data) {
    urls.push(
      ...data.map((listing) => ({
        url: `${baseUrl}/listing/${listing.id}`,
        lastModified: listing.updated_at
          ? new Date(listing.updated_at)
          : new Date(),
      }))
    )
  }

  return urls
}
