'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--cream)' }}>
      <div style={{ width: 'min(440px,100%)', background: 'white', padding: 38, borderRadius: 18, border: '1px solid var(--line)' }}>
        <Link className="brand" href="/"><span className="brandMark">H</span> havenly</Link>
        <h1 style={{ fontSize: 34, letterSpacing: -1.2, margin: '38px 0 8px' }}>Choose a new password.</h1>

        {success ? (
          <div style={{ marginTop: 25, padding: 16, borderRadius: 10, background: '#eef4ef', lineHeight: 1.6 }}>
            Your password has been updated successfully.
            <div style={{ marginTop: 16 }}><Link href="/signin" className="btn btn-dark">Sign in</Link></div>
          </div>
        ) : !ready ? (
          <p style={{ marginTop: 24, color: 'var(--muted)', lineHeight: 1.6 }}>
            This reset link is invalid or has expired. Please request a new one from the password reset page.
          </p>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Enter your new password below.</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 24 }}>NEW PASSWORD</label>
            <input required value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 6 characters" style={inputStyle} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 18 }}>CONFIRM NEW PASSWORD</label>
            <input required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Re-enter your password" style={inputStyle} />
            {error && <p style={{ color: '#a23b35', fontSize: 13 }}>{error}</p>}
            <button disabled={loading} className="btn btn-dark" style={{ border: 0, width: '100%', justifyContent: 'center', marginTop: 16, cursor: 'pointer', opacity: loading ? .65 : 1 }}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

const inputStyle = { width: '100%', height: 50, border: '1px solid var(--line)', borderRadius: 9, padding: '0 13px', marginTop: 8, font: 'inherit', boxSizing: 'border-box' as const }
