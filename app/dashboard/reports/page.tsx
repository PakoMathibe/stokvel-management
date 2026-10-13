'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ReportsPage() {
  const supabase = createClient()
  const [txs, setTxs] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ms } = await supabase.from('members').select('stokvel_id').eq('user_id', user.id)
      const ids = ms?.map(m => m.stokvel_id) ?? []
      if (!ids.length) return
      const { data } = await supabase.from('transactions')
        .select('*').in('stokvel_id', ids).order('created_at', { ascending: false })
      setTxs(data ?? [])
    })()
  }, [])

  function exportCsv() {
    const header = 'date,type,amount,description\n'
    const body = txs.map(t =>
      `${t.created_at.slice(0,10)},${t.type},${t.amount},"${t.description ?? ''}"`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'stokvel-report.csv'; a.click()
  }

  const balance = txs.reduce((s, t) =>
    t.type === 'deposit' || t.type === 'interest' ? s + Number(t.amount) : s - Number(t.amount), 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Report</h1>
        <button onClick={exportCsv}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
          Export CSV
        </button>
      </div>
      <p className="mb-4 text-lg">Current balance: <strong>R {balance.toFixed(2)}</strong></p>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.created_at.slice(0,10)}</td>
                <td className="p-3 capitalize">{t.type}</td>
                <td className="p-3">R {Number(t.amount).toFixed(2)}</td>
                <td className="p-3">{t.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!txs.length && <p className="p-6 text-gray-500">No transactions yet.</p>}
      </div>
    </div>
  )
}