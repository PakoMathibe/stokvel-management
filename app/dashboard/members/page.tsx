'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Member } from '@/lib/types'

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: myMemberships } = await supabase
        .from('members').select('stokvel_id').eq('user_id', user.id)
      const ids = myMemberships?.map(m => m.stokvel_id) ?? []
      if (!ids.length) return
      const { data } = await supabase
        .from('members')
        .select('*, profiles:user_id(full_name, phone)')
        .in('stokvel_id', ids)
      setMembers((data as any) ?? [])
    })()
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Members</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-medium">{m.profiles?.full_name ?? '—'}</td>
                <td className="p-3">{m.profiles?.phone ?? '—'}</td>
                <td className="p-3 capitalize">{m.role}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="p-3">{new Date(m.joined_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!members.length && <p className="p-6 text-gray-500">No members yet.</p>}
      </div>
    </div>
  )
}