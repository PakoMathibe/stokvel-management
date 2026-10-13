'use client'

import { useMemo, useState } from 'react'
import { X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function ContributionForm({
  stokvelId,
  defaultAmount,
  frequency,
  onGenerated,
}: {
  stokvelId: string
  defaultAmount: number
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  onGenerated: () => void
}) {
  const supabase = useMemo(() => createClient(), [])

  const [open, setOpen] = useState(false)
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date()
    if (frequency === 'monthly') {
      // last day of the current month
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return last.toISOString().slice(0, 10)
    }
    return d.toISOString().slice(0, 10)
  })
  const [amount, setAmount] = useState<string>(String(defaultAmount))
  const [periodLabel, setPeriodLabel] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setCreated(null)

    const parsedAmount = Number(amount)
    if (!dueDate) {
      setError('Pick a due date.')
      return
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    setSaving(true)
    const { data, error: rpcErr } = await supabase.rpc(
      'bulk_generate_contributions',
      {
        p_stokvel_id: stokvelId,
        p_due_date: dueDate,
        p_amount: parsedAmount,
        p_period_label: periodLabel || null,
      }
    )
    setSaving(false)

    if (rpcErr) {
      setError(rpcErr.message)
      return
    }

    setCreated(typeof data === 'number' ? data : 0)
    onGenerated()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
      >
        <Users size={16} /> Generate contributions
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border rounded-xl p-4 shadow-sm w-full max-w-md"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Generate contributions</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setCreated(null)
          }}
          className="text-gray-400 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Creates one row per active member. Members who already have a row for
        this due date are skipped.
      </p>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {created !== null && (
        <div className="mb-3 rounded-md bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
          Created {created} contribution{created === 1 ? '' : 's'}.
        </div>
      )}

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Period label
        </span>
        <input
          type="text"
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="2026-03"
        />
      </label>

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Due date
        </span>
        <input
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Amount per member (R)
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
        >
          Close
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </form>
  )
}