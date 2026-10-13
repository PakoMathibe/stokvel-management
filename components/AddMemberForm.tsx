'use client'

import { useMemo, useState } from 'react'
import { UserPlus, X, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function AddMemberForm({
  stokvelId,
  onInvited,
}: {
  stokvelId: string
  onInvited: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'member' | 'treasurer' | 'chairperson' | 'admin'>('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLastInviteLink(null)
    setCopied(false)

    if (!email.trim() && !phone.trim()) {
      setError('Enter an email or phone number.')
      return
    }
    if (!email.trim()) {
      setError('Email is required so the invitee can be matched on sign-in.')
      return
    }

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setError('Not signed in.')
      return
    }

    const { data, error: insErr } = await supabase
      .from('stokvel_invites')
      .insert({
        stokvel_id: stokvelId,
        invited_email: email.trim().toLowerCase(),
        invited_phone: phone.trim() ? phone.trim() : null,
        role,
        invited_by: user.id,
      })
      .select('token')
      .single()

    setSaving(false)

    if (insErr || !data) {
      setError(insErr?.message ?? 'Could not create invite.')
      return
    }

    const link =
      typeof window !== 'undefined'
        ? `${window.location.origin}/invites/${data.token}`
        : `/invites/${data.token}`

    setLastInviteLink(link)
    setEmail('')
    setPhone('')
    setRole('member')
    onInvited()
  }

  async function copyLink() {
    if (!lastInviteLink) return
    try {
      await navigator.clipboard.writeText(lastInviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
      >
        <UserPlus size={16} /> Invite member
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border rounded-xl p-4 shadow-sm w-full max-w-md"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Invite a member</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setLastInviteLink(null)
          }}
          className="text-gray-400 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {lastInviteLink && (
        <div className="mb-3 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-xs">
          <p className="font-medium text-emerald-900 mb-2">
            Invite created. Share this link with the invitee:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={lastInviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 text-[11px] font-mono"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white text-[11px] hover:bg-emerald-700"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="member@example.com"
        />
      </label>

      <label className="block mb-3">
        <span className="block text-xs font-medium text-gray-700 mb-1">
          Phone <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="0821234567"
        />
      </label>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-gray-700 mb-1">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="member">Member</option>
          <option value="treasurer">Treasurer</option>
          <option value="chairperson">Chairperson</option>
          <option value="admin">Admin</option>
        </select>
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
          {saving ? 'Sending…' : 'Send invite'}
        </button>
      </div>
    </form>
  )
}