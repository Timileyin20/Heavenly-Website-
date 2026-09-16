'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function SignUp() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!terms) {
      setError('Please agree to the Terms & Conditions and Privacy Policy.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    })

    if (error) {
      setError(error.message)
    } else if (data.session) {
      window.location.href = '/dashboard'
      return
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--cream)' }}>
      <div style={{ width: 'min(480px,100%)', background: 'white', padding: 38, borderRadius: 18, border: '1px solid var(--line)' }}>
        <Link className="brand" href="/"><span className="brandMark">H</span> havenly</Link>
        <h1 style={{ fontSize: 34, letterSpacing: -1.2, margin: '38px 0 8px' }}>Create your account.</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Join Havenly to save homes, message sellers and manage your listings.</p>

        {success ? (
          <div style={{ marginTop: 25, padding: 16, borderRadius: 10, background: '#eef4ef', lineHeight: 1.6 }}>
            Your account has been created. Check <strong>{email}</strong> for a confirmation link if email confirmation is enabled.
            <div style={{ marginTop: 16 }}><Link href="/signin" className="btn btn-dark">Go to sign in</Link></div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 24 }}>FULL NAME</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} type="text" placeholder="Your full name" style={inputStyle} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 18 }}>PHONE NUMBER</label>
            <input required value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+1 555 123 4567" style={inputStyle} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 18 }}>EMAIL ADDRESS</label>
            <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 18 }}>PASSWORD</label>
            <input required value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 6 characters" style={inputStyle} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 18 }}>CONFIRM PASSWORD</label>
            <input required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Re-enter your password" style={inputStyle} />

            <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 18, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
              <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} style={{ marginTop: 3 }} />
              <span>I agree to Havenly&apos;s Terms &amp; Conditions, Privacy Policy and marketplace rules.</span>
            </label>

            {error && <p style={{ color: '#a23b35', fontSize: 13, lineHeight: 1.5 }}>{error}</p>}
            <button disabled={loading} className="btn btn-dark" style={{ border: 0, width: '100%', justifyContent: 'center', marginTop: 16, cursor: 'pointer', opacity: loading ? .65 : 1 }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 22, textAlign: 'center' }}>
          Already have an account? <Link href="/signin" style={{ fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%', height: 50, border: '1px solid var(--line)', borderRadius: 9,
  padding: '0 13px', marginTop: 8, font: 'inherit', boxSizing: 'border-box' as const,
}
