'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'


export default function Home() {
  const [mode, setMode] = useState('Buy')
  const [query, setQuery] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  
const [homes, setHomes] = useState<any[]>([])
const [items, setItems] = useState<any[]>([])
const [loadingListings, setLoadingListings] = useState(true)

useEffect(() => {
  async function loadListings() {
    setLoadingListings(true)

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setHomes(data.filter((listing) => listing.kind === 'property').slice(0, 3))
      setItems(data.filter((listing) => listing.kind === 'item').slice(0, 4))
    }

    setLoadingListings(false)
  }

  loadListings()
}, [])
  return (
    <main>
      <nav className="nav container">
        <a className="brand" href="#"><span className="brandMark">H</span> havenly</a>
        <div className="navLinks">
          <a href="#homes">Homes</a><a href="#marketplace">Marketplace</a><a href="#how">How it works</a>
        </div>
        <div className="navActions"><a href="/signin">Sign in</a><a className="btn btn-dark" href="/sell">List a property</a></div>
      </nav>

      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent container">
          <div className="eyebrow">A better way to find what feels like home</div>
          <h1>Find your next <em>place</em> to call home.</h1>
          <p>Discover homes for sale and rent, plus quality furniture and household essentials from trusted sellers across the USA.</p>
          <div className="searchBox">
            <div className="segmented">
              {['Buy','Rent','Marketplace'].map(x => <button key={x} className={mode===x?'active':''} onClick={()=>setMode(x)}>{x}</button>)}
            </div>
            <div className="searchInput"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode==='Marketplace'?'Search furniture, appliances, decor…':'City, ZIP code, neighborhood…'} /><button
  onClick={() => {
    window.location.href =
      mode === 'Marketplace'
        ? `/marketplace?search=${encodeURIComponent(query)}`
        : `/properties?search=${encodeURIComponent(query)}&mode=${encodeURIComponent(mode)}`
  }}
>
  Search
</button></div>
          </div>
          <div className="heroTrust"><span>✓ Verified listings</span><span>✓ Secure payments</span><span>✓ Buyer protection</span></div>
        </div>
      </section>

      <section className="section container" id="homes">
        <div className="sectionHead"><div><span className="kicker">EXPLORE HOMES</span><h2>Places worth coming home to.</h2></div><a href="/properties" className="textLink">View all homes →</a></div>
        <div className="homeGrid">{homes.map(h => <a href={`/listing/${h.id}`} className="homeCard" key={h.id}><div className="cardImage"><img src={h.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85'} alt={h.title}/><span className="pill">
  {h.property_mode === 'rent' ? 'For Rent' : 'For Sale'}
</span><button className="heart">♡</button></div><div className="cardBody"><div className="price">
  {h.property_mode === 'rent' ? `$${Number(h.price).toLocaleString()}/mo` : `$${Number(h.price).toLocaleString()}`}
</div><h3>{h.title}</h3><p>{h.city}</p><small>{h.beds || 0} bd · {h.baths || 0} ba · {h.sqft ? `${Number(h.sqft).toLocaleString()} sq ft` : 'Size not listed'}</small></div></a>)}</div>
      </section>

      <section className="splitSection">
        <div className="container split">
          <div className="splitCopy"><span className="kicker">MORE THAN REAL ESTATE</span><h2>Make your new place feel like <em>yours.</em></h2><p>From a first apartment to a forever home, find the furniture and appliances that complete your space — new or pre-loved.</p><a className="btn btn-dark" href="/marketplace">Shop the marketplace</a></div>
          <div className="itemShowcase"><img src={items[0]?.images?.[0] || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=85'} alt={items[0]?.title || 'Featured item'}/><div className="floatingProduct"><span>Featured find</span><strong>{items[0]?.title || 'Featured item'}</strong><b>{items[0]?.price ? `$${Number(items[0].price).toLocaleString()}` : ''}</b></div></div>
        </div>
      </section>

      <section className="section container" id="marketplace">
        <div className="sectionHead"><div><span className="kicker">HAVENLY MARKETPLACE</span><h2>Good things for every room.</h2></div><a href="/marketplace" className="textLink">Browse everything →</a></div>
        <div className="itemGrid">{items.map(i => <a href={`/listing/${i.id}`} className="itemCard" key={i.id}><div className="itemImage"><img src={i.images?.[0] || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=85'} alt={i.title}/><span className="heart">♡</span></div><div className="itemBody"><div><h3>{i.title}</h3><p>{i.item_condition || 'Condition not listed'}</p></div><strong>${Number(i.price).toLocaleString()}</strong></div></a>)}</div>
      </section>

      <section className="policyBand" id="how"><div className="container policyInner"><div><span className="kicker">SHOP WITH CONFIDENCE</span><h2>Built around trust, not just transactions.</h2></div><div className="policyGrid"><div><b>7-day eligible returns</b><p>Eligible marketplace items can be returned within 7 days of delivery, subject to the item and seller policy.</p></div><div><b>Secure checkout</b><p>Payments are designed around Stripe's secure checkout infrastructure.</p></div><div><b>Safer listings</b><p>Report suspicious listings and keep communication and payments on-platform.</p></div></div></div></section>

      <footer><div className="container footerTop"><div><a className="brand light" href="#"><span className="brandMark">H</span> havenly</a><p>Find a place. Find a home. Find what you need.</p></div><div><b>Explore</b><a href="/properties">Homes</a><a href="/marketplace">Marketplace</a><a href="/sell">Sell on Havenly</a></div><div><b>Company</b><a href="#how">How it works</a><a href="/policy">Policies & safety</a><a href="/signin">Account</a></div></div><div className="container footerBottom"><span>© 2026 Havenly Marketplace</span><span>USA marketplace · USD</span></div></footer>
    </main>
  )
}
