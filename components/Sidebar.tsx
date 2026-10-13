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
  Bell,
  ScrollText,
  Sparkles,
  X,
} from 'lucide-react'

const baseNav = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/stokvels', label: 'Stokvels', icon: Layers },
  {
    href: '/dashboard/invites',
    label: 'Invites',
    icon: Mail,
    badgeKey: 'invites' as const,
  },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/contributions', label: 'Contributions', icon: Wallet },
  { href: '/dashboard/payouts', label: 'Payouts', icon: Receipt },
  { href: '/dashboard/my-statement', label: 'My statement', icon: ScrollText },
  { href: '/dashboard/reminders', label: 'Reminders', icon: Bell },
  { href: '/dashboard/constitution', label: 'Constitution', icon: FileText },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
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
    <aside className="w-72 lg:w-64 h-screen flex flex-col bg-gradient-to-b from-emerald-800 via-emerald-800 to-emerald-900 text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(52,211,153,0.55) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-10"
        style={{
          background:
            'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-6 pb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 ring-1 ring-white/20 transition-transform group-hover:scale-105">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">
              Stokvel
            </div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-200/80 font-medium">
              Manager
            </div>
          </div>
        </Link>

        {onNavigate && (
          <button
            onClick={onNavigate}
            className="lg:hidden p-1.5 rounded-md hover:bg-white/10 transition"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
        {baseNav.map(({ href, label, icon: Icon, badgeKey }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(href)
          const showBadge = badgeKey === 'invites' && inviteCount > 0

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              data-active={active}
              className="nav-item relative"
            >
              {/* Active indicator bar */}
              <span
                aria-hidden
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-emerald-300 transition-all duration-300 ${
                  active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                }`}
              />

              <Icon size={18} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>

              {showBadge && (
                <span className="relative inline-flex items-center justify-center">
                  <span className="absolute inline-flex h-4 w-4 rounded-full bg-amber-400 opacity-60 animate-ping" />
                  <span className="relative text-[10px] bg-amber-400 text-emerald-900 font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {inviteCount}
                  </span>
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="relative px-3 pb-5 pt-3 border-t border-white/10">
        <button
          onClick={logout}
          className="nav-item w-full text-left"
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}