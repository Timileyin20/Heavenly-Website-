'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  async function googleSignIn() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--cream)' }}>
      <div style={{ width: 'min(440px,100%)', background: 'white', padding: 38, borderRadius: 18, border: '1px solid var(--line)' }}>
        <Link className="brand" href="/"><span className="brandMark">H</span> havenly</Link>
        <h1 style={{ fontSize: 34, letterSpacing: -1.2, margin: '38px 0 8px' }}>Welcome back.</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Sign in to save homes, message sellers and manage your listings.</p>

        <form onSubmit={submit}>
          <label style={labelStyle}>EMAIL ADDRESS</label>
          <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} />

          <label style={labelStyle}>PASSWORD</label>
          <input required value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Your password" style={inputStyle} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 9 }}>
            <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 700 }}>Forgot password?</Link>
          </div>

          {error && <p style={{ color: '#a23b35', fontSize: 13, lineHeight: 1.5 }}>{error}</p>}
          <button disabled={loading} className="btn btn-dark" style={{ border: 0, width: '100%', justifyContent: 'center', marginTop: 14, cursor: 'pointer', opacity: loading ? .65 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0', color: 'var(--muted)', fontSize: 12 }}>
          <span style={{ height: 1, background: 'var(--line)', flex: 1 }} /> OR <span style={{ height: 1, background: 'var(--line)', flex: 1 }} />
        </div>

        <button type="button" onClick={googleSignIn} className="btn" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', background: 'white', border: '1px solid var(--line)' }}>
          Continue with Google
        </button>

        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 22, textAlign: 'center' }}>
          Don&apos;t have an account? <Link href="/signup" style={{ fontWeight: 700 }}>Create one</Link>
        </p>
        <p style={{ fontSize: 11, color: '#8a8f88', lineHeight: 1.6, marginTop: 18, textAlign: 'center' }}>
          By continuing, you agree to Havenly&apos;s terms, privacy policy and marketplace rules.
        </p>
      </div>
    </main>
  )
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, marginTop: 24 }
const inputStyle = { width: '100%', height: 50, border: '1px solid var(--line)', borderRadius: 9, padding: '0 13px', marginTop: 8, font: 'inherit', boxSizing: 'border-box' as const }
