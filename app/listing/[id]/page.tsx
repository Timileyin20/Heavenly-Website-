import type { Metadata } from 'next'
import ListingDetailClient from './ListingDetailClient'
import { createClient } from '@supabase/supabase-js'

const siteUrl = 'https://heavenly-website-orpin.vercel.app'

type Props = {
  params: Promise<{ id: string }>
}

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value: string, max = 155) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return {
      title: 'Listing',
      description: 'View homes and marketplace listings on Havenly.',
      alternates: { canonical: `/listing/${id}` },
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id, title, description, city, state, price, currency, kind, property_mode, images, status, moderation_status, item_condition, category'
    )
    .eq('id', id)
    .maybeSingle()

  if (!listing) {
    return {
      title: 'Listing Not Found',
      description: 'This Havenly listing could not be found.',
      robots: { index: false, follow: true },
      alternates: { canonical: `/listing/${id}` },
    }
  }

  const isProperty = listing.kind === 'property'
  const location = [cleanText(listing.city), cleanText(listing.state)]
    .filter(Boolean)
    .join(', ')

  const titleText = cleanText(listing.title) || (isProperty ? 'Home' : 'Marketplace Item')
  const title = location ? `${titleText} in ${location}` : titleText

  const currency = cleanText(listing.currency) || 'USD'
  const numericPrice = Number(listing.price)
  const price = Number.isFinite(numericPrice)
    ? `${currency} ${numericPrice.toLocaleString('en-US')}${
        isProperty && listing.property_mode === 'rent' ? '/month' : ''
      }`
    : ''

  const listingDescription = cleanText(listing.description)
  const description = truncate(
    [
      isProperty ? 'View this home on Havenly.' : 'View this marketplace item on Havenly.',
      location ? `Located in ${location}.` : '',
      price ? `Listed at ${price}.` : '',
      listingDescription,
    ]
      .filter(Boolean)
      .join(' ')
  )

  const approved = listing.status === 'active' && listing.moderation_status === 'approved'
  const image =
    Array.isArray(listing.images) && listing.images.length
      ? listing.images[0]
      : undefined

  return {
    title,
    description,
    alternates: { canonical: `/listing/${listing.id}` },
    robots: approved
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/listing/${listing.id}`,
      siteName: 'Havenly',
      title,
      description,
      ...(image ? { images: [{ url: image, alt: titleText }] } : {}),
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
