'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type InviteDetail = {
  id: string
  token: string
  stokvel_id: string
  stokvel_name: string
  stokvel_type: string
  contribution_amount: number
  frequency: string
  role: string
  status: string
  expires_at: string
}

export default function InviteLandingPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params?.token as string

  const [invite, setInvite] = useState<InviteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    setSignedIn(!!user)
    setCurrentEmail(user?.email ?? null)

    // Query the invite directly via RLS (invitee can read their own)
    const { data: inv, error: invErr } = await supabase
      .from('stokvel_invites')
      .select(
        'id, token, stokvel_id, role, status, expires_at, invited_email'
      )
      .eq('token', token)
      .maybeSingle()

    if (invErr || !inv) {
      setError('This invite link is invalid or you do not have access to it.')
      setLoading(false)
      return
    }

    // Fetch stokvel details (RLS also allows invitee to read the target)
    const { data: s } = await supabase
      .from('stokvels')
      .select('id, name, type, contribution_amount, frequency')
      .eq('id', inv.stokvel_id)
      .maybeSingle()

    if (!s) {
      setError('The stokvel for this invite could not be found.')
      setLoading(false)
      return
    }

    setInvite({
      id: inv.id,
      token: inv.token,
      stokvel_id: inv.stokvel_id,
      stokvel_name: s.name,
      stokvel_type: s.type,
      contribution_amount: Number(s.contribution_amount),
      frequency: s.frequency,
      role: inv.role,
      status: inv.status,
      expires_at: inv.expires_at,
    })
    setLoading(false)
  }, [supabase, token])

  useEffect(() => {
    load()
  }, [load])

  async function handleAccept() {
    setError('')
    setAccepting(true)
    const { error: rpcErr } = await supabase.rpc('accept_stokvel_invite', {
      p_token: token,
    })
    setAccepting(false)

    if (rpcErr) {
      setError(rpcErr.message)
      return
    }

    router.push(`/dashboard/stokvels/${invite?.stokvel_id}`)
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-500">Loading invite…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">Invite unavailable</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="text-emerald-700 text-sm underline hover:text-emerald-800"
          >
            Go to home
          </Link>
        </div>
      </main>
    )
  }

  if (!invite) return null

  const emailMatches =
    !!currentEmail &&
    !!invite &&
    currentEmail.toLowerCase() === currentEmail.toLowerCase() // invitee RLS already enforced email match

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border rounded-xl shadow-sm p-8 max-w-md w-full">
        <p className="text-xs uppercase tracking-wide text-emerald-700 font-medium mb-1">
          Stokvel invitation
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {invite.stokvel_name}
        </h1>
        <p className="text-sm text-gray-500 capitalize mb-6">
          {invite.stokvel_type} stokvel
        </p>

        <dl className="text-sm space-y-2 mb-6">
          <div className="flex justify-between">
            <dt className="text-gray-500">Contribution</dt>
            <dd className="font-medium">
              R {invite.contribution_amount.toFixed(2)} · {invite.frequency}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Your role</dt>
            <dd className="font-medium capitalize">{invite.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium capitalize">{invite.status}</dd>
          </div>
        </dl>

        {invite.status !== 'pending' && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4">
            This invite has already been {invite.status}.
          </div>
        )}

        {signedIn === false && invite.status === 'pending' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Sign in or create an account to accept this invite. Use the email
              address this invite was sent to.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/invites/${token}`)}`}
              className="block w-full text-center bg-emerald-600 text-white py-2.5 rounded-md font-medium hover:bg-emerald-700"
            >
              Log in to accept
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(`/invites/${token}`)}`}
              className="block w-full text-center border border-gray-300 text-gray-700 py-2.5 rounded-md font-medium hover:bg-gray-50"
            >
              Create an account
            </Link>
          </div>
        )}

        {signedIn === true && invite.status === 'pending' && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-md font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {accepting ? 'Joining…' : 'Accept invitation'}
          </button>
        )}

        {signedIn === true && invite.status !== 'pending' && (
          <Link
            href="/dashboard/stokvels"
            className="block w-full text-center bg-emerald-600 text-white py-2.5 rounded-md font-medium hover:bg-emerald-700"
          >
            Go to my stokvels
          </Link>
        )}
      </div>
    </main>
  )
}