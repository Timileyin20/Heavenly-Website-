'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const MAX_IMAGES = 8
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const BUCKET = 'listing-images'

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState({ title: '', price: '', description: '', city: '', state: '', zip_code: '' })
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
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
        .select('id,title,price,description,city,state,zip_code,images,seller_id,status,moderation_status,moderation_reason')
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
      setExistingImages(Array.isArray(data.images) ? data.images : [])
      setListingStatus(data.status || '')
      setModerationStatus(data.moderation_status || '')
      setModerationReason(data.moderation_reason || '')
      setLoading(false)
    })()

    return () => { mounted = false }
  }, [id])

  useEffect(() => {
    const urls = newImages.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [newImages])

  function addImages(files: FileList | null) {
    if (!files) return
    setError('')
    const incoming = Array.from(files)
    if (existingImages.length + newImages.length + incoming.length > MAX_IMAGES) {
      setError(`You can have a maximum of ${MAX_IMAGES} images per listing.`)
      return
    }
    const invalidType = incoming.find(file => !file.type.startsWith('image/'))
    if (invalidType) {
      setError('Only image files can be uploaded.')
      return
    }
    const oversized = incoming.find(file => file.size > MAX_IMAGE_SIZE)
    if (oversized) {
      setError('Each image must be 10 MB or smaller.')
      return
    }
    setNewImages(current => [...current, ...incoming])
  }

  function removeExistingImage(index: number) {
    setExistingImages(images => images.filter((_, i) => i !== index))
  }

  function removeNewImage(index: number) {
    setNewImages(files => files.filter((_, i) => i !== index))
  }

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

    if (existingImages.length + newImages.length > MAX_IMAGES) {
      setError(`You can have a maximum of ${MAX_IMAGES} images per listing.`)
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

    const uploadedUrls: string[] = []
    for (const file of newImages) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
      const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`)
        setSaving(false)
        return
      }
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      uploadedUrls.push(publicData.publicUrl)
    }

    const finalImages = [...existingImages, ...uploadedUrls]

    const { error } = await supabase
      .from('listings')
      .update({
        title,
        price,
        description: form.description.trim(),
        city,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        images: finalImages,
        status: 'draft',
        moderation_status: 'pending',
        moderation_reason: null,
      })
      .eq('id', id)
      .eq('seller_id', auth.user.id)

    if (error) setError(error.message)
    else {
      setNewImages([])
      setExistingImages(finalImages)
      setListingStatus('draft')
      setModerationStatus('pending')
      setModerationReason('')
      setMessage('Changes and photos saved. Your listing is now Pending Review and will become public only after admin approval.')
    }
    setSaving(false)
  }

  if (loading) return <main className="container" style={{ padding: 90 }}>Loading listing…</main>

  const isRejected = moderationStatus === 'rejected'
  const isApproved = moderationStatus === 'approved' && listingStatus === 'active'
  const imageCount = existingImages.length + newImages.length

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

      <div className="listingForm" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Listing photos</h2>
        <p className="muted">Keep, remove or add photos. You can use up to {MAX_IMAGES} images, with each image up to 10 MB.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
          {existingImages.map((url, index) => <div key={`${url}-${index}`} style={{ position: 'relative' }}>
            <img src={url} alt={`Listing photo ${index + 1}`} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 12, border: '1px solid #ddd' }} />
            <button type="button" onClick={() => removeExistingImage(index)} aria-label={`Remove listing photo ${index + 1}`} style={{ position: 'absolute', top: 8, right: 8, border: 0, borderRadius: 999, padding: '6px 9px', cursor: 'pointer' }}>Remove</button>
          </div>)}
          {previews.map((url, index) => <div key={url} style={{ position: 'relative' }}>
            <img src={url} alt={`New listing photo ${index + 1}`} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 12, border: '1px solid #ddd' }} />
            <button type="button" onClick={() => removeNewImage(index)} aria-label={`Remove new listing photo ${index + 1}`} style={{ position: 'absolute', top: 8, right: 8, border: 0, borderRadius: 999, padding: '6px 9px', cursor: 'pointer' }}>Remove</button>
          </div>)}
        </div>
        <label style={{ display: 'inline-block', marginTop: 18 }}>
          <span className="btn btn-dark" style={{ display: 'inline-block', cursor: imageCount >= MAX_IMAGES ? 'not-allowed' : 'pointer', opacity: imageCount >= MAX_IMAGES ? 0.5 : 1 }}>+ Add photos</span>
          <input type="file" accept="image/*" multiple disabled={imageCount >= MAX_IMAGES} onChange={e => { addImages(e.target.files); e.currentTarget.value = '' }} style={{ display: 'none' }} />
        </label>
        <p className="muted" style={{ marginBottom: 0 }}>{imageCount}/{MAX_IMAGES} photos selected.</p>
      </div>

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
