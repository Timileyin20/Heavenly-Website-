'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function finishAuth() {
      const code = searchParams.get('code')
      const authError = searchParams.get('error_description') || searchParams.get('error')

      if (authError) {
        if (mounted) setError(authError)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          if (mounted) setError(exchangeError.message)
          return
        }
      }

      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data.user) {
        if (mounted) setError(userError?.message || 'We could not complete your sign-in.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, account_type, account_status')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!mounted) return

      if (profile?.account_status && profile.account_status !== 'active') {
        await supabase.auth.signOut()
        setError('Your Havenly account is currently blocked or suspended. Please contact support or an administrator.')
        return
      }

      if (profile?.role === 'admin') {
        router.replace('/admin')
        return
      }

      const role = profile?.account_type || data.user.user_metadata?.account_type
      router.replace(role === 'buyer' || role === 'seller' ? '/dashboard' : '/choose-role')
    }

    finishAuth()
    return () => { mounted = false }
  }, [router, searchParams])

  return (
    <main className="container" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <span className="brand" style={{ justifyContent: 'center' }}><span className="brandMark">H</span> havenly</span>
        <h1 style={{ marginTop: 28 }}>Signing you in…</h1>
        {error ? <><p className="muted" style={{ marginTop: 12 }}>{error}</p><a href="/signin" className="btn btn-dark" style={{ marginTop: 18 }}>Return to sign in</a></> : <p className="muted" style={{ marginTop: 12 }}>Please wait while we securely connect your account.</p>}
      </div>
    </main>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<main className="container" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><div style={{ textAlign: 'center', maxWidth: 520 }}><span className="brand" style={{ justifyContent: 'center' }}><span className="brandMark">H</span> havenly</span><h1 style={{ marginTop: 28 }}>Signing you in…</h1><p className="muted" style={{ marginTop: 12 }}>Please wait while we securely connect your account.</p></div></main>}>
      <AuthCallbackContent />
    </Suspense>
  )
}
