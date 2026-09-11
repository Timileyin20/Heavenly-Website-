'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('orders').select('id, amount, currency, status, created_at, listing_id').eq('buyer_id', user.id).order('created_at', { ascending: false });
      setOrders(data ?? []); setLoading(false);
    })();
  }, []);

  return <main className="container" style={{paddingTop: '48px', paddingBottom: '80px'}}>
    <div className="eyebrow">ACCOUNT</div><h1>My orders</h1>
    <p className="muted">Track marketplace purchases and eligible refund requests.</p>
    {loading ? <p>Loading…</p> : orders.length === 0 ? <div className="card" style={{marginTop:24}}><h3>No orders yet</h3><p className="muted">Your confirmed marketplace purchases will appear here.</p></div> : <div style={{display:'grid', gap:16, marginTop:24}}>{orders.map(o => <div className="card" key={o.id}><div style={{display:'flex',justifyContent:'space-between',gap:16}}><div><strong>Order {o.id.slice(0,8)}</strong><div className="muted">{new Date(o.created_at).toLocaleDateString()}</div></div><strong>${Number(o.amount).toLocaleString()} {o.currency}</strong></div><div style={{marginTop:10}} className="pill">{o.status}</div></div>)}</div>}
  </main>;
}
