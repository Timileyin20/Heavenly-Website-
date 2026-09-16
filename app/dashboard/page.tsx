'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null)
  const [listings, setListings] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUser = sessionData.session?.user

      if (!sessionUser) {
        if (mounted) window.location.replace('/signin')
        return
      }

      const { data: freshUser, error: userError } = await supabase.auth.getUser()
      const currentUser = freshUser.user || sessionUser

      if (userError && !currentUser) {
        if (mounted) {
          setError('Your session could not be verified. Please sign in again.')
          setLoading(false)
        }
        return
      }

      if (!mounted) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, account_type, account_status')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (!mounted) return

      if (profile?.account_status && profile.account_status !== 'active') {
        await supabase.auth.signOut()
        window.location.replace('/signin')
        return
      }

      if (profile?.role === 'admin') {
        window.location.replace('/admin')
        return
      }

      const accountType = (profile?.account_type || currentUser.user_metadata?.account_type) as 'buyer' | 'seller' | undefined
      if (!accountType) {
        window.location.replace('/choose-role')
        return
      }

      setUser(currentUser)
      setRole(accountType)

      const [l, f, o, m] = await Promise.all([
        supabase.from('listings').select('*').eq('seller_id', currentUser.id).order('created_at', { ascending: false }),
        supabase.from('favorites').select('listing_id, listings(*)').eq('user_id', currentUser.id),
        supabase.from('orders').select('*').eq(accountType === 'buyer' ? 'buyer_id' : 'seller_id', currentUser.id).order('created_at', { ascending: false }),
        supabase.from('messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: false }),
      ])

      if (!mounted) return

      const firstError = l.error || f.error || o.error || m.error
      if (firstError) setError(firstError.message)

      setListings(l.data || [])
      setFavorites(f.data || [])
      setOrders(o.data || [])
      setMessages(m.data || [])
      setLoading(false)
    }

    loadDashboard()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        window.location.replace('/signin')
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.replace('/')
  }

  async function changeRole() {
    if (!role || !user) return
    const next = role === 'buyer' ? 'seller' : 'buyer'
    const { error: authError } = await supabase.auth.updateUser({ data: { account_type: next } })
    if (authError) {
      setError(authError.message)
      return
    }
    const { error: profileError } = await supabase.from('profiles').update({ account_type: next }).eq('id', user.id)
    if (profileError) {
      setError(profileError.message)
      return
    }
    window.location.reload()
  }

  if (loading) return <main className="container" style={{ padding: '90px 0' }}><p className="muted">Loading your Havenly account…</p></main>
  if (!user || !role) return null

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there'
  const firstName = name.split(' ')[0]
  const isBuyer = role === 'buyer'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <nav className="nav container">
        <a className="brand" href="/"><span className="brandMark">H</span> havenly</a>
        <div className="navActions">
          <a href="/">Browse</a>
          {isBuyer ? <a href="/sell" className="btn">Sell something</a> : <a href="/sell" className="btn btn-dark">+ Create listing</a>}
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </nav>

      <section className="container" style={{ padding: '52px 0 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <span className="kicker">MY ACCOUNT · {isBuyer ? 'BUYER' : 'SELLER'}</span>
            <h1 style={{ fontSize: 'clamp(38px,5vw,56px)', letterSpacing: -2.2, margin: '8px 0 8px' }}>Welcome, {firstName}.</h1>
            <p className="muted" style={{ margin: 0 }}>Your Havenly {role} dashboard — everything you need in one place.</p>
          </div>
          <button className="btn" onClick={changeRole}>Switch to {isBuyer ? 'Seller' : 'Buyer'}</button>
        </div>

        {error && <div style={{ marginTop: 22, padding: '12px 15px', borderRadius: 10, background: '#fff4f2', border: '1px solid #efd2cd', color: '#8d3028', fontSize: 13 }}>{error}</div>}

        <div className="dashStats" style={{ marginTop: 34 }}>
          {isBuyer ? <>
            <div><b>{orders.length}</b><span>Orders</span></div>
            <div><b>{favorites.length}</b><span>Saved listings</span></div>
            <div><b>{messages.length}</b><span>Messages</span></div>
          </> : <>
            <div><b>{listings.length}</b><span>My listings</span></div>
            <div><b>{orders.length}</b><span>Sales / orders</span></div>
            <div><b>{messages.length}</b><span>Messages</span></div>
          </>}
        </div>

        {isBuyer ? (
          <div className="dashGrid" style={{ marginTop: 36 }}>
            <section>
              <h2>My orders</h2>
              {orders.length ? <div className="dashList">{orders.map(order => <div key={order.id}><b>Order #{String(order.id).slice(0, 8)}</b><span>${Number(order.amount).toLocaleString()} · {order.status}</span><small>{new Date(order.created_at).toLocaleDateString()}</small></div>)}</div> : <p className="muted">Your purchases will appear here once you place an order.</p>}
            </section>
            <section>
              <h2>Saved listings</h2>
              {favorites.length ? <div className="dashList">{favorites.map(x => x.listings && <a href={`/listing/${x.listing_id}`} key={x.listing_id}><b>{x.listings.title}</b><span>${Number(x.listings.price).toLocaleString()} · {x.listings.city}</span></a>)}</div> : <p className="muted">Save homes and marketplace finds while browsing to see them here.</p>}
            </section>
            <section>
              <h2>Messages</h2>
              {messages.length ? <div className="dashList">{messages.slice(0, 8).map(x => <div key={x.id}><b>{x.sender_id === user.id ? 'You' : 'Seller / buyer'}</b><span>{x.body}</span><small>{new Date(x.created_at).toLocaleString()}</small></div>)}</div> : <p className="muted">Your conversations with sellers will appear here.</p>}
            </section>
          </div>
        ) : (
          <div className="dashGrid" style={{ marginTop: 36 }}>
            <section>
              <h2>My listings</h2>
              {listings.length ? <div className="dashList">{listings.map(x => <a href={`/listing/${x.id}`} key={x.id}><b>{x.title}</b><span>${Number(x.price).toLocaleString()} · {x.city}</span><small>{x.moderation_status === 'pending' ? 'Pending review' : x.moderation_status === 'rejected' ? 'Rejected' : x.status}</small></a>)}</div> : <div><p className="muted">You haven't listed anything yet.</p><a href="/sell" className="btn btn-dark">Create your first listing →</a></div>}
            </section>
            <section>
              <h2>Orders & sales</h2>
              {orders.length ? <div className="dashList">{orders.map(order => <div key={order.id}><b>Order #{String(order.id).slice(0, 8)}</b><span>${Number(order.amount).toLocaleString()} · {order.status}</span><small>{new Date(order.created_at).toLocaleDateString()}</small></div>)}</div> : <p className="muted">Orders from buyers will appear here when your listings receive purchases.</p>}
            </section>
            <section>
              <h2>Messages</h2>
              {messages.length ? <div className="dashList">{messages.slice(0, 8).map(x => <div key={x.id}><b>{x.sender_id === user.id ? 'You' : 'Buyer / seller'}</b><span>{x.body}</span><small>{new Date(x.created_at).toLocaleString()}</small></div>)}</div> : <p className="muted">Your buyer conversations will appear here.</p>}
            </section>
          </div>
        )}

        <section style={{ marginTop: 36, background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
          <span className="kicker">ACCOUNT</span>
          <h2 style={{ margin: '7px 0 10px' }}>Account details</h2>
          <p className="muted" style={{ margin: 0 }}>{name} · {user.email}{user.user_metadata?.phone ? ` · ${user.user_metadata.phone}` : ''}</p>
        </section>
      </section>
    </main>
  )
}
