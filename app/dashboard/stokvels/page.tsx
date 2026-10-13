'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Row = {
  id: string
  name: string
  type: string
  contribution_amount: number
  frequency: string
  is_active: boolean
  created_at: string
  member_count?: number
  my_role?: string
}

export default function StokvelsListPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: myMemberships } = await supabase
        .from('members')
        .select('stokvel_id, role')
        .eq('user_id', user.id)

      const ids = myMemberships?.map((m) => m.stokvel_id) ?? []
      if (!ids.length) {
        setRows([])
        setLoading(false)
        return
      }

      const roleByStokvel = new Map(
        (myMemberships ?? []).map((m) => [m.stokvel_id, m.role])
      )

      const { data: stokvels } = await supabase
        .from('stokvels')
        .select('id, name, type, contribution_amount, frequency, is_active, created_at')
        .in('id', ids)
        .order('created_at', { ascending: false })

      const { data: allMembers } = await supabase
        .from('members')
        .select('stokvel_id')
        .in('stokvel_id', ids)

      const counts = new Map<string, number>()
      for (const m of allMembers ?? []) {
        counts.set(m.stokvel_id, (counts.get(m.stokvel_id) ?? 0) + 1)
      }

      setRows(
        (stokvels ?? []).map((s) => ({
          ...s,
          member_count: counts.get(s.id) ?? 0,
          my_role: roleByStokvel.get(s.id),
        }))
      )
      setLoading(false)
    }
    load()
  }, [supabase])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stokvels</h1>
          <p className="text-sm text-gray-500 mt-1">
            All savings groups you belong to.
          </p>
        </div>
        <Link
          href="/dashboard/stokvels/new"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus size={16} /> New Stokvel
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <h2 className="text-lg font-semibold mb-1">You&apos;re not in any stokvel yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            Create one to start tracking contributions, payouts, and members.
          </p>
          <Link
            href="/dashboard/stokvels/new"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
          >
            <Plus size={16} /> Create your first stokvel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/stokvels/${s.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-emerald-300 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-500 capitalize mt-0.5">{s.type} stokvel</p>
                </div>
                <span className="text-[11px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                  {s.my_role ?? 'member'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Contribution</p>
                  <p className="font-medium">
                    R {Number(s.contribution_amount).toFixed(2)} · {s.frequency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Members</p>
                  <p className="font-medium">{s.member_count ?? 0}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}