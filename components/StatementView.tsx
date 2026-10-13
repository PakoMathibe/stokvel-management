'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Download,
  Printer,
  Wallet,
} from 'lucide-react'

export type StatementMember = {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string
  name: string | null
  phone: string | null
  email: string | null
}

export type StatementStokvel = {
  id: string
  name: string
  type: string
  contribution_amount: number
  frequency: string
}

export type StatementSummary = {
  contributions_paid_count: number
  contributions_paid_total: number
  contributions_pending_count: number
  contributions_pending_total: number
  contributions_missed_count: number
  contributions_missed_total: number
  payouts_paid_count: number
  payouts_paid_total: number
  payouts_pending_count: number
  payouts_pending_total: number
}

export type StatementContribution = {
  id: string
  amount: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'late' | 'missed'
  period_label: string | null
  reference: string | null
  reminder_sent_at: string | null
  created_at: string
}

export type StatementPayout = {
  id: string
  amount: number
  scheduled_date: string | null
  paid_date: string | null
  status: 'scheduled' | 'approved' | 'paid' | 'cancelled'
  notes: string | null
  rejected_reason: string | null
  created_at: string
}

export type Statement = {
  member: StatementMember
  stokvel: StatementStokvel
  summary: StatementSummary
  contributions: StatementContribution[]
  payouts: StatementPayout[]
}

type Tab = 'overview' | 'contributions' | 'payouts'

export default function StatementView({ statement }: { statement: Statement }) {
  const [tab, setTab] = useState<Tab>('overview')

  const netPosition =
    Number(statement.summary.contributions_paid_total) -
    Number(statement.summary.payouts_paid_total)

  function handlePrint() {
    window.print()
  }

  function handleCsvExport() {
    const lines: string[] = []
    lines.push(`Member statement — ${statement.member.name ?? 'Member'}`)
    lines.push(`Stokvel: ${statement.stokvel.name}`)
    lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`)
    lines.push('')

    lines.push('CONTRIBUTIONS')
    lines.push('Date,Due,Period,Amount,Status,Reference')
    for (const c of statement.contributions) {
      lines.push(
        [
          c.paid_date ?? '',
          c.due_date,
          c.period_label ?? '',
          c.amount,
          c.status,
          (c.reference ?? '').replace(/,/g, ' '),
        ].join(',')
      )
    }
    lines.push('')

    lines.push('PAYOUTS')
    lines.push('Date,Scheduled,Amount,Status,Notes')
    for (const p of statement.payouts) {
      lines.push(
        [
          p.paid_date ?? '',
          p.scheduled_date ?? '',
          p.amount,
          p.status,
          (p.notes ?? p.rejected_reason ?? '').replace(/,/g, ' '),
        ].join(',')
      )
    }

    lines.push('')
    lines.push('SUMMARY')
    lines.push(`Contributions paid,${statement.summary.contributions_paid_total}`)
    lines.push(`Payouts received,${statement.summary.payouts_paid_total}`)
    lines.push(`Net position,${netPosition}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement-${statement.member.name?.replace(/\s+/g, '-') ?? 'member'}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const joinedLabel = new Date(statement.member.joined_at).toLocaleDateString(
    'en-ZA',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Header — printable */}
      <div className="bg-white border rounded-xl p-6 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-700 font-medium">
              Member statement
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {statement.member.name ?? 'Member'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {statement.stokvel.name} · <span className="capitalize">{statement.member.role}</span>
              {' · joined '}{joinedLabel}
            </p>
            {(statement.member.phone || statement.member.email) && (
              <p className="text-xs text-gray-400 mt-1">
                {statement.member.phone}
                {statement.member.phone && statement.member.email ? ' · ' : ''}
                {statement.member.email}
              </p>
            )}
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handleCsvExport}
              className="inline-flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 rounded-md text-xs hover:bg-gray-50"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 rounded-md text-xs hover:bg-gray-50"
            >
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ArrowUpRight size={16} />
            <p className="text-xs font-medium uppercase tracking-wide">
              Paid in
            </p>
          </div>
          <p className="text-xl font-bold mt-2">
            R {Number(statement.summary.contributions_paid_total).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {statement.summary.contributions_paid_count} contribution
            {statement.summary.contributions_paid_count === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <ArrowDownRight size={16} />
            <p className="text-xs font-medium uppercase tracking-wide">
              Received out
            </p>
          </div>
          <p className="text-xl font-bold mt-2">
            R {Number(statement.summary.payouts_paid_total).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {statement.summary.payouts_paid_count} payout
            {statement.summary.payouts_paid_count === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Wallet size={16} />
            <p className="text-xs font-medium uppercase tracking-wide">
              Outstanding
            </p>
          </div>
          <p className="text-xl font-bold mt-2">
            R {Number(statement.summary.contributions_pending_total).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {statement.summary.contributions_pending_count} pending
            {statement.summary.contributions_missed_count > 0
              ? ` · ${statement.summary.contributions_missed_count} missed`
              : ''}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Check size={16} />
            <p className="text-xs font-medium uppercase tracking-wide">
              Net position
            </p>
          </div>
          <p
            className={`text-xl font-bold mt-2 ${
              netPosition >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            R {netPosition.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {netPosition >= 0 ? 'Paid in more than received' : 'Received more than paid in'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6 text-sm print:hidden">
        {(['overview', 'contributions', 'payouts'] as Tab[]).map((t) => (
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

      {tab === 'overview' && (
        <div className="bg-white border rounded-xl p-6 print:border-0">
          <h2 className="font-semibold mb-4">Recent activity</h2>
          <ol className="relative border-l border-gray-200 ml-3 space-y-6">
            {buildTimeline(statement).slice(0, 15).map((item, i) => (
              <li key={i} className="ml-6">
                <span
                  className={`absolute -left-2 mt-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white ${
                    item.kind === 'contribution' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                >
                  {item.kind === 'contribution' ? '↑' : '↓'}
                </span>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.sublabel}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        item.kind === 'contribution'
                          ? 'text-emerald-700'
                          : 'text-blue-700'
                      }`}
                    >
                      R {Number(item.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">{item.date}</p>
                  </div>
                </div>
              </li>
            ))}
            {buildTimeline(statement).length === 0 && (
              <li className="ml-6 text-sm text-gray-500">No activity yet.</li>
            )}
          </ol>
        </div>
      )}

      {tab === 'contributions' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">Period</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Due</th>
                <th className="text-left p-3 font-medium">Paid</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {statement.contributions.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 text-gray-600">
                    {c.period_label ?? c.due_date.slice(0, 7)}
                  </td>
                  <td className="p-3 font-medium">
                    R {Number(c.amount).toFixed(2)}
                  </td>
                  <td className="p-3 text-gray-600">{c.due_date}</td>
                  <td className="p-3 text-gray-600">{c.paid_date ?? '—'}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded capitalize ${
                        c.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : c.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : c.status === 'late'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {statement.contributions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No contributions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Scheduled</th>
                <th className="text-left p-3 font-medium">Paid</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {statement.payouts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">
                    R {Number(p.amount).toFixed(2)}
                  </td>
                  <td className="p-3 text-gray-600">{p.scheduled_date ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.paid_date ?? '—'}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded capitalize ${
                        p.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'approved'
                            ? 'bg-blue-100 text-blue-700'
                            : p.status === 'scheduled'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600 max-w-[260px] truncate">
                    {p.status === 'cancelled' && p.rejected_reason
                      ? `Rejected: ${p.rejected_reason}`
                      : p.notes ?? '—'}
                  </td>
                </tr>
              ))}
              {statement.payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No payouts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center print:block print:text-gray-600 pt-4">
        Statement generated {new Date().toLocaleString('en-ZA')} · Stokvel
        Manager
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

type TimelineItem = {
  kind: 'contribution' | 'payout'
  label: string
  sublabel: string
  amount: number
  date: string
  sortKey: string
}

function buildTimeline(statement: Statement): TimelineItem[] {
  const items: TimelineItem[] = []

  for (const c of statement.contributions) {
    if (c.status !== 'paid') continue
    items.push({
      kind: 'contribution',
      label: 'Contribution paid',
      sublabel: c.period_label ?? `Due ${c.due_date}`,
      amount: c.amount,
      date: c.paid_date ?? c.due_date,
      sortKey: c.paid_date ?? c.due_date,
    })
  }

  for (const p of statement.payouts) {
    if (p.status !== 'paid') continue
    items.push({
      kind: 'payout',
      label: 'Payout received',
      sublabel: p.notes ?? 'Rotation payout',
      amount: p.amount,
      date: p.paid_date ?? p.scheduled_date ?? '',
      sortKey: p.paid_date ?? p.scheduled_date ?? '',
    })
  }

  return items.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1))
}