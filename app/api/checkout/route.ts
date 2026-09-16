import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return NextResponse.json({ error: 'Stripe is not configured on this deployment.' }, { status: 503 })

    const body = await request.json()
    const { listingId, title, amount, currency = 'usd', buyerEmail } = body || {}
    const numericAmount = Number(amount)
    if (!listingId || !title || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'A valid listing and price are required.' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || 'https://heavenly-website-orpin.vercel.app'
    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${origin}/checkout/success?listing_id=${encodeURIComponent(listingId)}&session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', `${origin}/listing/${encodeURIComponent(listingId)}`)
    params.set('line_items[0][price_data][currency]', String(currency).toLowerCase())
    params.set('line_items[0][price_data][product_data][name]', title)
    params.set('line_items[0][price_data][product_data][description]', `Havenly listing ${listingId}`)
    params.set('line_items[0][price_data][unit_amount]', String(Math.round(numericAmount * 100)))
    params.set('line_items[0][quantity]', '1')
    params.set('metadata[listing_id]', listingId)
    if (buyerEmail) params.set('customer_email', buyerEmail)

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      cache: 'no-store',
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'Stripe could not create checkout.' }, { status: 400 })
    return NextResponse.json({ url: data.url, sessionId: data.id })
  } catch {
    return NextResponse.json({ error: 'Unable to start checkout right now.' }, { status: 500 })
  }
}
