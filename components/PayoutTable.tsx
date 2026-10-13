'use client'

import { useMemo, useState } from 'react'
import { Check, ThumbsDown, ThumbsUp, Trash2, Undo2, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export type PayoutRow = {
  id: string
  stokvel_id: string
  member_id: string
  amount: number
  scheduled_date: string | null
  paid_date: string | null
  status: 'scheduled' | 'approved' | 'paid' | 'cancelled'
  notes: string | null
  rejected_reason: string | null
  member_name: string | null
  member_role: string | null
}

type Filter = 'all' | 'scheduled' | 'approved' | 'paid' | 'cancelled'

export default function PayoutTable({
  rows,
  myRole,
  onChanged,
}: {
  rows: PayoutRow[]
  myRole: 'admin' | 'treasurer' | 'chairperson' | 'member' | null
  onChanged: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canWrite = myRole === 'admin' || myRole === 'treasurer'
  const canApprove = myRole === 'admin' || myRole === 'chairperson'

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'paid')
    const pending = rows.filter(
      (r) => r.status === 'scheduled' || r.status === 'approved'
    )
    return {
      paidSum: paid.reduce((s, r) => s + Number(r.amount), 0),
      pendingSum: pending.reduce((s, r) => s + Number(r.amount), 0),
    }
  }, [rows])

  async function approve(id: string) {
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('approve_payout', {
      p_payout_id: id,
    })
    setBusy(false)
    if (rpcErr) return setError(rpcErr.message)
    onChanged()
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejection (optional):') ?? null
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('reject_payout', {
      p_payout_id: id,
      p_reason: reason,
    })
    setBusy(false)
    if (rpcErr) return setError(rpcErr.message)
    onChanged()
  }

  async function markPaid(id: string) {
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('mark_payout_paid', {
      p_payout_id: id,
      p_paid_date: new Date().toISOString().slice(0, 10),
    })
    setBusy(false)
    if (rpcErr) return setError(rpcErr.message)
    onChanged()
  }

  async function unmarkPaid(id: string) {
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('unmark_payout_paid', {
      p_payout_id: id,
    })
    setBusy(false)
    if (rpcErr) return setError(rpcErr.message)
    onChanged()
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this payout? This cannot be undone.')) return
    setError('')
    setBusy(true)
    const { error: delErr } = await supabase.from('payouts').delete().eq('id', id)
    setBusy(false)
    if (delErr) return setError(delErr.message)
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {(['all', 'scheduled', 'approved', 'paid', 'cancelled'] as Filter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs capitalize transition ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            )
          )}
        </div>
        <span className="ml-auto text-xs text-gray-500">
          Paid R {totals.paidSum.toFixed(2)} · Pending R {totals.pendingSum.toFixed(2)}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3 font-medium">Recipient</th>
              <th className="text-left p-3 font-medium">Amount</th>
              <th className="text-left p-3 font-medium">Scheduled</th>
              <th className="text-left p-3 font-medium">Paid</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Notes</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.member_name ?? '—'}</td>
                <td className="p-3">R {Number(r.amount).toFixed(2)}</td>
                <td className="p-3 text-gray-600">{r.scheduled_date ?? '—'}</td>
                <td className="p-3 text-gray-600">{r.paid_date ?? '—'}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded capitalize ${
                      r.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'approved'
                          ? 'bg-blue-100 text-blue-700'
                          : r.status === 'scheduled'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-gray-600 max-w-[200px] truncate">
                  {r.status === 'cancelled' && r.rejected_reason
                    ? `Rejected: ${r.rejected_reason}`
                    : r.notes ?? '—'}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    {canApprove && r.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => approve(r.id)}
                          disabled={busy}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50"
                          title="Approve"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          onClick={() => reject(r.id)}
                          disabled={busy}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50"
                          title="Reject"
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </>
                    )}
                    {canWrite && r.status === 'approved' && (
                      <button
                        onClick={() => markPaid(r.id)}
                        disabled={busy}
                        className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 disabled:opacity-50"
                        title="Mark paid"
                      >
                        <Wallet size={14} />
                      </button>
                    )}
                    {canWrite && r.status === 'paid' && (
                      <button
                        onClick={() => unmarkPaid(r.id)}
                        disabled={busy}
                        className="p-1.5 rounded hover:bg-amber-100 text-amber-700 disabled:opacity-50"
                        title="Unmark paid"
                      >
                        <Undo2 size={14} />
                      </button>
                    )}
                    {canWrite && (r.status === 'scheduled' || r.status === 'cancelled') && (
                      <button
                        onClick={() => deleteRow(r.id)}
                        disabled={busy}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No payouts match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}