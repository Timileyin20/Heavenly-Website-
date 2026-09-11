'use client'

import { useState } from 'react'

const methods = [
  { id: 'card', title: 'Debit or credit card', desc: 'Visa, Mastercard, American Express and other supported cards.', icon: '💳' },
  { id: 'wallet', title: 'Apple Pay / Google Pay', desc: 'Fast checkout with a supported mobile wallet when available on the buyer’s device.', icon: '📱' },
  { id: 'link', title: 'Link by Stripe', desc: 'Save payment details securely for faster checkout on supported devices.', icon: '⚡' },
  { id: 'cashapp', title: 'Cash App Pay', desc: 'A US-focused wallet option when enabled for the Havenly Stripe account.', icon: '💵' },
  { id: 'gift', title: 'Havenly Gift Card', desc: 'Redeem a Havenly gift-card balance at eligible marketplace checkout.', icon: '🎁' },
]

export default function CheckoutPage() {
  const [selected, setSelected] = useState('card')
  const [gift, setGift] = useState('')

  return <main>
    <nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><a href="/marketplace">Continue shopping</a></nav>
    <section className="container" style={{padding:'48px 0 90px',maxWidth:1050}}>
      <span className="kicker">SECURE CHECKOUT</span>
      <h1 style={{fontSize:48,letterSpacing:-2,marginBottom:10}}>Choose how you want to pay.</h1>
      <p className="muted" style={{maxWidth:720,lineHeight:1.7}}>Havenly is designed to offer flexible payment choices while keeping payment details out of sellers’ hands.</p>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(280px,.8fr)',gap:24,marginTop:34}}>
        <div className="card" style={{padding:24}}>
          {methods.map(m => <button key={m.id} onClick={() => setSelected(m.id)} style={{width:'100%',textAlign:'left',padding:'17px 16px',marginBottom:12,borderRadius:16,border:selected===m.id?'2px solid #111':'1px solid #ddd',background:selected===m.id?'#fafafa':'#fff',cursor:'pointer'}}>
            <div style={{display:'flex',gap:14,alignItems:'center'}}><span style={{fontSize:24}}>{m.icon}</span><span><b style={{display:'block'}}>{m.title}</b><small className="muted">{m.desc}</small></span></div>
          </button>)}
          {selected === 'gift' && <div style={{padding:'12px 0 2px'}}><label><b>Gift card code</b></label><input value={gift} onChange={e=>setGift(e.target.value)} placeholder="HAVENLY-XXXX-XXXX" style={{width:'100%',padding:14,marginTop:8,border:'1px solid #ccc',borderRadius:12}} /></div>}
          {selected !== 'gift' && <div style={{padding:'8px 2px'}}><b>Card details</b><p className="muted" style={{lineHeight:1.6}}>When Stripe Checkout is connected, the payment form will securely collect the selected payment method. Havenly will not store raw card numbers.</p></div>}
          <button className="btn primary" style={{width:'100%',marginTop:18}}>Continue to secure payment</button>
        </div>
        <aside className="card" style={{padding:24,height:'fit-content'}}><span className="kicker">PAYMENT PROTECTION</span><h3>Built for safer transactions.</h3><ul style={{lineHeight:1.9,paddingLeft:20}}><li>Encrypted payment processing</li><li>Seller never receives your card details</li><li>Order and payment status tracked</li><li>Eligible marketplace refunds supported</li></ul><p className="muted" style={{fontSize:13,lineHeight:1.6}}>Payment methods can vary by country, device, currency, and Havenly’s Stripe account configuration.</p></aside>
      </div>
    </section>
  </main>
}
