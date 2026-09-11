'use client'

import { useState } from 'react'

const homes = [
  { id: 1, title: 'Modern Lakeview Residence', city: 'Austin, TX', price: '$845,000', meta: '4 bd · 3 ba · 2,680 sq ft', tag: 'For Sale', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85' },
  { id: 2, title: 'Sunlit Family Home', city: 'Irvine, CA', price: '$3,450/mo', meta: '3 bd · 2 ba · 1,940 sq ft', tag: 'For Rent', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85' },
  { id: 3, title: 'Contemporary City House', city: 'Dallas, TX', price: '$629,000', meta: '3 bd · 2.5 ba · 2,210 sq ft', tag: 'For Sale', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85' },
]

const items = [
  { id: 1, name: 'Mid-Century Lounge Chair', price: '$185', condition: 'Used · Excellent', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=85' },
  { id: 2, name: 'Minimal Oak Dining Set', price: '$420', condition: 'New', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85' },
  { id: 3, name: 'Smart Countertop Oven', price: '$129', condition: 'Used · Like New', image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=85' },
  { id: 4, name: 'Modern Table Lamp', price: '$65', condition: 'New', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85' },
]

export default function Home() {
  const [mode, setMode] = useState('Buy')
  const [query, setQuery] = useState('')

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
            <div className="searchInput"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode==='Marketplace'?'Search furniture, appliances, decor…':'City, ZIP code, neighborhood…'} /><button>Search</button></div>
          </div>
          <div className="heroTrust"><span>✓ Verified listings</span><span>✓ Secure payments</span><span>✓ Buyer protection</span></div>
        </div>
      </section>

      <section className="section container" id="homes">
        <div className="sectionHead"><div><span className="kicker">EXPLORE HOMES</span><h2>Places worth coming home to.</h2></div><a href="/properties" className="textLink">View all homes →</a></div>
        <div className="homeGrid">{homes.map(h => <article className="homeCard" key={h.id}><div className="cardImage"><img src={h.image} alt=""/><span className="pill">{h.tag}</span><button className="heart">♡</button></div><div className="cardBody"><div className="price">{h.price}</div><h3>{h.title}</h3><p>{h.city}</p><small>{h.meta}</small></div></article>)}</div>
      </section>

      <section className="splitSection">
        <div className="container split">
          <div className="splitCopy"><span className="kicker">MORE THAN REAL ESTATE</span><h2>Make your new place feel like <em>yours.</em></h2><p>From a first apartment to a forever home, find the furniture and appliances that complete your space — new or pre-loved.</p><a className="btn btn-dark" href="/marketplace">Shop the marketplace</a></div>
          <div className="itemShowcase"><img src={items[0].image} alt="Lounge chair"/><div className="floatingProduct"><span>Featured find</span><strong>{items[0].name}</strong><b>{items[0].price}</b></div></div>
        </div>
      </section>

      <section className="section container" id="marketplace">
        <div className="sectionHead"><div><span className="kicker">HAVENLY MARKETPLACE</span><h2>Good things for every room.</h2></div><a href="/marketplace" className="textLink">Browse everything →</a></div>
        <div className="itemGrid">{items.map(i => <article className="itemCard" key={i.id}><div className="itemImage"><img src={i.image} alt=""/><button className="heart">♡</button></div><div className="itemBody"><div><h3>{i.name}</h3><p>{i.condition}</p></div><strong>{i.price}</strong></div></article>)}</div>
      </section>

      <section className="policyBand" id="how"><div className="container policyInner"><div><span className="kicker">SHOP WITH CONFIDENCE</span><h2>Built around trust, not just transactions.</h2></div><div className="policyGrid"><div><b>7-day eligible returns</b><p>Eligible marketplace items can be returned within 7 days of delivery, subject to the item and seller policy.</p></div><div><b>Secure checkout</b><p>Payments are designed around Stripe's secure checkout infrastructure.</p></div><div><b>Safer listings</b><p>Report suspicious listings and keep communication and payments on-platform.</p></div></div></div></section>

      <footer><div className="container footerTop"><div><a className="brand light" href="#"><span className="brandMark">H</span> havenly</a><p>Find a place. Find a home. Find what you need.</p></div><div><b>Explore</b><a href="/properties">Homes</a><a href="/marketplace">Marketplace</a><a href="/sell">Sell on Havenly</a></div><div><b>Company</b><a href="#how">How it works</a><a href="/policy">Policies & safety</a><a href="/signin">Account</a></div></div><div className="container footerBottom"><span>© 2026 Havenly Marketplace</span><span>USA marketplace · USD</span></div></footer>
    </main>
  )
}
