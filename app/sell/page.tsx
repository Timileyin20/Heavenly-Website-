'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

const categories = ['Furniture','Appliances','Electronics','Home & Garden','Other']
const MAX_IMAGES = 8
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

async function getAccount(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('account_type, account_status')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export default function SellPage() {
  const [user, setUser] = useState<any>(null)
  const [kind, setKind] = useState<'property'|'item'>('property')
  const [mode, setMode] = useState<'sale'|'rent'>('sale')
  const [files, setFiles] = useState<File[]>([])
  const [form, setForm] = useState({title:'', price:'', description:'', city:'', state:'', zip_code:'', beds:'', baths:'', sqft:'', condition:'new', category:'Furniture'})
  const [loading, setLoading] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const previews = useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file) })), [files])

  useEffect(() => {
    return () => previews.forEach(preview => URL.revokeObjectURL(preview.url))
  }, [previews])

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(data.user || null)
      if (data.user) {
        const account = await getAccount(data.user.id)
        if (!mounted) return
        if (account?.account_status && account.account_status !== 'active') {
          setError('Your Havenly account is currently blocked or suspended. You cannot create listings until an administrator restores access.')
        }
      }
      setCheckingAccount(false)
    }

    loadUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  function update(name:string, value:string) { setForm(prev => ({...prev, [name]: value})) }

  function handleFiles(selected: File[]) {
    setError('')
    if (selected.length > MAX_IMAGES) {
      setFiles(selected.slice(0, MAX_IMAGES))
      setError(`Please choose no more than ${MAX_IMAGES} photos.`)
      return
    }

    const invalidType = selected.find(file => !file.type.startsWith('image/'))
    if (invalidType) {
      setFiles([])
      setError(`${invalidType.name} is not an image.`)
      return
    }

    const oversized = selected.find(file => file.size > MAX_IMAGE_SIZE)
    if (oversized) {
      setFiles([])
      setError(`${oversized.name} is larger than 10 MB.`)
      return
    }

    setFiles(selected)
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function publish(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    if (!user) { setError('Please sign in before creating a listing.'); return }

    const account = await getAccount(user.id)
    if (account?.account_status && account.account_status !== 'active') {
      setError('Your Havenly account is currently blocked or suspended. You cannot create listings until an administrator restores access.')
      return
    }
    if (account?.account_type !== 'seller') { setError('Switch your account to Seller before creating a listing.'); return }
    if (!form.title.trim() || !form.price || !form.city.trim()) { setError('Please complete the title, price and city.'); return }
    if (Number(form.price) <= 0) { setError('Price must be greater than 0.'); return }
    if (files.length > MAX_IMAGES) { setError(`Please choose up to ${MAX_IMAGES} photos.`); return }
    setLoading(true)
    try {
      const paths: string[] = []
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
        paths.push(data.publicUrl)
      }

      const { error: insertError } = await supabase.from('listings').insert({
        seller_id: user.id,
        kind,
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        city: form.city.trim(),
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        images: paths,
        status: 'draft',
        moderation_status: 'pending',
        property_mode: kind === 'property' ? mode : null,
        beds: kind === 'property' && form.beds ? Number(form.beds) : null,
        baths: kind === 'property' && form.baths ? Number(form.baths) : null,
        sqft: kind === 'property' && form.sqft ? Number(form.sqft) : null,
        item_condition: kind === 'item' ? form.condition : null,
        category: kind === 'item' ? form.category : null,
      })
      if (insertError) throw insertError
      setMessage('Your listing was submitted for review. It will appear publicly after admin approval.')
      setFiles([])
      setForm({title:'', price:'', description:'', city:'', state:'', zip_code:'', beds:'', baths:'', sqft:'', condition:'new', category:'Furniture'})
    } catch (err:any) {
      setError(err.message || 'Could not submit your listing.')
    } finally { setLoading(false) }
  }

  if (checkingAccount) return <main className="container" style={{ padding: '90px 0' }}><p className="muted">Checking your Havenly account…</p></main>

  return <main>
    <nav className="nav container"><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><div className="navActions"><a href="/dashboard">Dashboard</a><a className="btn btn-dark" href="/">Browse</a></div></nav>
    <section className="container sellPage">
      <span className="kicker">SELL ON HAVENLY</span>
      <h1>List it. <em>Get discovered.</em></h1>
      <p className="sellLead">Reach buyers and renters looking for their next home and the things that make it feel like home.</p>

      {!user && <div className="notice"><strong>Sign in required.</strong> <a href="/signin">Sign in to Havenly</a> before publishing a listing.</div>}
      {message && <div className="successBox">✓ {message} <a href="/dashboard">View dashboard</a></div>}
      {error && <div className="errorBox">{error}</div>}

      <form onSubmit={publish} className="listingForm">
        <div className="typeChoice"><button type="button" className={kind==='property'?'choice active':''} onClick={()=>setKind('property')}>🏠 <b>Property</b><small>Sell or rent a home</small></button><button type="button" className={kind==='item'?'choice active':''} onClick={()=>setKind('item')}>🛋️ <b>Marketplace item</b><small>Furniture, appliances & more</small></button></div>

        {kind==='property' && <div className="segmented lightSeg"><button type="button" className={mode==='sale'?'active':''} onClick={()=>setMode('sale')}>For sale</button><button type="button" className={mode==='rent'?'active':''} onClick={()=>setMode('rent')}>For rent</button></div>}

        <div className="formGrid">
          <label className="full">Title<input required value={form.title} onChange={e=>update('title',e.target.value)} placeholder={kind==='property'?'Modern 3-bedroom family home':'Modern oak dining set'} /></label>
          <label>Price (USD)<input required type="number" min="0" step="0.01" value={form.price} onChange={e=>update('price',e.target.value)} placeholder={kind==='property' && mode==='rent'?'2500':'450000'} /></label>
          <label>City<input required value={form.city} onChange={e=>update('city',e.target.value)} placeholder="Austin" /></label>
          <label>State<input value={form.state} onChange={e=>update('state',e.target.value)} placeholder="TX" /></label>
          <label>ZIP code<input value={form.zip_code} onChange={e=>update('zip_code',e.target.value)} placeholder="78701" /></label>
          {kind==='property' ? <><label>Bedrooms<input type="number" min="0" value={form.beds} onChange={e=>update('beds',e.target.value)} placeholder="3" /></label><label>Bathrooms<input type="number" min="0" step="0.5" value={form.baths} onChange={e=>update('baths',e.target.value)} placeholder="2" /></label><label>Square feet<input type="number" min="0" value={form.sqft} onChange={e=>update('sqft',e.target.value)} placeholder="1800" /></label></> : <><label>Category<select value={form.category} onChange={e=>update('category',e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Condition<select value={form.condition} onChange={e=>update('condition',e.target.value)}><option value="new">New</option><option value="used">Used</option></select></label></>}
          <label className="full">Description<textarea value={form.description} onChange={e=>update('description',e.target.value)} rows={6} placeholder="Tell buyers what makes this listing special…" /></label>
          <label className="full">Photos <span className="hint">Up to 8 images · 10 MB each</span><input type="file" accept="image/*" multiple onChange={e=>handleFiles(Array.from(e.target.files || []))} /></label>
        </div>

        {files.length > 0 && <div className="photoPreviewGrid" aria-label="Selected listing photos">
          {previews.map((preview, index) => <div className="photoPreview" key={`${preview.file.name}-${preview.file.size}-${index}`}>
            <img src={preview.url} alt={`Listing photo ${index + 1}`} />
            <button type="button" onClick={() => removeFile(index)} aria-label={`Remove photo ${index + 1}`}>×</button>
          </div>)}
        </div>}

        <div className="photoNote">Your images are stored in your Supabase <b>listing-images</b> bucket. Listings are reviewed before they become public.</div>
        <button disabled={loading || !user} className="btn btn-dark publishBtn">{loading ? 'Submitting…' : 'Submit listing for review →'}</button>
      </form>
    </section>
  </main>
}
