'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPage(){
  const [checking,setChecking]=useState(true),[admin,setAdmin]=useState(false),[stats,setStats]=useState({users:0,listings:0,orders:0,refunds:0}),[listings,setListings]=useState<any[]>([]),[refunds,setRefunds]=useState<any[]>([]),[error,setError]=useState('')

  async function load(){
    setChecking(true); setError('')
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){setChecking(false);return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()
    if(profile?.role!=='admin'){setChecking(false);return}
    setAdmin(true)
    const [u,l,o,r]=await Promise.all([
      supabase.from('profiles').select('id',{count:'exact',head:true}),
      supabase.from('listings').select('*').order('created_at',{ascending:false}).limit(20),
      supabase.from('orders').select('id',{count:'exact',head:true}),
      supabase.from('refund_requests').select('*').order('created_at',{ascending:false}).limit(20)
    ])
    setStats({users:u.count||0,listings:l.data?.length||0,orders:o.count||0,refunds:r.data?.length||0})
    setListings(l.data||[]);setRefunds(r.data||[])
    if(l.error||r.error)setError((l.error||r.error)?.message||'Unable to load admin data.')
    setChecking(false)
  }

  useEffect(()=>{load()},[])

  async function updateListing(id:string,status:string){
    const {error}=await supabase.from('listings').update({status,updated_at:new Date().toISOString()}).eq('id',id)
    if(error)setError(error.message); else load()
  }

  if(checking)return <main className="container" style={{padding:'80px 0'}}><h1>Loading admin console…</h1></main>
  if(!admin)return <main className="container" style={{padding:'80px 0'}}><span className="kicker">HAVENLY ADMIN</span><h1>Admin access required.</h1><p className="muted">Sign in with an account that has the admin role.</p><a className="btn btn-dark" href="/signin">Sign in</a></main>

  return <main className="adminPage"><nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><div className="navActions"><a href="/dashboard">My account</a><a className="btn btn-dark" href="/sell">Create listing</a></div></nav><section className="container adminWrap">
    <div><span className="kicker">CONTROL CENTER</span><h1>Admin dashboard</h1><p className="muted">Moderate the marketplace and monitor commerce activity.</p></div>
    {error&&<div className="errorBox">{error}</div>}
    <div className="adminStats"><div><b>{stats.users}</b><span>Users</span></div><div><b>{stats.listings}</b><span>Recent listings</span></div><div><b>{stats.orders}</b><span>Orders</span></div><div><b>{stats.refunds}</b><span>Refund requests</span></div></div>
    <div className="adminGrid"><section className="adminPanel"><div className="adminHead"><div><span className="kicker">MODERATION</span><h2>Recent listings</h2></div><a href="/properties" className="textLink">View marketplace →</a></div>{listings.length===0?<p className="muted">No listings yet.</p>:<div className="adminTable">{listings.map(x=><div className="adminRow" key={x.id}><div><b>{x.title}</b><small>{x.kind} · {x.city}{x.state?', '+x.state:''}</small></div><strong>${Number(x.price).toLocaleString()}</strong><span className="statusBadge">{x.status}</span><div className="rowActions"><button onClick={()=>updateListing(x.id,'active')}>Approve</button><button onClick={()=>updateListing(x.id,'archived')}>Archive</button></div></div>)}</div>}</section>
    <section className="adminPanel"><div className="adminHead"><div><span className="kicker">CUSTOMER CARE</span><h2>Refund requests</h2></div></div>{refunds.length===0?<p className="muted">No refund requests yet.</p>:<div className="adminTable">{refunds.map(x=><div className="adminRow" key={x.id}><div><b>Request {x.id.slice(0,8)}</b><small>{x.reason}</small></div><span className="statusBadge">{x.status}</span><small>{new Date(x.created_at).toLocaleDateString()}</small></div>)}</div>}</section></div>
  </section></main>
}
