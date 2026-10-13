'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import StatCard from '@/components/StatCard'
import InviteCard, { InviteSummary } from '@/components/InviteCard'

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [stats, setStats] = useState({
    members: 0,
    balance: 0,
    pending: 0,
    paidThisMonth: 0,
  })
  const [invites, setInvites] = useState<InviteSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: inv } = await supabase.rpc('get_my_pending_invites')
      setInvites((inv as InviteSummary[]) ?? [])

      const { data: memberships } = await supabase
        .from('members')
        .select('stokvel_id')
        .eq('user_id', user.id)
      const ids = memberships?.map((m) => m.stokvel_id) ?? []
      if (!ids.length) {
        setLoading(false)
        return
      }

      const [{ count }, { data: tx }, { data: contribs }] = await Promise.all([
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .in('stokvel_id', ids),
        supabase.from('transactions').select('type, amount').in('stokvel_id', ids),
        supabase
          .from('contributions')
          .select('amount, status, paid_date')
          .in('stokvel_id', ids),
      ])

      const balance = (tx ?? []).reduce(
        (s, t) =>
          t.type === 'deposit' || t.type === 'interest'
            ? s + Number(t.amount)
            : s - Number(t.amount),
        0
      )
      const pending = (contribs ?? []).filter(
        (c) => c.status === 'pending' || c.status === 'late'
      ).length
      const thisMonth = new Date().toISOString().slice(0, 7)
      const paidThisMonth = (contribs ?? [])
        .filter((c) => c.status === 'paid' && c.paid_date?.startsWith(thisMonth))
        .reduce((s, c) => s + Number(c.amount), 0)

      setStats({
        members: count ?? 0,
        balance,
        pending,
        paidThisMonth,
      })
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleAccept(token: string) {
    const { error } = await supabase.rpc('accept_stokvel_invite', {
      p_token: token,
    })
    if (error) throw new Error(error.message)
    router.refresh()
  }

  async function handleDecline(token: string) {
    const { error } = await supabase.rpc('decline_stokvel_invite', {
      p_token: token,
    })
    if (error) throw new Error(error.message)
    setInvites((prev) => prev.filter((i) => i.token !== token))
  }

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            A snapshot of your stokvel activity.
          </p>
        </div>
        <Link
          href="/dashboard/stokvels/new"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus size={16} /> New Stokvel
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={String(stats.members)} />
        <StatCard label="Group Balance" value={`R ${stats.balance.toFixed(2)}`} />
        <StatCard label="Pending Contributions" value={String(stats.pending)} />
        <StatCard
          label="Paid This Month"
          value={`R ${stats.paidThisMonth.toFixed(2)}`}
        />
      </div>

      {stats.pending > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {stats.pending} contribution{stats.pending === 1 ? '' : 's'} outstanding
              </p>
              <p className="text-xs text-amber-700">
                Open the contributions page to mark payments or nudge members.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/contributions"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:underline"
          >
            View <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {invites.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Pending invitations{' '}
              <span className="text-sm font-normal text-gray-500">
                ({invites.length})
              </span>
            </h2>
            <Link
              href="/dashboard/invites"
              className="text-sm text-emerald-700 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invites.slice(0, 2).map((inv) => (
              <InviteCard
                key={inv.id}
                invite={inv}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}