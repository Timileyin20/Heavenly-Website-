'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ChooseRole() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadAccount() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      if (!data.user) {
        router.replace('/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.account_status && profile.account_status !== 'active') {
        setError('Your Havenly account is currently blocked or suspended. Please contact support or an administrator.')
        return
      }

      setUser(data.user)
    }

    loadAccount()
    return () => { mounted = false }
  }, [router])

  async function chooseRole(role: 'buyer' | 'seller') {
    if (!user) return
    setError('')
    setLoading(true)

    const [{ error: authError }, { error: profileError }] = await Promise.all([
      supabase.auth.updateUser({ data: { account_type: role } }),
      supabase.from('profiles').update({ account_type: role }).eq('id', user.id),
    ])

    if (authError || profileError) {
      setError(authError?.message || profileError?.message || 'Could not save your account type.')
      setLoading(false)
      return
    }

    router.replace('/dashboard')
  }

  if (!user) return <main className="container" style={{ padding: '90px 0' }}><p className="muted">Preparing your account…</p></main>

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there'

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--cream)' }}>
      <section style={{ width: 'min(780px,100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <a className="brand" href="/" style={{ justifyContent: 'center' }}><span className="brandMark">H</span> havenly</a>
          <span className="kicker" style={{ display: 'block', marginTop: 42 }}>WELCOME TO HAVENLY</span>
          <h1 style={{ fontSize: 'clamp(34px,6vw,54px)', letterSpacing: -2, margin: '8px 0 12px' }}>How will you use Havenly?</h1>
          <p className="muted" style={{ maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>Hi {name}. Choose your account type so we can personalize your marketplace dashboard.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
          <button type="button" disabled={loading} onClick={() => chooseRole('buyer')} style={cardStyle}>
            <span style={iconStyle}>⌂</span>
            <strong style={titleStyle}>I’m a Buyer</strong>
            <span style={descStyle}>Browse homes and marketplace items, save favorites, message sellers, place orders and track purchases.</span>
            <span className="btn btn-dark" style={{ marginTop: 22, justifyContent: 'center' }}>Continue as Buyer →</span>
          </button>

          <button type="button" disabled={loading} onClick={() => chooseRole('seller')} style={cardStyle}>
            <span style={iconStyle}>＋</span>
            <strong style={titleStyle}>I’m a Seller</strong>
            <span style={descStyle}>Create listings, manage your properties or products, respond to buyers and monitor your sales.</span>
            <span className="btn btn-dark" style={{ marginTop: 22, justifyContent: 'center' }}>Continue as Seller →</span>
          </button>
        </div>

        {error && <p style={{ color: '#a23b35', textAlign: 'center', marginTop: 18 }}>{error}</p>}
        <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 24 }}>You can update your marketplace role later from your account settings.</p>
      </section>
    </main>
  )
}

const cardStyle = {
  textAlign: 'left' as const,
  background: '#fff',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 28,
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
  boxShadow: '0 8px 30px rgba(0,0,0,.04)',
}
const iconStyle = { display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--cream)', fontSize: 27, marginBottom: 20 }
const titleStyle = { display: 'block', fontSize: 23, marginBottom: 9 }
const descStyle = { display: 'block', color: 'var(--muted)', lineHeight: 1.65, fontSize: 14 }
