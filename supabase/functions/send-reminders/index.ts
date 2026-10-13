// Supabase Edge Function: send-reminders
// Called by pg_cron every 6 hours.
// Authenticates via service_role key in the Authorization header.
// Sends WhatsApp or email reminders for overdue contributions.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// WhatsApp (Meta Cloud API) — optional, leave unset to disable
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const WHATSAPP_TEMPLATE_NAME = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'contribution_reminder'

// Resend (email) — optional
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'reminders@yourdomain.co.za'

type ReminderPayload = {
  contribution_id: string
  stokvel_id: string
  stokvel_name: string
  member_id: string
  member_name: string | null
  member_phone: string | null
  member_email: string | null
  reminder_channel: 'whatsapp' | 'email' | 'sms'
  amount: number
  due_date: string
  period_label: string | null
  status: string
  days_overdue: number
}

type SendResult = {
  success: boolean
  error?: string
  providerMessageId?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify service_role authorization
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token || token !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. Sweep overdue contributions and collect reminders
  const { data: reminders, error: sweepErr } = await supabase
    .rpc('sweep_and_collect_reminders')

  if (sweepErr) {
    console.error('Sweep failed:', sweepErr)
    return new Response(
      JSON.stringify({ error: sweepErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const list = (reminders ?? []) as ReminderPayload[]
  let sent = 0
  let failed = 0

  for (const r of list) {
    let result: SendResult = { success: false }

    if (r.reminder_channel === 'whatsapp') {
      result = await sendWhatsApp(r)
    } else if (r.reminder_channel === 'email') {
      result = await sendEmail(r)
    } else {
      result = { success: false, error: 'sms channel not implemented' }
    }

    // Log the attempt
    await supabase.from('reminder_log').insert({
      stokvel_id: r.stokvel_id,
      contribution_id: r.contribution_id,
      member_id: r.member_id,
      channel: r.reminder_channel,
      success: result.success,
      error_message: result.error ?? null,
      provider_message_id: result.providerMessageId ?? null,
    })

    if (result.success) sent++
    else failed++
  }

  return new Response(
    JSON.stringify({ total: list.length, sent, failed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

// ---------------------------------------------------------------------
// WhatsApp (Meta Cloud API) sender
// Business-initiated messages require a pre-approved template.
// Template placeholders ({{1}}, {{2}}) are configured in WhatsApp Manager.
// ---------------------------------------------------------------------
async function sendWhatsApp(r: ReminderPayload): Promise<SendResult> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: 'WhatsApp not configured' }
  }
  if (!r.member_phone) {
    return { success: false, error: 'No phone number on profile' }
  }

  // Normalize SA phone: 0821234567 -> 27821234567
  const digits = r.member_phone.replace(/\D/g, '')
  const recipient = digits.startsWith('0')
    ? `27${digits.slice(1)}`
    : digits

  const amount = `R${Number(r.amount).toFixed(2)}`
  const period = r.period_label ?? r.due_date

  const body = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: WHATSAPP_TEMPLATE_NAME,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: r.member_name ?? 'Member' },
            { type: 'text', text: r.stokvel_name },
            { type: 'text', text: amount },
            { type: 'text', text: period },
          ],
        },
      ],
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: data?.error?.message ?? `HTTP ${res.status}`,
      }
    }

    return {
      success: true,
      providerMessageId: data?.messages?.[0]?.id,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'WhatsApp send failed',
    }
  }
}

// ---------------------------------------------------------------------
// Email sender (Resend)
// ---------------------------------------------------------------------
async function sendEmail(r: ReminderPayload): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'Resend not configured' }
  }
  if (!r.member_email) {
    return { success: false, error: 'No email on profile' }
  }

  const amount = `R${Number(r.amount).toFixed(2)}`
  const period = r.period_label ?? r.due_date

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px;">
      <h2 style="color: #047857;">Contribution reminder</h2>
      <p>Hi ${r.member_name ?? 'there'},</p>
      <p>This is a friendly reminder that your contribution to
        <strong>${r.stokvel_name}</strong> is still outstanding.</p>
      <ul>
        <li><strong>Amount:</strong> ${amount}</li>
        <li><strong>Period:</strong> ${period}</li>
        <li><strong>Due date:</strong> ${r.due_date}</li>
        <li><strong>Status:</strong> ${r.status} (${r.days_overdue} day${r.days_overdue === 1 ? '' : 's'} overdue)</li>
      </ul>
      <p>Please make payment as soon as possible to keep the group on track.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280;">
        Sent by ${r.stokvel_name}. To stop these reminders, log in to your
        account and update your notification preferences.
      </p>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [r.member_email],
        subject: `Reminder: ${amount} contribution to ${r.stokvel_name} is outstanding`,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: data?.message ?? `HTTP ${res.status}`,
      }
    }

    return { success: true, providerMessageId: data?.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    }
  }
}