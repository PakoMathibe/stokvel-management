'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, MessageCircle, Trash2, Undo2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export type ContributionRow = {
  id: string
  stokvel_id: string
  member_id: string
  amount: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'late' | 'missed'
  period_label: string | null
  reference: string | null
  member_name: string | null
  member_phone: string | null
}

type Filter = 'all' | 'pending' | 'paid' | 'late' | 'missed'

export default function ContributionTable({
  rows,
  canWrite,
  onChanged,
  currentStokvelName,
}: {
  rows: ContributionRow[]
  canWrite: boolean
  onChanged: () => void
  currentStokvelName: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'paid')
    const pending = rows.filter(
      (r) => r.status === 'pending' || r.status === 'late'
    )
    return {
      paidCount: paid.length,
      paidSum: paid.reduce((s, r) => s + Number(r.amount), 0),
      pendingCount: pending.length,
      pendingSum: pending.reduce((s, r) => s + Number(r.amount), 0),
    }
  }, [rows])

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set())
      return
    }
    setSelected(
      new Set(
        filtered.filter((r) => r.status !== 'paid').map((r) => r.id)
      )
    )
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function markPaid(id: string) {
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('mark_contribution_paid', {
      p_contribution_id: id,
      p_paid_date: new Date().toISOString().slice(0, 10),
      p_reference: null,
    })
    setBusy(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    onChanged()
  }

  async function unmarkPaid(id: string) {
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc('unmark_contribution_paid', {
      p_contribution_id: id,
    })
    setBusy(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    onChanged()
  }

  async function bulkMarkPaid() {
    if (selected.size === 0) return
    setError('')
    setBusy(true)
    const { error: rpcErr } = await supabase.rpc(
      'mark_contributions_paid_bulk',
      {
        p_contribution_ids: Array.from(selected),
        p_paid_date: new Date().toISOString().slice(0, 10),
      }
    )
    setBusy(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    setSelected(new Set())
    onChanged()
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this contribution? This cannot be undone.')) return
    setError('')
    setBusy(true)
    const { error: delErr } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id)
    setBusy(false)
    if (delErr) {
      setError(delErr.message)
      return
    }
    onChanged()
  }

  function reminderLink(row: ContributionRow) {
    const phone = row.member_phone?.replace(/\D/g, '') ?? ''
    const msg = encodeURIComponent(
      `Hi ${row.member_name ?? 'there'}, friendly reminder: your ${currentStokvelName} contribution of R${Number(
        row.amount
      ).toFixed(2)} for ${row.period_label ?? row.due_date} is still outstanding. Due ${row.due_date}. Thank you!`
    )
    if (!phone) return `https://wa.me/?text=${msg}`
    const withCountry = phone.startsWith('0') ? `27${phone.slice(1)}` : phone
    return `https://wa.me/${withCountry}?text=${msg}`
  }

  async function copyReminder(row: ContributionRow) {
    const msg = `Hi ${row.member_name ?? 'there'}, friendly reminder: your ${currentStokvelName} contribution of R${Number(
      row.amount
    ).toFixed(2)} for ${row.period_label ?? row.due_date} is still outstanding. Due ${row.due_date}. Thank you!`
    try {
      await navigator.clipboard.writeText(msg)
      setCopiedId(row.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const allSelectable = filtered.filter((r) => r.status !== 'paid')
  const allSelected =
    allSelectable.length > 0 &&
    allSelectable.every((r) => selected.has(r.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {(['all', 'pending', 'paid', 'late', 'missed'] as Filter[]).map((f) => (
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
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canWrite && selected.size > 0 && (
            <button
              onClick={bulkMarkPaid}
              disabled={busy}
              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check size={12} /> Mark {selected.size} paid
            </button>
          )}
          <span className="text-xs text-gray-500">
            Paid R {totals.paidSum.toFixed(2)} · Pending R {totals.pendingSum.toFixed(2)}
          </span>
        </div>
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
              {canWrite && (
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    disabled={allSelectable.length === 0}
                  />
                </th>
              )}
              <th className="text-left p-3 font-medium">Member</th>
              <th className="text-left p-3 font-medium">Period</th>
              <th className="text-left p-3 font-medium">Amount</th>
              <th className="text-left p-3 font-medium">Due</th>
              <th className="text-left p-3 font-medium">Paid</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                {canWrite && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      disabled={r.status === 'paid'}
                    />
                  </td>
                )}
                <td className="p-3 font-medium">{r.member_name ?? '—'}</td>
                <td className="p-3 text-gray-600">
                  {r.period_label ?? r.due_date.slice(0, 7)}
                </td>
                <td className="p-3">R {Number(r.amount).toFixed(2)}</td>
                <td className="p-3 text-gray-600">{r.due_date}</td>
                <td className="p-3 text-gray-600">{r.paid_date ?? '—'}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded capitalize ${
                      r.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : r.status === 'late'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    {r.status !== 'paid' && (
                      <a
                        href={reminderLink(r)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700"
                        title="Send WhatsApp reminder"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {r.status !== 'paid' && (
                      <button
                        onClick={() => copyReminder(r)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                        title="Copy reminder message"
                      >
                        {copiedId === r.id ? (
                          <Check size={14} className="text-emerald-700" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}
                    {canWrite && r.status !== 'paid' && (
                      <button
                        onClick={() => markPaid(r.id)}
                        disabled={busy}
                        className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 disabled:opacity-50"
                        title="Mark paid"
                      >
                        <Check size={14} />
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
                    {canWrite && (
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
                <td
                  colSpan={canWrite ? 8 : 7}
                  className="p-6 text-center text-gray-500"
                >
                  No contributions match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}