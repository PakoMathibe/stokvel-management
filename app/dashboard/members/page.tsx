'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Row = {
  id: string
  stokvel_id: string
  stokvel_name: string
  name: string | null
  phone: string | null
  role: string
  status: string
  joined_at: string
}

export default function MembersPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: myMemberships } = await supabase
      .from('members')
      .select('stokvel_id')
      .eq('user_id', user.id)
    const ids = myMemberships?.map((m) => m.stokvel_id) ?? []
    if (!ids.length) {
      setRows([])
      setLoading(false)
      return
    }

    const { data, error: qErr } = await supabase
      .from('members')
      .select(
        'id, stokvel_id, role, status, joined_at, stokvels:stokvel_id(name), profiles:user_id(full_name, phone)'
      )
      .in('stokvel_id', ids)
      .order('joined_at', { ascending: true })

    if (qErr) {
      setRows([])
      setLoading(false)
      return
    }

    const mapped: Row[] = (data ?? []).map((r: any) => {
      const sk = Array.isArray(r.stokvels) ? r.stokvels[0] : r.stokvels
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        id: r.id,
        stokvel_id: r.stokvel_id,
        stokvel_name: sk?.name ?? '—',
        name: prof?.full_name ?? null,
        phone: prof?.phone ?? null,
        role: r.role,
        status: r.status,
        joined_at: r.joined_at,
      }
    })

    setRows(mapped)
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Members</h1>
      <p className="text-sm text-gray-500 mb-6">
        Everyone in the stokvels you belong to. Click a row to see their
        statement.
      </p>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Stokvel</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Joined</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{m.name ?? '—'}</td>
                <td className="p-3 text-gray-600">{m.stokvel_name}</td>
                <td className="p-3 text-gray-600">{m.phone ?? '—'}</td>
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
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}