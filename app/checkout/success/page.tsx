'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function CheckoutSuccess() {
  const params = useSearchParams()
  const listingId = params.get('listing_id')
  const sessionId = params.get('session_id')
  const [message, setMessage] = useState('Confirming your order…')
  const [done, setDone] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setMessage('Please sign in to finish recording this order.'); return }
      if (!listingId || !sessionId) { setMessage('The payment return information is incomplete.'); return }
      const { data: listing } = await supabase.from('listings').select('id, seller_id, price, currency, status, moderation_status').eq('id', listingId).maybeSingle()
      if (!listing) { setMessage('The listing could not be found.'); return }
      const { error } = await supabase.from('orders').insert({ buyer_id: auth.user.id, listing_id: listing.id, seller_id: listing.seller_id, amount: Number(listing.price), currency: listing.currency || 'USD', status: 'paid', stripe_payment_intent_id: sessionId })
      if (error && !/duplicate|unique/i.test(error.message)) { setMessage(error.message); return }
      setMessage('Payment completed. Your Havenly order has been recorded.')
      setDone(true)
    })()
  }, [listingId, sessionId])

  return <main className="container" style={{ padding: '90px 0', maxWidth: 760 }}><span className="kicker">PAYMENT COMPLETE</span><h1>{done ? 'Thank you for your order.' : 'Finalizing your order…'}</h1><p className="muted" style={{ lineHeight: 1.7 }}>{message}</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}><a className="btn btn-dark" href="/dashboard">Go to dashboard</a><a className="btn" href="/marketplace">Continue shopping</a></div></main>
}
