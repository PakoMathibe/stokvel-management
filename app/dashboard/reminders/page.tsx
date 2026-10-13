'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Mail, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type ReminderLogRow = {
  id: string
  stokvel_id: string
  stokvel_name: string
  channel: string
  sent_at: string
  success: boolean
  error_message: string | null
}

export default function RemindersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [logs, setLogs] = useState<ReminderLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState<{
    reminder_opt_out: boolean
    reminder_channel: 'whatsapp' | 'email' | 'sms'
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('reminder_opt_out, reminder_channel')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      setPrefs({
        reminder_opt_out: profile.reminder_opt_out ?? false,
        reminder_channel: (profile.reminder_channel ?? 'whatsapp') as
          | 'whatsapp'
          | 'email'
          | 'sms',
      })
    }

    // Reminder log for my stokvels
    const { data: memberships } = await supabase
      .from('members')
      .select('stokvel_id')
      .eq('user_id', user.id)
    const ids = memberships?.map((m) => m.stokvel_id) ?? []
    if (!ids.length) {
      setLoading(false)
      return
    }

    const { data: rows, error: qErr } = await supabase
      .from('reminder_log')
      .select('id, stokvel_id, channel, sent_at, success, error_message, stokvels:stokvel_id(name)')
      .in('stokvel_id', ids)
      .order('sent_at', { ascending: false })
      .limit(100)

    if (qErr) {
      setError(qErr.message)
      setLoading(false)
      return
    }

    setLogs(
      (rows ?? []).map((r: any) => ({
        id: r.id,
        stokvel_id: r.stokvel_id,
        stokvel_name: Array.isArray(r.stokvels)
          ? r.stokvels[0]?.name
          : r.stokvels?.name ?? '—',
        channel: r.channel,
        sent_at: r.sent_at,
        success: r.success,
        error_message: r.error_message,
      }))
    )
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function savePrefs(updates: Partial<NonNullable<typeof prefs>>) {
    if (!prefs) return
    setSaving(true)
    const next = { ...prefs, ...updates }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({
          reminder_opt_out: next.reminder_opt_out,
          reminder_channel: next.reminder_channel,
        })
        .eq('id', user.id)
      setPrefs(next)
    }
    setSaving(false)
  }

  if (loading) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reminders</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automated contribution reminders and your notification preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {prefs && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Your preferences</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {prefs.reminder_opt_out ? (
                  <BellOff size={18} className="text-gray-400" />
                ) : (
                  <Bell size={18} className="text-emerald-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    Receive contribution reminders
                  </p>
                  <p className="text-xs text-gray-500">
                    Reminders are sent when your contribution is overdue.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  savePrefs({ reminder_opt_out: !prefs.reminder_opt_out })
                }
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  prefs.reminder_opt_out ? 'bg-gray-300' : 'bg-emerald-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    prefs.reminder_opt_out ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </label>

            <div>
              <p className="text-sm font-medium mb-2">Preferred channel</p>
              <div className="flex gap-2">
                <button
                  onClick={() => savePrefs({ reminder_channel: 'whatsapp' })}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition ${
                    prefs.reminder_channel === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => savePrefs({ reminder_channel: 'email' })}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition ${
                    prefs.reminder_channel === 'email'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Mail size={14} /> Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Reminder history</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3 font-medium">Stokvel</th>
              <th className="text-left p-3 font-medium">Channel</th>
              <th className="text-left p-3 font-medium">Sent</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-medium">{l.stokvel_name}</td>
                <td className="p-3 capitalize">{l.channel}</td>
                <td className="p-3 text-gray-500">
                  {new Date(l.sent_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      l.success
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {l.success ? 'sent' : 'failed'}
                  </span>
                  {!l.success && l.error_message && (
                    <span className="ml-2 text-xs text-gray-500">
                      {l.error_message}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No reminders sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}