'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  listing_id: string | null
  body: string
  created_at: string
}

type Listing = { id: string; title: string }

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [listings, setListings] = useState<Record<string, Listing>>({})
  const [selectedKey, setSelectedKey] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { window.location.replace('/signin'); return }
    setUser(auth.user)

    const { data, error: messageError } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,listing_id,body,created_at')
      .or(`sender_id.eq.${auth.user.id},receiver_id.eq.${auth.user.id}`)
      .order('created_at', { ascending: true })

    if (messageError) { setError(messageError.message); setLoading(false); return }

    const rows = data || []
    setMessages(rows)
    const ids = [...new Set(rows.map(x => x.listing_id).filter(Boolean))] as string[]
    if (ids.length) {
      const { data: listingRows } = await supabase.from('listings').select('id,title').in('id', ids)
      setListings(Object.fromEntries((listingRows || []).map(x => [x.id, x])))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('havenly-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const threads = useMemo(() => {
    if (!user) return [] as any[]
    const map = new Map<string, any>()
    for (const m of messages) {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id
      const key = `${other}:${m.listing_id || 'general'}`
      const current = map.get(key)
      map.set(key, {
        key,
        other,
        listing_id: m.listing_id,
        listingTitle: m.listing_id ? listings[m.listing_id]?.title || 'Listing' : 'General conversation',
        messages: current ? [...current.messages, m] : [m],
      })
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.messages.at(-1).created_at).getTime() - new Date(a.messages.at(-1).created_at).getTime())
  }, [messages, listings, user])

  useEffect(() => {
    if (!selectedKey && threads[0]) setSelectedKey(threads[0].key)
  }, [threads, selectedKey])

  const selected = threads.find(x => x.key === selectedKey) || threads[0]

  async function sendReply(e: FormEvent) {
    e.preventDefault()
    if (!user || !selected || !reply.trim()) return
    setSending(true); setError('')
    const { error: sendError } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selected.other,
      listing_id: selected.listing_id,
      body: reply.trim(),
    })
    if (sendError) setError(sendError.message)
    else { setReply(''); await load() }
    setSending(false)
  }

  if (loading) return <main className="container" style={{ padding: '90px 0' }}><p className="muted">Loading your conversations…</p></main>

  return <main style={{ minHeight: '100vh', background: 'var(--cream)' }}>
    <nav className="nav container">
      <a className="brand" href="/"><span className="brandMark">H</span> havenly</a>
      <div className="navActions"><a href="/dashboard">My Account</a><a className="btn btn-dark" href="/">Browse</a></div>
    </nav>
    <section className="container" style={{ padding: '48px 0 90px' }}>
      <span className="kicker">MESSAGES</span>
      <h1 style={{ margin: '8px 0' }}>Your conversations.</h1>
      <p className="muted">Keep questions, replies and listing conversations in one place.</p>
      {error && <div className="errorBox" style={{ marginTop: 20 }}>{error}</div>}
      {!threads.length ? <section className="adminPanel" style={{ marginTop: 32, padding: 28 }}><h2>No messages yet.</h2><p className="muted">Contact a seller from any listing to start a conversation.</p><a className="btn btn-dark" href="/properties">Browse homes</a></section> :
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, .75fr) minmax(0, 1.5fr)', gap: 18, marginTop: 32 }}>
          <aside style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            {threads.map(thread => <button key={thread.key} onClick={() => setSelectedKey(thread.key)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 18, border: 0, borderBottom: '1px solid var(--line)', background: thread.key === selected?.key ? 'var(--cream)' : '#fff', cursor: 'pointer' }}><b>{thread.listingTitle}</b><small style={{ display: 'block', color: 'var(--muted)', marginTop: 5 }}>{thread.messages.at(-1).body.slice(0, 70)}</small></button>)}
          </aside>
          <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 22, minHeight: 460, display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16 }}><span className="kicker">CONVERSATION</span><h2 style={{ margin: '5px 0 0' }}>{selected?.listingTitle}</h2></div>
            <div style={{ flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              {selected?.messages.map((m: Message) => <div key={m.id} style={{ alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start', maxWidth: '78%', padding: '11px 14px', borderRadius: 14, background: m.sender_id === user.id ? '#171717' : 'var(--cream)', color: m.sender_id === user.id ? '#fff' : 'inherit' }}><div>{m.body}</div><small style={{ opacity: .65, display: 'block', marginTop: 5 }}>{new Date(m.created_at).toLocaleString()}</small></div>)}
            </div>
            <form onSubmit={sendReply} style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 16 }}><input value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" style={{ flex: 1 }} /><button className="btn btn-dark" disabled={sending}>{sending ? 'Sending…' : 'Send'}</button></form>
          </section>
        </div>}
    </section>
  </main>
}
