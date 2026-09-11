'use client'
import { FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SignIn(){
  const [email,setEmail]=useState('')
  const [submitted,setSubmitted]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  async function submit(e: FormEvent){
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined }
    })
    if(error) setError(error.message)
    else setSubmitted(true)
    setLoading(false)
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'var(--cream)'}}><div style={{width:'min(440px,100%)',background:'white',padding:38,borderRadius:18,border:'1px solid var(--line)'}}><a className="brand" href="/"><span className="brandMark">H</span> havenly</a><h1 style={{fontSize:34,letterSpacing:-1.2,margin:'38px 0 8px'}}>Welcome back.</h1><p style={{color:'var(--muted)',lineHeight:1.6}}>Sign in to save homes, message sellers and manage your listings.</p>{submitted?<div style={{marginTop:25,padding:16,borderRadius:10,background:'#eef4ef'}}>Check <strong>{email}</strong> for your secure Havenly sign-in link.</div>:<form onSubmit={submit}><label style={{display:'block',fontSize:12,fontWeight:700,marginTop:28}}>EMAIL ADDRESS</label><input required value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" style={{width:'100%',height:50,border:'1px solid var(--line)',borderRadius:9,padding:'0 13px',marginTop:8,font:'inherit'}}/>{error&&<p style={{color:'#a23b35',fontSize:13}}>{error}</p>}<button disabled={loading} className="btn btn-dark" style={{border:0,width:'100%',justifyContent:'center',marginTop:12,cursor:'pointer',opacity:loading?.65:1}}>{loading?'Sending…':'Continue securely'}</button></form>}<p style={{fontSize:11,color:'#8a8f88',lineHeight:1.6,marginTop:22}}>By continuing, you agree to Havenly's terms, privacy policy and marketplace rules.</p></div></main>
}
