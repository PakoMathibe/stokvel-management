'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import StatementView, { Statement } from '@/components/StatementView'

type MyMembership = {
  member_id: string
  stokvel_id: string
  stokvel_name: string
  stokvel_type: string
  role: string
  joined_at: string
}

export default function MyStatementPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [memberships, setMemberships] = useState<MyMembership[]>([])
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMemberships() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error: rpcErr } = await supabase.rpc(
        'get_my_memberships_for_statement'
      )

      if (rpcErr) {
        setError(rpcErr.message)
        setLoading(false)
        return
      }

      const list = (data as MyMembership[]) ?? []
      setMemberships(list)
      if (list.length > 0) setActiveMemberId(list[0].member_id)
      setLoading(false)
    }
    loadMemberships()
  }, [router, supabase])

  const loadStatement = useCallback(async () => {
    if (!activeMemberId) {
      setStatement(null)
      return
    }
    setError('')
    const { data, error: rpcErr } = await supabase.rpc('get_member_statement', {
      p_member_id: activeMemberId,
    })
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    setStatement(data as Statement)
  }, [activeMemberId, supabase])

  useEffect(() => {
    loadStatement()
  }, [loadStatement])

  if (loading) return <p className="text-gray-500">Loading…</p>

  if (memberships.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-1">My statement</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your contribution and payout history.
        </p>
        <div className="bg-white border rounded-xl p-10 text-center">
          <p className="text-sm text-gray-600">
            You&apos;re not a member of any stokvel yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My statement</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your contribution and payout history.
          </p>
        </div>
        {memberships.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Stokvel</label>
            <select
              value={activeMemberId ?? ''}
              onChange={(e) => setActiveMemberId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {memberships.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.stokvel_name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {statement ? (
        <StatementView statement={statement} />
      ) : (
        <p className="text-gray-500 text-sm">No statement data.</p>
      )}
    </div>
  )
}