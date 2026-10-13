'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import StokvelForm, { StokvelFormValues } from '@/components/StokvelForm'

export default function NewStokvelPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleCreate(values: StokvelFormValues) {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 1. Create the stokvel
    const { data: created, error: createErr } = await supabase
      .from('stokvels')
      .insert({
        name: values.name,
        description: values.description || null,
        type: values.type,
        contribution_amount: values.contribution_amount,
        frequency: values.frequency,
        bank_name: values.bank_name || null,
        bank_account_masked: values.bank_account_masked || null,
        nasasa_registration: values.nasasa_registration || null,
        penalty_rules: values.penalty_rules || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (createErr || !created) {
      setError(createErr?.message ?? 'Could not create the stokvel.')
      throw new Error(createErr?.message ?? 'Could not create the stokvel.')
    }

    // 2. Bootstrap the creator as admin member
    const { error: bootErr } = await supabase.rpc('bootstrap_stokvel_admin', {
      p_stokvel_id: created.id,
    })

    if (bootErr) {
      setError(bootErr.message)
      throw new Error(bootErr.message)
    }

    router.push(`/dashboard/stokvels/${created.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-1">Create a stokvel</h1>
      <p className="text-sm text-gray-500 mb-6">
        Set the rules. You&apos;ll be added as the first admin.
      </p>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <StokvelForm
        submitLabel="Create Stokvel"
        onSubmit={handleCreate}
        onCancel={() => router.push('/dashboard/stokvels')}
      />
    </div>
  )
}