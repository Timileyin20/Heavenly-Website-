'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function ListingDetail() {
  const params = useParams<{ id: string }>()
  const [listing, setListing] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [favorite, setFavorite] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

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
    if (!user) { setError('Sign in to save this listing.'); return }
    if (favorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listing.id)
      setFavorite(false)
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, listing_id: listing.id })
      if (error) setError(error.message); else setFavorite(true)
    }
  }

  async function contactSeller(e: FormEvent) {
    e.preventDefault(); setError(''); setSent(false)
    if (!user) { setError('Sign in before messaging the seller.'); return }
    if (!message.trim()) return
    if (user.id === listing.seller_id) { setError('This is your own listing.'); return }
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: listing.seller_id, listing_id: listing.id, body: message.trim() })
    if (error) setError(error.message); else { setSent(true); setMessage('') }
  }

  if (!listing) return <main className="container" style={{padding:'70px 0'}}>Loading listing…</main>
  const isProperty = listing.kind === 'property'
  const price = `$${Number(listing.price).toLocaleString()}${isProperty && listing.property_mode === 'rent' ? '/mo' : ''}`
  const images = listing.images?.length ? listing.images : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85']

  return <main>
    <nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><div className="navLinks"><a href="/properties">Homes</a><a href="/marketplace">Marketplace</a></div><div className="navActions"><a href="/dashboard">Dashboard</a><a className="btn btn-dark" href="/sell">Sell on Havenly</a></div></nav>
    <section className="container detailPage">
      <a href={isProperty ? '/properties' : '/marketplace'} className="backLink">← Back to {isProperty ? 'homes' : 'marketplace'}</a>
      <div className="detailGrid">
        <div><div className="detailHero"><img src={images[0]} alt={listing.title}/><span className="pill">{isProperty ? (listing.property_mode === 'rent' ? 'For Rent' : 'For Sale') : (listing.item_condition === 'new' ? 'New' : 'Used')}</span></div>{images.length > 1 && <div className="thumbRow">{images.map((src:string,i:number)=><img key={i} src={src} alt="" onClick={(e)=>{const hero=(e.currentTarget.closest('.detailGrid')?.querySelector('.detailHero img') as HTMLImageElement|null);if(hero) hero.src=src}} style={{cursor:'pointer'}}/>)}</div>}</div>
        <aside className="detailPanel"><button className="saveButton" onClick={toggleFavorite}>{favorite ? '♥ Saved' : '♡ Save listing'}</button><span className="kicker">{isProperty ? 'PROPERTY' : (listing.category || 'MARKETPLACE')}</span><h1>{listing.title}</h1><div className="detailPrice">{price}</div><p className="detailLocation">{listing.city}{listing.state ? `, ${listing.state}` : ''}{listing.zip_code ? ` ${listing.zip_code}` : ''}</p>{isProperty ? <div className="stats"><span><b>{listing.beds ?? '—'}</b> beds</span><span><b>{listing.baths ?? '—'}</b> baths</span><span><b>{listing.sqft ? Number(listing.sqft).toLocaleString() : '—'}</b> sq ft</span></div> : <div className="condition"><b>Condition</b><span>{listing.item_condition === 'new' ? 'New' : 'Used'}</span></div>}<div className="detailDescription"><h3>About this listing</h3><p>{listing.description || 'The seller has not added a description yet.'}</p></div><form onSubmit={contactSeller} className="messageForm"><h3>Contact seller</h3><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Hi, I'm interested in this listing…" rows={4}/><button className="btn btn-dark" type="submit">Send message</button>{sent && <p className="successBox">Message sent. Check your dashboard for replies.</p>}{error && <p className="errorBox">{error}</p>}</form></aside>
      </div>
    </section>
  </main>
}
