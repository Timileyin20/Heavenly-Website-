import type { Metadata } from 'next'
import ListingDetailClient from './ListingDetailClient'
import { createClient } from '@supabase/supabase-js'

const siteUrl = 'https://heavenly-website-orpin.vercel.app'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return {
      title: 'Listing | Havenly',
      description: 'View homes and marketplace listings on Havenly.',
      alternates: { canonical: `/listing/${id}` },
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, description, city, state, price, currency, kind, property_mode, images, status, moderation_status')
    .eq('id', id)
    .maybeSingle()

  if (!listing) {
    return {
      title: 'Listing Not Found | Havenly',
      description: 'This Havenly listing could not be found.',
      robots: { index: false, follow: true },
      alternates: { canonical: `/listing/${id}` },
    }
  }

  const isProperty = listing.kind === 'property'
  const location = [listing.city, listing.state].filter(Boolean).join(', ')
  const price = listing.price != null
    ? `${listing.currency || 'USD'} ${Number(listing.price).toLocaleString()}${isProperty && listing.property_mode === 'rent' ? '/month' : ''}`
    : ''
  const title = `${listing.title}${location ? ` in ${location}` : ''} | Havenly`
  const description = [
    isProperty ? 'View this home on Havenly.' : 'View this marketplace item on Havenly.',
    price,
    location,
    listing.description,
  ].filter(Boolean).join(' ').slice(0, 155)

  const approved = listing.status === 'active' && listing.moderation_status === 'approved'
  const image = Array.isArray(listing.images) && listing.images.length ? listing.images[0] : undefined

  return {
    title,
    description,
    alternates: { canonical: `/listing/${listing.id}` },
    robots: approved ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/listing/${listing.id}`,
      siteName: 'Havenly',
      title,
      description,
      ...(image ? { images: [{ url: image, alt: listing.title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default function ListingPage() {
  return <ListingDetailClient />
}
