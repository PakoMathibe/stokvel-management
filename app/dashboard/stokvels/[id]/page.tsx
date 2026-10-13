'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, UserPlus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import AddMemberForm from '@/components/AddMemberForm'
import RotationPanel from '@/components/RotationPanel'

type Stokvel = {
  id: string
  name: string
  description: string | null
  type: string
  contribution_amount: number
  frequency: string
  bank_name: string | null
  bank_account_masked: string | null
  nasasa_registration: string | null
  penalty_rules: string | null
  created_by: string
  created_at: string
}

type MemberRow = {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string
  profiles: { full_name: string | null; phone: string | null } | null
}

type InviteRow = {
  id: string
  invited_email: string | null
  invited_phone: string | null
  role: string
  status: string
  created_at: string
  expires_at: string
}

type Tab = 'overview' | 'members' | 'invites' | 'rotation'

export default function StokvelDetailPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const stokvelId = params?.id as string

  const [stokvel, setStokvel] = useState<Stokvel | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: s } = await supabase
      .from('stokvels')
      .select(
        'id, name, description, type, contribution_amount, frequency, bank_name, bank_account_masked, nasasa_registration, penalty_rules, created_by, created_at'
      )
      .eq('id', stokvelId)
      .maybeSingle()

    if (!s) {
      setError('Stokvel not found or you do not have access.')
      setLoading(false)
      return
    }
    setStokvel(s as Stokvel)

    const { data: mrows } = await supabase
      .from('members')
      .select('id, user_id, role, status, joined_at, profiles:user_id(full_name, phone)')
      .eq('stokvel_id', stokvelId)
      .order('joined_at', { ascending: true })

    const my = (mrows ?? []).find((m) => m.user_id === user.id)
    setMyRole(my?.role ?? null)
    setMembers((mrows as unknown as MemberRow[]) ?? [])

    const canSeeInvites = ['admin', 'chairperson', 'treasurer'].includes(my?.role ?? '')
    if (canSeeInvites) {
      const { data: inv } = await supabase
        .from('stokvel_invites')
        .select('id, invited_email, invited_phone, role, status, created_at, expires_at')
        .eq('stokvel_id', stokvelId)
        .order('created_at', { ascending: false })
      setInvites((inv as InviteRow[]) ?? [])
    }

    setLoading(false)
  }, [stokvelId, router, supabase])

  useEffect(() => {
    load()
  }, [load])

  async function revokeInvite(id: string) {
    await supabase.from('stokvel_invites').delete().eq('id', id)
    load()
  }

  async function removeMember(memberId: string, userId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    if (userId === user.id) {
      setError('You cannot remove yourself. Transfer admin first or leave the group.')
      return
    }
    await supabase.from('members').delete().eq('id', memberId)
    load()
  }

  const canAdmin = myRole ? ['admin', 'chairperson', 'treasurer'].includes(myRole) : false

  if (loading) return <p className="text-gray-500">Loading…</p>
  if (error && !stokvel) {
    return (
      <div className="bg-white border rounded-xl p-6">
        <p className="text-red-600 text-sm">{error}</p>
        <Link
          href="/dashboard/stokvels"
          className="text-emerald-700 text-sm underline mt-2 inline-block"
        >
          Back to stokvels
        </Link>
      </div>
    )
  }
  if (!stokvel) return null

  const isRotational = stokvel.type === 'rotational'
  const tabs: Tab[] = isRotational
    ? ['overview', 'members', 'invites', 'rotation']
    : ['overview', 'members', 'invites']

  return (
    <div>
      <Link
        href="/dashboard/stokvels"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ArrowLeft size={14} /> All stokvels
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{stokvel.name}</h1>
          <p className="text-sm text-gray-500 capitalize mt-1">
            {stokvel.type} · R {Number(stokvel.contribution_amount).toFixed(2)}{' '}
            {stokvel.frequency}
          </p>
        </div>
        {canAdmin && tab === 'invites' && (
          <AddMemberForm stokvelId={stokvelId} onInvited={load} />
        )}
      </div>

      <div className="border-b mb-6 flex gap-6 text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 -mb-px border-b-2 capitalize ${
              tab === t
                ? 'border-emerald-600 text-emerald-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Details</h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Type</dt>
                <dd className="capitalize">{stokvel.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Contribution</dt>
                <dd>
                  R {Number(stokvel.contribution_amount).toFixed(2)} ·{' '}
                  {stokvel.frequency}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Bank</dt>
                <dd>{stokvel.bank_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Account</dt>
                <dd>{stokvel.bank_account_masked ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">NASASA</dt>
                <dd>{stokvel.nasasa_registration ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Members</dt>
                <dd>{members.length}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Rules</h2>
            {stokvel.description ? (
              <p className="text-sm text-gray-700 mb-4">{stokvel.description}</p>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No description set.</p>
            )}
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1">
              Penalties
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {stokvel.penalty_rules ?? 'None specified.'}
            </p>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Joined</th>
                <th className="p-3"></th>
                {canAdmin && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-medium">{m.profiles?.full_name ?? '—'}</td>
                  <td className="p-3 text-gray-600">{m.profiles?.phone ?? '—'}</td>
                  <td className="p-3 capitalize">{m.role}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        m.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/dashboard/members/${m.id}`}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                    >
                      Statement <ExternalLink size={12} />
                    </Link>
                  </td>
                  {canAdmin && (
                    <td className="p-3 text-right">
                      <button
                        onClick={() => removeMember(m.id, m.user_id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={canAdmin ? 7 : 6}
                    className="p-6 text-center text-gray-500"
                  >
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invites' && (
        <div>
          {!canAdmin ? (
            <p className="text-sm text-gray-500">Only admins can see invites.</p>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3 font-medium">Invitee</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Expires</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="p-3">{i.invited_email ?? i.invited_phone}</td>
                      <td className="p-3 capitalize">{i.role}</td>
                      <td className="p-3 capitalize">{i.status}</td>
                      <td className="p-3 text-gray-500">
                        {new Date(i.expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        {i.status === 'pending' && (
                          <button
                            onClick={() => revokeInvite(i.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Revoke"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invites.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500">
                        No invites yet. Click &quot;Invite member&quot; above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'rotation' && isRotational && (
        <RotationPanel
          stokvelId={stokvelId}
          stokvelType={stokvel.type}
          myRole={myRole as any}
        />
      )}
    </div>
  )
}