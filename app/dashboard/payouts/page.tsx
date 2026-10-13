'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import PayoutForm from '@/components/PayoutForm'
import PayoutTable, { PayoutRow } from '@/components/PayoutTable'

type MyStokvel = {
  id: string
  name: string
  role: 'admin' | 'treasurer' | 'chairperson' | 'member'
}

export default function PayoutsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [stokvels, setStokvels] = useState<MyStokvel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStokvels() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data: memberships } = await supabase
        .from('members')
        .select('role, stokvel_id, stokvels:stokvel_id(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const list: MyStokvel[] = (memberships ?? [])
        .map((m: any) => {
          const s = Array.isArray(m.stokvels) ? m.stokvels[0] : m.stokvels
          if (!s) return null
          return { id: s.id, name: s.name, role: m.role }
        })
        .filter(Boolean) as MyStokvel[]

      setStokvels(list)
      if (list.length > 0) setActiveId(list[0].id)
      setLoading(false)
    }
    loadStokvels()
  }, [supabase])

  const active = stokvels.find((s) => s.id === activeId) ?? null
  const canWrite = active
    ? active.role === 'admin' || active.role === 'treasurer'
    : false

  const loadRows = useCallback(async () => {
    if (!activeId) {
      setRows([])
      return
    }
    setError('')
    const { data, error: qErr } = await supabase
      .from('payouts')
      .select(
        'id, stokvel_id, member_id, amount, scheduled_date, paid_date, status, notes, rejected_reason, members:member_id(role, profiles:user_id(full_name))'
      )
      .eq('stokvel_id', activeId)
      .order('created_at', { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setRows([])
      return
    }

    const mapped: PayoutRow[] = (data ?? []).map((r: any) => {
      const mem = Array.isArray(r.members) ? r.members[0] : r.members
      const prof = mem?.profiles
        ? Array.isArray(mem.profiles)
          ? mem.profiles[0]
          : mem.profiles
        : null
      return {
        id: r.id,
        stokvel_id: r.stokvel_id,
        member_id: r.member_id,
        amount: Number(r.amount),
        scheduled_date: r.scheduled_date,
        paid_date: r.paid_date,
        status: r.status,
        notes: r.notes,
        rejected_reason: r.rejected_reason,
        member_name: prof?.full_name ?? null,
        member_role: mem?.role ?? null,
      }
    })
    setRows(mapped)
  }, [activeId, supabase])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  if (loading) return <p className="text-gray-500">Loading…</p>

  if (stokvels.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-1">Payouts</h1>
        <p className="text-sm text-gray-500 mb-6">
          You&apos;re not in any stokvel yet.
        </p>
        <div className="bg-white border rounded-xl p-10 text-center">
          <p className="text-sm text-gray-600">
            Create or join a stokvel to start recording payouts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, approve, and mark payouts paid. Approved payouts post to the ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Stokvel</label>
          <select
            value={activeId ?? ''}
            onChange={(e) => setActiveId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {stokvels.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
          {active && canWrite && (
            <PayoutForm stokvelId={active.id} onCreated={loadRows} />
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PayoutTable
        rows={rows}
        myRole={active?.role ?? null}
        onChanged={loadRows}
      />
    </div>
  )
}