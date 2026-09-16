'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--cream)' }}>
      <div style={{ width: 'min(440px,100%)', background: 'white', padding: 38, borderRadius: 18, border: '1px solid var(--line)' }}>
        <Link className="brand" href="/"><span className="brandMark">H</span> havenly</Link>
        <h1 style={{ fontSize: 34, letterSpacing: -1.2, margin: '38px 0 8px' }}>Reset your password.</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Enter your email and we&apos;ll send you a secure password reset link.</p>

        {sent ? (
          <div style={{ marginTop: 25, padding: 16, borderRadius: 10, background: '#eef4ef', lineHeight: 1.6 }}>
            Check <strong>{email}</strong> for your password reset link.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 28 }}>EMAIL ADDRESS</label>
            <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} />
            {error && <p style={{ color: '#a23b35', fontSize: 13 }}>{error}</p>}
            <button disabled={loading} className="btn btn-dark" style={{ border: 0, width: '100%', justifyContent: 'center', marginTop: 14, cursor: 'pointer', opacity: loading ? .65 : 1 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 22, textAlign: 'center' }}>
          Remember your password? <Link href="/signin" style={{ fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </main>
  )
}

const inputStyle = { width: '100%', height: 50, border: '1px solid var(--line)', borderRadius: 9, padding: '0 13px', marginTop: 8, font: 'inherit', boxSizing: 'border-box' as const }
