'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type MemberOption = {
  id: string
  name: string
  role: string
}

export default function PayoutForm({
  stokvelId,
  onCreated,
}: {
  stokvelId: string
  onCreated: () => void
}) {
  const supabase = useMemo(() => createClient(), [])

  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [memberId, setMemberId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    async function loadMembers() {
      const { data, error: qErr } = await supabase
        .from('members')
        .select('id, role, profiles:user_id(full_name)')
        .eq('stokvel_id', stokvelId)
        .eq('status', 'active')

      if (qErr) return

      const list: MemberOption[] = (data ?? []).map((m: any) => {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        return {
          id: m.id,
          name: prof?.full_name ?? '—',
          role: m.role,
        }
      })
      setMembers(list)
      if (list.length > 0 && !memberId) setMemberId(list[0].id)
    }
    loadMembers()
  }, [open, stokvelId, supabase, memberId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const parsed = Number(amount)
    if (!memberId) {
      setError('Pick a member.')
      return
    }
    if (!parsed || parsed <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    setSaving(true)
    const { error: rpcErr } = await supabase.rpc('create_payout', {
      p_stokvel_id: stokvelId,
      p_member_id: memberId,
      p_amount: parsed,
      p_scheduled_date: scheduledDate || null,
      p_notes: notes.trim() || null,
    })
    setSaving(false)

    if (rpcErr) {
      setError(rpcErr.message)
      return
    }

    setAmount('')
    setNotes('')
    setOpen(false)
    onCreated()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
      >
        <Receipt size={16} /> New payout
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border rounded-xl p-4 shadow-sm w-full max-w-md"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Create payout</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        New payouts start as <strong>scheduled</strong>. A chairperson or admin
        must approve before they can be marked paid.
      </p>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Recipient
        </span>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role})
            </option>
          ))}
        </select>
      </label>

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Amount (R)
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="5000.00"
        />
      </label>

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Scheduled date
        </span>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g. Month 3 rotational payout"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs rounded-md border hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create payout'}
        </button>
      </div>
    </form>
  )
}