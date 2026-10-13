'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ContributionsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState('all')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: ms } = await supabase.from('members').select('stokvel_id').eq('user_id', user.id)
    const ids = ms?.map(m => m.stokvel_id) ?? []
    if (!ids.length) return
    let query = supabase.from('contributions')
      .select('*, members:member_id(profiles:user_id(full_name))')
      .in('stokvel_id', ids).order('due_date', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [filter])

  async function markPaid(id: string, amount: number, stokvel_id: string) {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('contributions')
      .update({ status: 'paid', paid_date: today }).eq('id', id)
    await supabase.from('transactions').insert({
      stokvel_id, type: 'deposit', amount, description: 'Contribution payment'
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Contributions</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border p-2 rounded">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="late">Late</option>
          <option value="missed">Missed</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Member</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Due</th>
              <th className="text-left p-3">Paid</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.members?.profiles?.full_name ?? '—'}</td>
                <td className="p-3">R {Number(r.amount).toFixed(2)}</td>
                <td className="p-3">{r.due_date}</td>
                <td className="p-3">{r.paid_date ?? '—'}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3">
                  {r.status !== 'paid' && (
                    <button onClick={() => markPaid(r.id, r.amount, r.stokvel_id)}
                      className="text-xs bg-emerald-600 text-white px-3 py-1 rounded">
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-gray-500">No contributions found.</p>}
      </div>
    </div>
  )
}