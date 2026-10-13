'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
  Mail,
} from 'lucide-react'

const baseNav = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/stokvels', label: 'Stokvels', icon: Layers },
  { href: '/dashboard/invites', label: 'Invites', icon: Mail, badgeKey: 'invites' as const },
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
  const [inviteCount, setInviteCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      const { data, error } = await supabase.rpc('get_my_pending_invites')
      if (cancelled || error) return
      setInviteCount(Array.isArray(data) ? data.length : 0)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [supabase])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-emerald-800 text-white flex flex-col p-4 shrink-0">
      <h2 className="text-xl font-bold mb-8 px-2">Stokvel Manager</h2>
      <nav className="flex-1 space-y-1">
        {baseNav.map(({ href, label, icon: Icon, badgeKey }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(href)
          const showBadge =
            badgeKey === 'invites' && inviteCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                active ? 'bg-emerald-700' : 'hover:bg-emerald-700/60'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm flex-1">{label}</span>
              {showBadge && (
                <span className="text-[10px] bg-amber-400 text-emerald-900 font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {inviteCount}
                </span>
              )}
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