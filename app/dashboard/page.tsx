'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null), [role, setRole] = useState<'buyer'|'seller'|null>(null)
  const [listings,setListings]=useState<any[]>([]),[favorites,setFavorites]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]),[messages,setMessages]=useState<any[]>([])
  const [loading,setLoading]=useState(true),[error,setError]=useState('')

  async function loadDashboard() {
    setLoading(true); setError('')
    const {data: sd}=await supabase.auth.getSession(); const sessionUser=sd.session?.user
    if(!sessionUser){window.location.replace('/signin');return}
    const {data: fresh,error:userError}=await supabase.auth.getUser(); const current=fresh.user||sessionUser
    if(userError&&!current){setError('Your session could not be verified.');setLoading(false);return}
    const {data:profile}=await supabase.from('profiles').select('role,account_type,account_status').eq('id',current.id).maybeSingle()
    if(profile?.account_status&&profile.account_status!=='active'){await supabase.auth.signOut();window.location.replace('/signin');return}
    if(profile?.role==='admin'){window.location.replace('/admin');return}
    const account=(profile?.account_type||current.user_metadata?.account_type) as 'buyer'|'seller'|undefined
    if(!account){window.location.replace('/choose-role');return}
    setUser(current);setRole(account)
    const [l,f,o,m]=await Promise.all([
      supabase.from('listings').select('*').eq('seller_id',current.id).order('created_at',{ascending:false}),
      supabase.from('favorites').select('listing_id,listings(*)').eq('user_id',current.id),
      supabase.from('orders').select('*').eq(account==='buyer'?'buyer_id':'seller_id',current.id).order('created_at',{ascending:false}),
      supabase.from('messages').select('*').or(`sender_id.eq.${current.id},receiver_id.eq.${current.id}`).order('created_at',{ascending:false})
    ])
    const first=l.error||f.error||o.error||m.error;if(first)setError(first.message)
    setListings(l.data||[]);setFavorites(f.data||[]);setOrders(o.data||[]);setMessages(m.data||[]);setLoading(false)
  }

  useEffect(()=>{loadDashboard();const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>{if(!s)window.location.replace('/signin')});return()=>listener.subscription.unsubscribe()},[])
  async function signOut(){await supabase.auth.signOut();window.location.replace('/')}
  async function changeRole(){if(!role||!user)return;const next=role==='buyer'?'seller':'buyer';const {error:a}=await supabase.auth.updateUser({data:{account_type:next}});if(a){setError(a.message);return}const {error:p}=await supabase.from('profiles').update({account_type:next}).eq('id',user.id);if(p){setError(p.message);return}window.location.reload()}
  async function deleteListing(id:string){if(!confirm('Delete this listing? This cannot be undone.'))return;const {error}=await supabase.from('listings').delete().eq('id',id).eq('seller_id',user.id);if(error)setError(error.message);else setListings(x=>x.filter(i=>i.id!==id))}

  if(loading)return <main className="container" style={{padding:'90px 0'}}><p className="muted">Loading your Havenly account…</p></main>
  if(!user||!role)return null
  const name=user.user_metadata?.full_name||user.email?.split('@')[0]||'there', first=name.split(' ')[0], isBuyer=role==='buyer'
  return <main style={{minHeight:'100vh',background:'var(--cream)'}}><nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><div className="navActions"><a href="/">Browse</a><a href="/messages">Messages</a><a href="/sell" className="btn btn-dark">{isBuyer?'Sell something':'+ Create listing'}</a><button className="btn" onClick={signOut}>Sign out</button></div></nav><section className="container" style={{padding:'52px 0 100px'}}><div style={{display:'flex',justifyContent:'space-between',gap:24,alignItems:'end',flexWrap:'wrap'}}><div><span className="kicker">MY ACCOUNT · {isBuyer?'BUYER':'SELLER'}</span><h1 style={{fontSize:'clamp(38px,5vw,56px)',letterSpacing:-2.2,margin:'8px 0'}}>Welcome, {first}.</h1><p className="muted">Your Havenly {role} dashboard — everything you need in one place.</p></div><button className="btn" onClick={changeRole}>Switch to {isBuyer?'Seller':'Buyer'}</button></div>{error&&<div className="errorBox" style={{marginTop:22}}>{error}</div>}<div className="dashStats" style={{marginTop:34}}>{isBuyer?<><div><b>{orders.length}</b><span>Orders</span></div><div><b>{favorites.length}</b><span>Saved listings</span></div><div><b>{messages.length}</b><span>Messages</span></div></>:<><div><b>{listings.length}</b><span>My listings</span></div><div><b>{listings.filter(x=>x.moderation_status==='pending').length}</b><span>Pending review</span></div><div><b>{messages.length}</b><span>Messages</span></div></>}</div>{isBuyer?<div className="dashGrid" style={{marginTop:36}}><section><h2>My orders</h2>{orders.length?<div className="dashList">{orders.map(o=><div key={o.id}><b>Order #{String(o.id).slice(0,8)}</b><span>${Number(o.amount).toLocaleString()} · {o.status}</span><small>{new Date(o.created_at).toLocaleDateString()}</small></div>)}</div>:<p className="muted">Your purchases will appear here once you place an order.</p>}</section><section><h2>Saved listings</h2>{favorites.length?<div className="dashList">{favorites.map(x=>x.listings&&<a href={`/listing/${x.listing_id}`} key={x.listing_id}><b>{x.listings.title}</b><span>${Number(x.listings.price).toLocaleString()} · {x.listings.city}</span></a>)}</div>:<p className="muted">Save homes and marketplace finds while browsing.</p>}</section><section><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><h2>Messages</h2><a className="btn" href="/messages">View all conversations →</a></div>{messages.length?<div className="dashList">{messages.slice(0,8).map(x=><div key={x.id}><b>{x.sender_id===user.id?'You':'Conversation'}</b><span>{x.body}</span><small>{new Date(x.created_at).toLocaleString()}</small></div>)}</div>:<p className="muted">Your conversations will appear here.</p>}</section></div>:<div className="dashGrid" style={{marginTop:36}}><section style={{gridColumn:'1 / -1'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><h2>My listings</h2><a className="btn btn-dark" href="/sell">+ New listing</a></div>{listings.length?<div className="dashList">{listings.map(x=><div key={x.id} style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'center',flexWrap:'wrap'}}><div><b>{x.title}</b><span>${Number(x.price).toLocaleString()} · {x.city}</span><small>{x.moderation_status==='pending'?'Pending review':x.moderation_status==='rejected'?`Rejected${x.moderation_reason?`: ${x.moderation_reason}`:''}`:x.status}</small></div><div style={{display:'flex',gap:8}}><a className="btn" href={`/sell/edit/${x.id}`}>Edit</a><button className="btn" onClick={()=>deleteListing(x.id)}>Delete</button></div></div>)}</div>:<p className="muted">You haven't listed anything yet.</p>}</section><section><h2>Orders & sales</h2>{orders.length?<div className="dashList">{orders.slice(0,8).map(o=><div key={o.id}><b>Order #{String(o.id).slice(0,8)}</b><span>${Number(o.amount).toLocaleString()} · {o.status}</span></div>)}</div>:<p className="muted">Buyer orders will appear here.</p>}</section><section><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><h2>Messages</h2><a className="btn" href="/messages">View all conversations →</a></div>{messages.length?<div className="dashList">{messages.slice(0,8).map(x=><div key={x.id}><b>{x.sender_id===user.id?'You':'Conversation'}</b><span>{x.body}</span></div>)}</div>:<p className="muted">Your conversations will appear here.</p>}</section></div>}<section style={{marginTop:36,background:'#fff',border:'1px solid var(--line)',borderRadius:16,padding:24}}><span className="kicker">ACCOUNT</span><h2 style={{margin:'7px 0 10px'}}>Account details</h2><p className="muted" style={{margin:0}}>{name} · {user.email}</p></section></section></main>
}
