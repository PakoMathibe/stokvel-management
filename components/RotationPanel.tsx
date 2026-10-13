'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Play,
  SkipForward,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

type RotationMember = {
  member_id: string
  name: string | null
  phone: string | null
  role: string
  turn_index: number
}

type RotationHistoryRow = {
  id: string
  member_id: string
  name: string | null
  turn_index: number
  round_number: number
  status: 'pending' | 'paid' | 'skipped'
  scheduled_date: string | null
  payout_id: string | null
  completed_at: string | null
}

type RotationStatus = {
  initialized: boolean
  current_index: number
  current_round: number
  next_member_id: string | null
  started_at: string | null
  members: RotationMember[]
  history: RotationHistoryRow[]
}

export default function RotationPanel({
  stokvelId,
  stokvelType,
  myRole,
  onPayoutCreated,
}: {
  stokvelId: string
  stokvelType: string
  myRole: 'admin' | 'treasurer' | 'chairperson' | 'member' | null
  onPayoutCreated?: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [status, setStatus] = useState<RotationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [orderDraft, setOrderDraft] = useState<string[]>([])

  const canAdmin = myRole === 'admin' || myRole === 'chairperson'
  const canWrite = myRole === 'admin' || myRole === 'treasurer'
  const isRotational = stokvelType === 'rotational'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: rpcErr } = await supabase.rpc('get_rotation_status', {
      p_stokvel_id: stokvelId,
    })
    if (rpcErr) {
      setError(rpcErr.message)
      setLoading(false)
      return
    }
    const s = data as RotationStatus
    setStatus(s)
    setOrderDraft(s.members.map((m) => m.member_id))
    setLoading(false)
  }, [stokvelId, supabase])

  useEffect(() => {
    load()
  }, [load])

  async function initializeRotation() {
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('initialize_rotation', {
      p_stokvel_id: stokvelId,
      p_order: orderDraft.length ? orderDraft : null,
    })
    setBusy(false)
    if (rpcErr) return setError(rpcErr.message)
    load()
  }

  async function advanceTurn() {
    if (!status) return
    setError('')
    setBusy(true)

    // 1. Create a payout for the current member if it doesn't exist yet
    const currentMemberId =
      status.members[status.current_index]?.member_id ?? null
    if (!currentMemberId) {
      setBusy(false)
      return setError('No current member to advance from.')
    }

    // Look up the group balance as the default payout amount
    const { data: txs } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('stokvel_id', stokvelId)
    const balance = (txs ?? []).reduce(
      (s, t) =>
        t.type === 'deposit' || t.type === 'interest'
          ? s + Number(t.amount)
          : s - Number(t.amount),
      0
    )

    let payoutId: string | null = null

    // Create the payout (scheduled) if there's a positive balance
    if (balance > 0) {
      const { data: existing } = await supabase
        .from('payouts')
        .select('id, status')
        .eq('stokvel_id', stokvelId)
        .eq('member_id', currentMemberId)
        .in('status', ['scheduled', 'approved'])
        .limit(1)
        .maybeSingle()

      if (existing) {
        payoutId = existing.id
      } else {
        const { data: created, error: createErr } = await supabase
          .rpc('create_payout', {
            p_stokvel_id: stokvelId,
            p_member_id: currentMemberId,
            p_amount: balance,
            p_scheduled_date: new Date().toISOString().slice(0, 10),
            p_notes: `Rotation round ${status.current_round} turn ${
              status.current_index + 1
            }`,
          })
        if (createErr) {
          setBusy(false)
          return setError(createErr.message)
        }
        payoutId = created as string
      }
    }

    // 2. Advance the pointer
    const { error: advErr } = await supabase.rpc('advance_rotation', {
      p_stokvel_id: stokvelId,
      p_current_payout_id: payoutId,
    })
    setBusy(false)
    if (advErr) return setError(advErr.message)

    load()
    onPayoutCreated?.()
  }

  async function skipTurn() {
    const reason = prompt('Reason for skipping (optional):') ?? null
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('skip_rotation_turn', {
      p_stokvel_id: stokvelId,
      p_reason: reason,
    })
    setBusy(false)
    if (rpcErr) return setError(rpcErr.message)
    load()
  }

  function moveMember(index: number, direction: -1 | 1) {
    const next = [...orderDraft]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrderDraft(next)
  }

  if (!isRotational) {
    return (
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold mb-2">Rotation</h2>
        <p className="text-sm text-gray-500">
          This stokvel is not a rotational type. Rotation is only available for
          rotational stokvels.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-6">
        <p className="text-gray-500 text-sm">Loading rotation…</p>
      </div>
    )
  }

  if (!status) return null

  const currentMember = status.members[status.current_index] ?? null

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-lg">Rotational engine</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {status.initialized
                ? `Round ${status.current_round} · ${status.members.length} members`
                : 'Not yet initialized'}
            </p>
          </div>
          {canWrite && status.initialized && (
            <div className="flex gap-2">
              {canAdmin && (
                <button
                  onClick={skipTurn}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs hover:bg-gray-50 disabled:opacity-60"
                >
                  <SkipForward size={14} /> Skip turn
                </button>
              )}
              <button
                onClick={advanceTurn}
                disabled={busy || !currentMember}
                className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                <Check size={14} /> Advance turn
              </button>
            </div>
          )}
          {canAdmin && !status.initialized && (
            <button
              onClick={initializeRotation}
              disabled={busy || orderDraft.length === 0}
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              <Play size={14} /> Start rotation
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status.initialized && currentMember && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 mb-4">
            <p className="text-xs uppercase tracking-wide text-emerald-800 font-medium">
              Current turn
            </p>
            <p className="text-lg font-semibold text-emerald-900 mt-1">
              {currentMember.name ?? '—'}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Turn {currentMember.turn_index} of {status.members.length}
              {currentMember.phone ? ` · ${currentMember.phone}` : ''}
            </p>
          </div>
        )}

        {/* Member order list */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            {status.initialized ? 'Rotation order' : 'Preview order (drag to reorder below)'}
          </p>
          {status.members.map((m, idx) => {
            const isCurrent = status.initialized && idx === status.current_index
            return (
              <div
                key={m.member_id}
                className={`flex items-center gap-3 p-2.5 rounded-md text-sm ${
                  isCurrent ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50'
                }`}
              >
                <span className="w-6 text-xs text-gray-400 text-right">
                  {idx + 1}
                </span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="flex-1 font-medium">
                  {m.name ?? '—'}
                  <span className="ml-2 text-xs text-gray-400 capitalize">
                    {m.role}
                  </span>
                </span>
                {isCurrent && (
                  <span className="text-[10px] uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
                    current
                  </span>
                )}
                {!status.initialized && canAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveMember(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveMember(idx, 1)}
                      disabled={idx === status.members.length - 1}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {status.members.length === 0 && (
            <p className="text-sm text-gray-500 p-4">
              No active members yet. Invite members to join the stokvel first.
            </p>
          )}
        </div>
      </div>

      {/* History */}
      {status.history.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <h3 className="font-semibold text-sm">Rotation history</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">Round</th>
                <th className="text-left p-3 font-medium">Turn</th>
                <th className="text-left p-3 font-medium">Member</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {status.history.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="p-3 text-gray-600">{h.round_number}</td>
                  <td className="p-3 text-gray-600">{h.turn_index}</td>
                  <td className="p-3 font-medium">{h.name ?? '—'}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded capitalize ${
                        h.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : h.status === 'skipped'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {h.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">
                    {h.completed_at
                      ? new Date(h.completed_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}