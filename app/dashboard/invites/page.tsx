'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import InviteCard, { InviteSummary } from '@/components/InviteCard'

export default function DashboardInvitesPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [invites, setInvites] = useState<InviteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: rpcErr } = await supabase.rpc('get_my_pending_invites')
    if (rpcErr) {
      setError(rpcErr.message)
      setInvites([])
      setLoading(false)
      return
    }
    setInvites((data as InviteSummary[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleAccept(token: string) {
    const { error: rpcErr } = await supabase.rpc('accept_stokvel_invite', {
      p_token: token,
    })
    if (rpcErr) throw new Error(rpcErr.message)
    router.push('/dashboard/stokvels')
    router.refresh()
  }

  async function handleDecline(token: string) {
    const { error: rpcErr } = await supabase.rpc('decline_stokvel_invite', {
      p_token: token,
    })
    if (rpcErr) throw new Error(rpcErr.message)
    load()
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Invitations</h1>
      <p className="text-sm text-gray-500 mb-6">
        Pending invitations to stokvels, matched to your email address.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : invites.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <h2 className="text-lg font-semibold mb-1">No pending invites</h2>
          <p className="text-sm text-gray-500">
            When someone invites you to a stokvel, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invites.map((inv) => (
            <InviteCard
              key={inv.id}
              invite={inv}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))}
        </div>
      )}
    </div>
  )
}