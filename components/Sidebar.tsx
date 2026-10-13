'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Home,
  Users,
  Wallet,
  Receipt,
  FileText,
  BarChart3,
  LogOut,
  Layers,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/stokvels', label: 'Stokvels', icon: Layers },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/contributions', label: 'Contributions', icon: Wallet },
  { href: '/dashboard/payouts', label: 'Payouts', icon: Receipt },
  { href: '/dashboard/constitution', label: 'Constitution', icon: FileText },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-emerald-800 text-white flex flex-col p-4 shrink-0">
      <h2 className="text-xl font-bold mb-8 px-2">Stokvel Manager</h2>
      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                active ? 'bg-emerald-700' : 'hover:bg-emerald-700/60'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </Link>
          )
        })}
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-emerald-700 mt-4 text-sm"
      >
        <LogOut size={18} /> Log out
      </button>
    </aside>
  )
}