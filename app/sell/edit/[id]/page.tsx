'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState({ title: '', price: '', description: '', city: '', state: '', zip_code: '' })
  const [listingStatus, setListingStatus] = useState('')
  const [moderationStatus, setModerationStatus] = useState('')
  const [moderationReason, setModerationReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { window.location.replace('/signin'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type,account_status')
        .eq('id', auth.user.id)
        .maybeSingle()

      if (!mounted) return
      if (profile?.account_status && profile.account_status !== 'active') {
        setError('Your account is blocked or suspended. You cannot edit listings right now.')
        setLoading(false)
        return
      }
      if (profile?.account_type !== 'seller') {
        setError('Switch your account to Seller before editing a listing.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select('id,title,price,description,city,state,zip_code,seller_id,status,moderation_status,moderation_reason')
        .eq('id', id)
        .eq('seller_id', auth.user.id)
        .maybeSingle()

      if (!mounted) return
      if (error || !data) {
        setError('Listing not found or you do not have permission to edit it.')
        setLoading(false)
        return
      }
      setForm({
        title: data.title || '',
        price: String(data.price ?? ''),
        description: data.description || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
      })
      setListingStatus(data.status || '')
      setModerationStatus(data.moderation_status || '')
      setModerationReason(data.moderation_reason || '')
      setLoading(false)
    })()

    return () => { mounted = false }
  }, [id])

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('')

    const title = form.title.trim()
    const city = form.city.trim()
    const price = Number(form.price)

    if (!title || !city || !Number.isFinite(price) || price <= 0) {
      setError('Please provide a valid title, price and city. Price must be greater than 0.')
      setSaving(false)
      return
    }

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { window.location.replace('/signin'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type,account_status')
      .eq('id', auth.user.id)
      .maybeSingle()

    if (profile?.account_status && profile.account_status !== 'active') {
      setError('Your account is blocked or suspended. You cannot edit listings right now.')
      setSaving(false)
      return
    }
    if (profile?.account_type !== 'seller') {
      setError('Only seller accounts can edit listings.')
      setSaving(false)
      return
    }

    const { data: ownedListing, error: ownershipError } = await supabase
      .from('listings')
      .select('id,seller_id,status,moderation_status')
      .eq('id', id)
      .eq('seller_id', auth.user.id)
      .maybeSingle()

    if (ownershipError || !ownedListing) {
      setError('Listing not found or you do not have permission to edit it.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('listings')
      .update({
        title,
        price,
        description: form.description.trim(),
        city,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        status: 'draft',
        moderation_status: 'pending',
        moderation_reason: null,
      })
      .eq('id', id)
      .eq('seller_id', auth.user.id)

    if (error) setError(error.message)
    else {
      setListingStatus('draft')
      setModerationStatus('pending')
      setModerationReason('')
      setMessage('Changes saved. Your listing is now Pending Review and will become public only after admin approval.')
    }
    setSaving(false)
  }

  if (loading) return <main className="container" style={{ padding: 90 }}>Loading listing…</main>

  const isRejected = moderationStatus === 'rejected'
  const isApproved = moderationStatus === 'approved' && listingStatus === 'active'

  return <main>
    <nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><div className="navActions"><a href="/dashboard">Dashboard</a><a href="/">Browse</a></div></nav>
    <section className="container sellPage">
      <span className="kicker">EDIT LISTING</span>
      <h1>Update your listing.</h1>
      {isRejected && <div className="errorBox"><strong>Listing rejected.</strong>{moderationReason ? ` Admin reason: ${moderationReason}` : ' Please review your information and make the necessary changes before resubmitting.'}</div>}
      {isApproved && <div className="successBox">This listing is currently approved and public. Saving any changes will send it back to Pending Review.</div>}
      {!isRejected && !isApproved && moderationStatus === 'pending' && <div className="notice"><strong>Pending Review.</strong> Your listing is waiting for administrator approval.</div>}
      {message && <div className="successBox">{message}</div>}
      {error && <div className="errorBox">{error}</div>}
      <form onSubmit={save} className="listingForm">
        <div className="formGrid">
          <label className="full">Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
          <label>Price (USD)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
          <label>City<input required value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
          <label>State<input value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label>
          <label>ZIP code<input value={form.zip_code} onChange={e=>setForm({...form,zip_code:e.target.value})}/></label>
          <label className="full">Description<textarea rows={7} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        </div>
        <p className="muted">Any saved change resets the listing to <b>Pending Review</b>. This keeps edited information from becoming public before admin review.</p>
        <button className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : 'Save & submit for review →'}</button>
      </form>
    </section>
  </main>
}
