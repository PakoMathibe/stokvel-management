'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function PayoutsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: ms } = await supabase.from('members').select('stokvel_id').eq('user_id', user.id)
    const ids = ms?.map(m => m.stokvel_id) ?? []
    if (!ids.length) return
    const { data } = await supabase.from('payouts')
      .select('*, members:member_id(profiles:user_id(full_name))')
      .in('stokvel_id', ids).order('scheduled_date')
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payouts</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Recipient</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Scheduled</th>
              <th className="text-left p-3">Paid</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.members?.profiles?.full_name ?? '—'}</td>
                <td className="p-3">R {Number(r.amount).toFixed(2)}</td>
                <td className="p-3">{r.scheduled_date ?? '—'}</td>
                <td className="p-3">{r.paid_date ?? '—'}</td>
                <td className="p-3 capitalize">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-gray-500">No payouts scheduled.</p>}
      </div>
    </div>
  )
}