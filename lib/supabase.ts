import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '[supabase] Missing env vars. Expected NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local at the project root, ' +
      'then restart `npm run dev`.'
  )
}

export const createClient = () => {
  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing — check .env.local and restart the dev server.'
    )
  }
  return createBrowserClient(url, key)
}