'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Tab = 'overview' | 'listings' | 'users' | 'orders' | 'refunds' | 'activity'

type Listing = any
type Profile = any
type Order = any
type Refund = any

const money = (value: any) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: any) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [admin, setAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [listings, setListings] = useState<Listing[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [stats, setStats] = useState({ users: 0, listings: 0, active: 0, pending: 0, orders: 0, refunds: 0, revenue: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setChecking(false); setAdmin(false); setLoading(false); return }

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (me?.role !== 'admin') { setChecking(false); setAdmin(false); setLoading(false); return }
    setAdmin(true)

    const [usersRes, listingsRes, ordersRes, refundsRes, activityRes, activeRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(250),
      supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(250),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(250),
      supabase.from('refund_requests').select('*').order('created_at', { ascending: false }).limit(250),
      supabase.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending')
    ])

    const firstError = usersRes.error || listingsRes.error || ordersRes.error || refundsRes.error || activityRes.error
    if (firstError) setError(firstError.message)

    const nextUsers = usersRes.data || []
    const nextListings = listingsRes.data || []
    const nextOrders = ordersRes.data || []
    const nextRefunds = refundsRes.data || []
    setUsers(nextUsers)
    setListings(nextListings)
    setOrders(nextOrders)
    setRefunds(nextRefunds)
    setActivity(activityRes.data || [])
    setStats({
      users: usersRes.count ?? nextUsers.length,
      listings: nextListings.length,
      active: activeRes.count || nextListings.filter(x => x.moderation_status === 'approved').length,
      pending: pendingRes.count || nextListings.filter(x => x.moderation_status === 'pending').length,
      orders: nextOrders.length,
      refunds: nextRefunds.length,
      revenue: nextOrders.filter(x => ['paid', 'completed', 'processing'].includes(x.status)).reduce((sum, x) => sum + Number(x.amount || 0), 0)
    })
    setChecking(false)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function logAction(action_type: string, target_type: string, target_id: string | null, reason = '', metadata: any = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('admin_actions').insert({ admin_id: user.id, action_type, target_type, target_id, reason: reason || null, metadata })
  }

  async function moderateListing(item: Listing, decision: 'approve' | 'reject') {
    const reason = decision === 'reject' ? window.prompt('Enter the reason this listing is being denied:')?.trim() : ''
    if (decision === 'reject' && !reason) return
    const update = decision === 'approve'
      ? { moderation_status: 'approved', moderation_reason: null, moderated_at: new Date().toISOString(), status: 'active', updated_at: new Date().toISOString() }
      : { moderation_status: 'rejected', moderation_reason: reason, moderated_at: new Date().toISOString(), status: 'archived', updated_at: new Date().toISOString() }
    const { error: updateError } = await supabase.from('listings').update(update).eq('id', item.id)
    if (updateError) { setError(updateError.message); return }
    await logAction(decision === 'approve' ? 'listing_approved' : 'listing_rejected', 'listing', item.id, reason || '', { title: item.title })
    await load()
  }

  async function blockUser(profile: Profile) {
    if (profile.role === 'admin') return
    const reason = window.prompt(`Reason for blocking ${profile.full_name || 'this account'}:`)?.trim()
    if (!reason) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error: updateError } = await supabase.from('profiles').update({ account_status: 'blocked', block_reason: reason, blocked_at: new Date().toISOString(), blocked_by: user?.id || null }).eq('id', profile.id)
    if (updateError) { setError(updateError.message); return }
    await logAction('user_blocked', 'profile', profile.id, reason, { name: profile.full_name, account_type: profile.account_type })
    await load()
  }

  async function unblockUser(profile: Profile) {
    const { error: updateError } = await supabase.from('profiles').update({ account_status: 'active', block_reason: null, blocked_at: null, blocked_by: null }).eq('id', profile.id)
    if (updateError) { setError(updateError.message); return }
    await logAction('user_unblocked', 'profile', profile.id, '', { name: profile.full_name })
    await load()
  }

  async function updateRefund(refund: Refund, status: string) {
    const reason = status === 'rejected' ? window.prompt('Enter the reason for rejecting this refund:')?.trim() : ''
    if (status === 'rejected' && !reason) return
    const { error: updateError } = await supabase.from('refund_requests').update({ status }).eq('id', refund.id)
    if (updateError) { setError(updateError.message); return }
    await logAction(`refund_${status}`, 'refund_request', refund.id, reason || '', {})
    await load()
  }

  const filteredListings = useMemo(() => listings.filter(x => {
    const q = search.toLowerCase()
    const matchesSearch = !q || [x.title, x.city, x.state, x.kind, x.category].filter(Boolean).join(' ').toLowerCase().includes(q)
    const matchesFilter = filter === 'all' || (filter === 'pending' && x.moderation_status === 'pending') || (filter === 'approved' && x.moderation_status === 'approved') || (filter === 'rejected' && x.moderation_status === 'rejected')
    return matchesSearch && matchesFilter
  }), [listings, search, filter])

  const filteredUsers = useMemo(() => users.filter(x => {
    const q = search.toLowerCase()
    const matchesSearch = !q || [x.full_name, x.phone, x.account_type, x.role].filter(Boolean).join(' ').toLowerCase().includes(q)
    const matchesFilter = filter === 'all' || (filter === 'blocked' && x.account_status === 'blocked') || (filter === 'buyers' && x.account_type === 'buyer') || (filter === 'sellers' && x.account_type === 'seller')
    return matchesSearch && matchesFilter
  }), [users, search, filter])

  const nav = (value: Tab, label: string) => <button className={`adminNavItem ${tab === value ? 'active' : ''}`} onClick={() => { setTab(value); setSearch(''); setFilter('all') }}>{label}</button>

  if (checking) return <main className="container" style={{ padding: '80px 0' }}><h1>Loading admin console…</h1></main>
  if (!admin) return <main className="container" style={{ padding: '80px 0' }}><span className="kicker">HAVENLY ADMIN</span><h1>Admin access required.</h1><p className="muted">Sign in with an account that has the admin role.</p><a className="btn btn-dark" href="/signin">Sign in</a></main>

  return (
    <main className="adminPage">
      <nav className="nav container adminTopbar">
        <a className="brand" href="/"><span className="brandMark">H</span> havenly</a>
        <div className="navActions"><span className="adminPill">ADMIN CONTROL CENTER</span><a href="/">View site</a><a className="btn btn-dark" href="/dashboard">My account</a></div>
      </nav>

      <div className="adminShell container">
        <aside className="adminSidebar">
          <div className="adminProfile"><div className="adminAvatar">A</div><div><b>Administrator</b><small>Marketplace owner</small></div></div>
          <div className="adminNav">{nav('overview', 'Overview')}{nav('listings', 'Listings')}{nav('users', 'Users')}{nav('orders', 'Orders')}{nav('refunds', 'Refunds')}{nav('activity', 'Activity')}</div>
          <div className="adminSidebarFoot"><small>Havenly Marketplace</small><span>Control • Review • Protect</span></div>
        </aside>

        <section className="adminContent">
          <div className="adminPageHeader">
            <div><span className="kicker">{tab.toUpperCase()}</span><h1>{tab === 'overview' ? 'Marketplace overview' : tab === 'listings' ? 'Listing moderation' : tab === 'users' ? 'User management' : tab === 'orders' ? 'Orders & payments' : tab === 'refunds' ? 'Refund center' : 'Admin activity'}</h1><p className="muted">{tab === 'overview' ? 'A clear view of what is happening across Havenly.' : 'Manage marketplace activity from one secure control center.'}</p></div>
            <button className="btn btn-light" onClick={load}>{loading ? 'Refreshing…' : 'Refresh data'}</button>
          </div>
          {error && <div className="errorBox">{error}</div>}

          {tab === 'overview' && <>
            <div className="adminStats modernStats">
              <div><span>Total users</span><b>{stats.users}</b><small>Registered accounts</small></div>
              <div><span>Pending review</span><b>{stats.pending}</b><small>Listings awaiting approval</small></div>
              <div><span>Approved listings</span><b>{stats.active}</b><small>Marketplace inventory</small></div>
              <div><span>Orders</span><b>{stats.orders}</b><small>Recorded transactions</small></div>
              <div><span>Revenue</span><b>{money(stats.revenue)}</b><small>Paid/processing orders</small></div>
              <div><span>Refund requests</span><b>{stats.refunds}</b><small>Customer service queue</small></div>
            </div>
            <div className="adminGrid adminOverviewGrid">
              <section className="adminPanel"><div className="adminHead"><div><span className="kicker">ATTENTION</span><h2>Listings waiting for review</h2></div><button className="textLink" onClick={() => setTab('listings')}>Open moderation →</button></div>{listings.filter(x => x.moderation_status === 'pending').slice(0, 6).map(x => <div className="adminListItem" key={x.id}><div><b>{x.title}</b><small>{x.kind} · {x.city || 'Location not provided'} · {date(x.created_at)}</small></div><span className="statusBadge pending">Pending</span></div>)}{!listings.some(x => x.moderation_status === 'pending') && <p className="muted">No listings are waiting for review.</p>}</section>
              <section className="adminPanel"><div className="adminHead"><div><span className="kicker">RECENT</span><h2>Admin activity</h2></div><button className="textLink" onClick={() => setTab('activity')}>View all →</button></div>{activity.slice(0, 6).map(x => <div className="adminListItem" key={x.id}><div><b>{x.action_type.replaceAll('_', ' ')}</b><small>{x.reason || 'No reason recorded'}</small></div><small>{date(x.created_at)}</small></div>)}{activity.length === 0 && <p className="muted">No admin activity recorded yet.</p>}</section>
            </div>
          </>}

          {tab === 'listings' && <>
            <div className="adminToolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, city, category…" /><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All listings</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
            <section className="adminPanel"><div className="adminTable adminTableWide">{filteredListings.map(x => <div className="adminRow" key={x.id}><div className="rowMain"><b>{x.title || 'Untitled listing'}</b><small>{x.kind} · {x.city || 'No city'}{x.state ? `, ${x.state}` : ''} · {date(x.created_at)}</small></div><strong>{money(x.price)}</strong><span className={`statusBadge ${x.moderation_status || 'pending'}`}>{x.moderation_status || 'pending'}</span><div className="rowActions">{x.moderation_status !== 'approved' && <button onClick={() => moderateListing(x, 'approve')}>Approve</button>}{x.moderation_status !== 'rejected' && <button className="dangerBtn" onClick={() => moderateListing(x, 'reject')}>Deny</button>}</div></div>)}{filteredListings.length === 0 && <p className="muted">No listings match your search.</p>}</div></section>
          </>}

          {tab === 'users' && <>
            <div className="adminToolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, account type…" /><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All users</option><option value="buyers">Buyers</option><option value="sellers">Sellers</option><option value="blocked">Blocked</option></select></div>
            <section className="adminPanel"><div className="adminTable adminTableWide">{filteredUsers.map(x => <div className="adminRow" key={x.id}><div className="rowMain"><b>{x.full_name || 'Unnamed user'} {x.role === 'admin' && <span className="miniAdmin">ADMIN</span>}</b><small>{x.account_type || 'Account type not selected'} · {x.phone || 'No phone'} · Joined {date(x.created_at)}</small></div><span className={`statusBadge ${x.account_status === 'blocked' ? 'rejected' : 'approved'}`}>{x.account_status || 'active'}</span><div className="rowActions">{x.role !== 'admin' && (x.account_status === 'blocked' ? <button onClick={() => unblockUser(x)}>Unblock</button> : <button className="dangerBtn" onClick={() => blockUser(x)}>Block</button>)}</div></div>)}{filteredUsers.length === 0 && <p className="muted">No users match your search.</p>}</div></section>
          </>}

          {tab === 'orders' && <section className="adminPanel"><div className="adminTable adminTableWide">{orders.map(x => <div className="adminRow" key={x.id}><div className="rowMain"><b>Order {String(x.id).slice(0, 8)}</b><small>Buyer: {x.buyer_id ? String(x.buyer_id).slice(0, 8) : '—'} · Seller: {x.seller_id ? String(x.seller_id).slice(0, 8) : '—'} · {date(x.created_at)}</small></div><strong>{money(x.amount)}</strong><span className={`statusBadge ${x.status === 'paid' || x.status === 'completed' ? 'approved' : 'pending'}`}>{x.status || 'unknown'}</span></div>)}{orders.length === 0 && <p className="muted">No orders recorded yet.</p>}</div></section>}

          {tab === 'refunds' && <section className="adminPanel"><div className="adminTable adminTableWide">{refunds.map(x => <div className="adminRow" key={x.id}><div className="rowMain"><b>Refund {String(x.id).slice(0, 8)}</b><small>{x.reason || 'No reason supplied'} · {date(x.created_at)}</small></div><span className={`statusBadge ${x.status === 'approved' ? 'approved' : x.status === 'rejected' ? 'rejected' : 'pending'}`}>{x.status || 'pending'}</span><div className="rowActions">{x.status === 'pending' && <><button onClick={() => updateRefund(x, 'approved')}>Approve</button><button className="dangerBtn" onClick={() => updateRefund(x, 'rejected')}>Reject</button></>}</div></div>)}{refunds.length === 0 && <p className="muted">No refund requests yet.</p>}</div></section>}

          {tab === 'activity' && <section className="adminPanel"><div className="adminTable adminTableWide">{activity.map(x => <div className="adminRow" key={x.id}><div className="rowMain"><b>{x.action_type.replaceAll('_', ' ')}</b><small>{x.target_type} · {x.target_id ? String(x.target_id).slice(0, 12) : '—'} · {x.reason || 'No reason recorded'}</small></div><small>{date(x.created_at)}</small></div>)}{activity.length === 0 && <p className="muted">Admin actions will appear here as moderation and account controls are used.</p>}</div></section>}
        </section>
      </div>

      <style jsx>{`
        .adminShell{display:grid;grid-template-columns:230px 1fr;gap:28px;padding-top:28px;padding-bottom:70px}.adminSidebar{border:1px solid var(--line,#e7e5e1);border-radius:22px;background:#fff;padding:18px;height:fit-content;position:sticky;top:18px}.adminProfile{display:flex;gap:12px;align-items:center;padding:8px 8px 20px;border-bottom:1px solid var(--line,#e7e5e1)}.adminAvatar{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#111;color:#fff;font-weight:800}.adminProfile b,.adminProfile small{display:block}.adminProfile small,.adminSidebarFoot small,.adminSidebarFoot span{font-size:12px;color:#777}.adminNav{display:grid;gap:5px;padding:18px 0}.adminNavItem{border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:11px;font:inherit;color:#666;cursor:pointer}.adminNavItem:hover,.adminNavItem.active{background:#f4f3f0;color:#111;font-weight:700}.adminSidebarFoot{border-top:1px solid var(--line,#e7e5e1);padding:16px 8px 2px}.adminSidebarFoot span{display:block;margin-top:3px}.adminContent{min-width:0}.adminPageHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:24px}.adminPageHeader h1{margin:5px 0 4px}.adminPill,.miniAdmin{font-size:10px;letter-spacing:.08em;font-weight:800;border:1px solid #ddd;border-radius:999px;padding:6px 9px}.modernStats{grid-template-columns:repeat(3,1fr);gap:12px}.modernStats>div{min-height:115px;padding:18px;border:1px solid var(--line,#e7e5e1);border-radius:18px;background:#fff}.modernStats span,.modernStats small{display:block;color:#777;font-size:12px}.modernStats b{display:block;font-size:28px;margin:9px 0 3px}.adminOverviewGrid{margin-top:18px}.adminListItem{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #eee}.adminListItem:last-child{border-bottom:0}.adminListItem b,.adminListItem small{display:block}.adminListItem small{font-size:12px;color:#777;margin-top:4px}.adminToolbar{display:flex;gap:10px;margin-bottom:14px}.adminToolbar input,.adminToolbar select{border:1px solid #ddd;border-radius:11px;padding:11px 12px;background:#fff;font:inherit}.adminToolbar input{flex:1}.adminToolbar select{min-width:150px}.adminTableWide{overflow:hidden}.adminRow{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:16px;align-items:center;padding:16px 0;border-bottom:1px solid #eee}.adminRow:last-child{border-bottom:0}.rowMain b,.rowMain small{display:block}.rowMain{min-width:0}.rowMain b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rowMain small{color:#777;font-size:12px;margin-top:4px}.statusBadge{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;background:#f1f1ef;color:#555;font-size:11px;font-weight:700;text-transform:capitalize}.statusBadge.pending{background:#fff4d8;color:#795b00}.statusBadge.approved{background:#e8f6ed;color:#176437}.statusBadge.rejected{background:#fdeaea;color:#9b2929}.rowActions{display:flex;gap:6px;justify-content:flex-end}.rowActions button{border:1px solid #ddd;background:#fff;border-radius:9px;padding:8px 10px;font:inherit;font-size:12px;cursor:pointer}.rowActions button:hover{background:#f5f5f3}.rowActions .dangerBtn{color:#a02d2d;border-color:#efcaca}.textLink{border:0;background:transparent;cursor:pointer;font:inherit;color:#555}.btn-light{border:1px solid #ddd;background:#fff}.errorBox{margin-bottom:16px}.adminTopbar{margin-bottom:4px}.adminTopbar .navActions{gap:12px}@media(max-width:900px){.adminShell{grid-template-columns:1fr}.adminSidebar{position:static}.adminNav{grid-template-columns:repeat(3,1fr)}.modernStats{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.adminPageHeader{align-items:flex-start;flex-direction:column}.modernStats{grid-template-columns:1fr}.adminToolbar{flex-direction:column}.adminRow{grid-template-columns:1fr;gap:9px}.rowActions{justify-content:flex-start}.adminNav{grid-template-columns:repeat(2,1fr)}.adminPill{display:none}}
      `}</style>
    </main>
  )
}
