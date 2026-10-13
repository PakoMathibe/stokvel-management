'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import ContributionForm from '@/components/ContributionForm'
import ContributionTable, {
  ContributionRow,
} from '@/components/ContributionTable'

type MyStokvel = {
  id: string
  name: string
  type: string
  contribution_amount: number
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  role: 'admin' | 'treasurer' | 'chairperson' | 'member'
}

export default function ContributionsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [stokvels, setStokvels] = useState<MyStokvel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [rows, setRows] = useState<ContributionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load my stokvels
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
        .select('role, stokvel_id, stokvels:stokvel_id(id, name, type, contribution_amount, frequency)')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const list: MyStokvel[] = (memberships ?? [])
        .map((m: any) => {
          const s = Array.isArray(m.stokvels) ? m.stokvels[0] : m.stokvels
          if (!s) return null
          return {
            id: s.id,
            name: s.name,
            type: s.type,
            contribution_amount: Number(s.contribution_amount),
            frequency: s.frequency,
            role: m.role,
          }
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
      .from('contributions')
      .select(
        'id, stokvel_id, member_id, amount, due_date, paid_date, status, period_label, reference, members:member_id(profiles:user_id(full_name, phone))'
      )
      .eq('stokvel_id', activeId)
      .order('due_date', { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setRows([])
      return
    }

    const mapped: ContributionRow[] = (data ?? []).map((r: any) => {
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
        due_date: r.due_date,
        paid_date: r.paid_date,
        status: r.status,
        period_label: r.period_label,
        reference: r.reference,
        member_name: prof?.full_name ?? null,
        member_phone: prof?.phone ?? null,
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
        <h1 className="text-3xl font-bold mb-1">Contributions</h1>
        <p className="text-sm text-gray-500 mb-6">
          You&apos;re not in any stokvel yet.
        </p>
        <div className="bg-white border rounded-xl p-10 text-center">
          <p className="text-sm text-gray-600">
            Create or join a stokvel to start tracking contributions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contributions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track who has paid, who is behind, and post payments to the ledger.
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
            <ContributionForm
              stokvelId={active.id}
              defaultAmount={active.contribution_amount}
              frequency={active.frequency}
              onGenerated={loadRows}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ContributionTable
        rows={rows}
        canWrite={canWrite}
        onChanged={loadRows}
        currentStokvelName={active?.name ?? ''}
      />
    </div>
  )
}