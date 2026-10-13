'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import StatementView, { Statement } from '@/components/StatementView'

export default function MemberStatementPage() {
  const supabase = useMemo(() => createClient(), [])
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const memberId = params?.id as string

  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: rpcErr } = await supabase.rpc('get_member_statement', {
      p_member_id: memberId,
    })

    if (rpcErr) {
      setError(rpcErr.message)
      setLoading(false)
      return
    }

    setStatement(data as Statement)
    setLoading(false)
  }, [memberId, router, supabase])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-gray-500">Loading statement…</p>

  if (error) {
    return (
      <div className="bg-white border rounded-xl p-6">
        <p className="text-red-600 text-sm">{error}</p>
        <Link
          href="/dashboard/members"
          className="text-emerald-700 text-sm underline mt-2 inline-block"
        >
          Back to members
        </Link>
      </div>
    )
  }

  if (!statement) return null

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/stokvels/${statement.stokvel.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 print:hidden"
      >
        <ArrowLeft size={14} /> Back to {statement.stokvel.name}
      </Link>

      <StatementView statement={statement} />
    </div>
  )
}