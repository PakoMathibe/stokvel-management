'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

export type InviteSummary = {
  id: string
  token: string
  stokvel_id: string
  stokvel_name: string
  stokvel_type: string
  invited_by_name: string | null
  role: string
  created_at: string
  expires_at: string
}

export default function InviteCard({
  invite,
  onAccept,
  onDecline,
}: {
  invite: InviteSummary
  onAccept: (token: string) => Promise<void>
  onDecline?: (token: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')

  async function handleAccept() {
    setError('')
    setBusy('accept')
    try {
      await onAccept(invite.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDecline() {
    if (!onDecline) return
    setError('')
    setBusy('decline')
    try {
      await onDecline(invite.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decline invite.')
    } finally {
      setBusy(null)
    }
  }

  const expires = new Date(invite.expires_at)
  const daysLeft = Math.max(
    0,
    Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{invite.stokvel_name}</h3>
          <p className="text-xs text-gray-500 capitalize mt-0.5">
            {invite.stokvel_type} stokvel · invited as{' '}
            <span className="font-medium">{invite.role}</span>
          </p>
          {invite.invited_by_name && (
            <p className="text-xs text-gray-500 mt-1">
              Invited by {invite.invited_by_name}
            </p>
          )}
        </div>
        <span className="text-[11px] uppercase tracking-wide bg-amber-50 text-amber-700 px-2 py-0.5 rounded shrink-0">
          {daysLeft === 0 ? 'expires today' : `${daysLeft}d left`}
        </span>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleAccept}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          <Check size={14} />
          {busy === 'accept' ? 'Joining…' : 'Accept'}
        </button>
        {onDecline && (
          <button
            onClick={handleDecline}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <X size={14} />
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        )}
      </div>
    </div>
  )
}