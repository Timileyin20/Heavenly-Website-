'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function ListingDetailClient() {
  const params = useParams<{ id: string }>()
  const [listing, setListing] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [favorite, setFavorite] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    ;(async () => {
      const { data } = await supabase.from('listings').select('*').eq('id', params.id).single()
      setListing(data)
      const { data: auth } = await supabase.auth.getUser()
      setUser(auth.user)
      if (auth.user && data) {
        const { data: fav } = await supabase.from('favorites').select('listing_id').eq('user_id', auth.user.id).eq('listing_id', data.id).maybeSingle()
        setFavorite(!!fav)
      }
    })()
  }, [params?.id])

  async function toggleFavorite() {
    setError('')
    if (!user) { window.location.href = `/signin?next=/listing/${listing.id}`; return }
    if (favorite) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listing.id)
      if (error) setError(error.message); else setFavorite(false)
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, listing_id: listing.id })
      if (error) setError(error.message); else setFavorite(true)
    }
  }

  async function buyNow() {
    setError('')
    if (!user) { window.location.href = `/signin?next=/listing/${listing.id}`; return }
    if (user.id === listing.seller_id) { setError('You cannot purchase your own listing.'); return }
    if (listing.kind !== 'item' || listing.status !== 'active' || listing.moderation_status !== 'approved') { setError('This listing is not currently available for checkout.'); return }
    setBuying(true)
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: listing.id, title: listing.title, amount: listing.price, currency: listing.currency || 'usd', buyerEmail: user.email }) })
      const data = await response.json()
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.')
      window.location.href = data.url
    } catch (err: any) { setError(err.message || 'Checkout could not be started.'); setBuying(false) }
  }

  async function contactSeller(e: FormEvent) {
    e.preventDefault(); setError(''); setSent(false)
    if (!user) { window.location.href = `/signin?next=/listing/${listing.id}`; return }
    if (!message.trim()) return
    if (user.id === listing.seller_id) { setError('This is your own listing.'); return }
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: listing.seller_id, listing_id: listing.id, body: message.trim() })
    if (error) setError(error.message); else { setSent(true); setMessage('') }
  }

  if (!listing) return <main className="container" style={{padding:'70px 0'}}>Loading listing…</main>
  const isProperty = listing.kind === 'property'
  const price = `$${Number(listing.price).toLocaleString()}${isProperty && listing.property_mode === 'rent' ? '/mo' : ''}`
  const images = listing.images?.length ? listing.images : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85']
  const available = listing.status === 'active' && listing.moderation_status === 'approved'

  return <main>
    <nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><div className="navLinks"><a href="/properties">Homes</a><a href="/marketplace">Marketplace</a></div><div className="navActions"><a href={user ? '/dashboard' : '/signin'}>{user ? 'My Account' : 'Sign in'}</a><a className="btn btn-dark" href="/sell">Sell on Havenly</a></div></nav>
    <section className="container detailPage">
      <a href={isProperty ? '/properties' : '/marketplace'} className="backLink">← Back to {isProperty ? 'homes' : 'marketplace'}</a>
      <div className="detailGrid">
        <div><div className="detailHero"><img src={images[0]} alt={listing.title}/><span className="pill">{isProperty ? (listing.property_mode === 'rent' ? 'For Rent' : 'For Sale') : (listing.item_condition === 'new' ? 'New' : 'Used')}</span></div>{images.length > 1 && <div className="thumbRow">{images.map((src:string,i:number)=><img key={i} src={src} alt={`${listing.title} photo ${i+1}`} onClick={(e)=>{const hero=(e.currentTarget.closest('.detailGrid')?.querySelector('.detailHero img') as HTMLImageElement|null);if(hero) hero.src=src}} style={{cursor:'pointer'}}/>)}</div>}</div>
        <aside className="detailPanel"><button className="saveButton" onClick={toggleFavorite}>{favorite ? '♥ Saved' : '♡ Save listing'}</button><span className="kicker">{isProperty ? 'PROPERTY' : (listing.category || 'MARKETPLACE')}</span><h1>{listing.title}</h1><div className="detailPrice">{price}</div><p className="detailLocation">{listing.city}{listing.state ? `, ${listing.state}` : ''}{listing.zip_code ? ` ${listing.zip_code}` : ''}</p>{isProperty ? <div className="stats"><span><b>{listing.beds ?? '—'}</b> beds</span><span><b>{listing.baths ?? '—'}</b> baths</span><span><b>{listing.sqft ? Number(listing.sqft).toLocaleString() : '—'}</b> sq ft</span></div> : <><div className="condition"><b>Condition</b><span>{listing.item_condition === 'new' ? 'New' : 'Used'}</span></div>{available && <button className="btn btn-dark" onClick={buyNow} disabled={buying} style={{width:'100%',marginTop:18}}>{buying ? 'Opening secure checkout…' : `Buy now · ${price}`}</button>}</>}<div className="detailDescription"><h3>About this listing</h3><p>{listing.description || 'The seller has not added a description yet.'}</p></div><form onSubmit={contactSeller} className="messageForm">
  <h3>Interested in this listing?</h3>
  <p style={{color:'var(--muted)',fontSize:14,lineHeight:1.6}}>Message the seller to ask questions, confirm availability, or arrange the next step.</p>
  <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Hi, I'm interested in this listing…" rows={4}/>
  <button className="btn btn-dark" type="submit">Contact seller</button>
  {sent && <p className="successBox">Message sent. Check your dashboard for replies.</p>}
  {error && <p className="errorBox">{error}</p>}
</form></aside>
      </div>
    </section>
  </main>
}
