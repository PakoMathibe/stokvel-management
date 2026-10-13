'use client'

import { useState } from 'react'

export type StokvelFormValues = {
  name: string
  description: string
  type: 'rotational' | 'grocery' | 'burial' | 'investment' | 'savings'
  contribution_amount: number
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  bank_name: string
  bank_account_masked: string
  nasasa_registration: string
  penalty_rules: string
}

const TYPE_OPTIONS: { value: StokvelFormValues['type']; label: string; help: string }[] = [
  { value: 'rotational', label: 'Rotational', help: 'Members take turns receiving the full pool.' },
  { value: 'grocery', label: 'Grocery', help: 'Save together for bulk groceries.' },
  { value: 'burial', label: 'Burial Society', help: 'Immediate cover for bereavements.' },
  { value: 'investment', label: 'Investment', help: 'Pool funds into assets or interest-bearing accounts.' },
  { value: 'savings', label: 'Savings Club', help: 'Save over a cycle, then distribute back to members.' },
]

const FREQ_OPTIONS: { value: StokvelFormValues['frequency']; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
]

const EMPTY: StokvelFormValues = {
  name: '',
  description: '',
  type: 'rotational',
  contribution_amount: 0,
  frequency: 'monthly',
  bank_name: '',
  bank_account_masked: '',
  nasasa_registration: '',
  penalty_rules: '',
}

export default function StokvelForm({
  initial,
  submitLabel = 'Create Stokvel',
  onSubmit,
  onCancel,
}: {
  initial?: Partial<StokvelFormValues>
  submitLabel?: string
  onSubmit: (values: StokvelFormValues) => Promise<void> | void
  onCancel?: () => void
}) {
  const [values, setValues] = useState<StokvelFormValues>({ ...EMPTY, ...initial })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof StokvelFormValues>(key: K, value: StokvelFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!values.name.trim()) {
      setError('Please give the stokvel a name.')
      return
    }
    if (values.contribution_amount <= 0) {
      setError('Contribution amount must be greater than zero.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        bank_name: values.bank_name.trim(),
        bank_account_masked: values.bank_account_masked.trim(),
        nasasa_registration: values.nasasa_registration.trim(),
        penalty_rules: values.penalty_rules.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5"
    >
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Stokvel name</span>
        <input
          type="text"
          required
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g. Masakhane Savings Club"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <textarea
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="A short purpose statement for the group."
        />
      </label>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Type</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const selected = values.type === opt.value
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => update('type', opt.value)}
                className={`text-left p-3 rounded-md border transition ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.help}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Contribution amount (R)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={values.contribution_amount}
            onChange={(e) => update('contribution_amount', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="500.00"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Frequency</span>
          <select
            value={values.frequency}
            onChange={(e) =>
              update('frequency', e.target.value as StokvelFormValues['frequency'])
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {FREQ_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Bank <span className="text-gray-400 font-normal">(optional)</span>
          </span>
          <input
            type="text"
            value={values.bank_name}
            onChange={(e) => update('bank_name', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Standard Bank, African Bank, Nedbank…"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Account (masked) <span className="text-gray-400 font-normal">(optional)</span>
          </span>
          <input
            type="text"
            value={values.bank_account_masked}
            onChange={(e) => update('bank_account_masked', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="****1234"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          NASASA registration <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <input
          type="text"
          value={values.nasasa_registration}
          onChange={(e) => update('nasasa_registration', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Registration reference, if any"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Penalty rules <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <textarea
          value={values.penalty_rules}
          onChange={(e) => update('penalty_rules', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g. R50 late fee, 3 missed payments = suspension"
        />
      </label>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}