'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import StatCard from '@/components/StatCard'

export default function Dashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ members: 0, balance: 0, pending: 0, paidThisMonth: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: memberships } = await supabase
        .from('members').select('stokvel_id').eq('user_id', user.id)
      const ids = memberships?.map(m => m.stokvel_id) ?? []
      if (!ids.length) return setLoading(false)

      const [{ count }, { data: tx }, { data: contribs }] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).in('stokvel_id', ids),
        supabase.from('transactions').select('type, amount').in('stokvel_id', ids),
        supabase.from('contributions').select('amount, status, paid_date').in('stokvel_id', ids),
      ])

      const balance = (tx ?? []).reduce((s, t) =>
        t.type === 'deposit' || t.type === 'interest' ? s + Number(t.amount) : s - Number(t.amount), 0)

      const pending = (contribs ?? []).filter(c => c.status === 'pending' || c.status === 'late').length
      const thisMonth = new Date().toISOString().slice(0, 7)
      const paidThisMonth = (contribs ?? [])
        .filter(c => c.status === 'paid' && c.paid_date?.startsWith(thisMonth))
        .reduce((s, c) => s + Number(c.amount), 0)

      setStats({ members: count ?? 0, balance, pending, paidThisMonth })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={String(stats.members)} />
        <StatCard label="Group Balance" value={`R ${stats.balance.toFixed(2)}`} />
        <StatCard label="Pending Contributions" value={String(stats.pending)} />
        <StatCard label="Paid This Month" value={`R ${stats.paidThisMonth.toFixed(2)}`} />
      </div>
    </div>
  )
}