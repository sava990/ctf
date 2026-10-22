'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flag, GraduationCap, LayoutDashboard, ScrollText, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/admin/challenges', label: 'Soal', icon: Flag },
  { href: '/admin/users', label: 'Peserta', icon: Users },
  { href: '/admin/rombels', label: 'Rombel', icon: GraduationCap },
  { href: '/admin/submissions', label: 'Log submit', icon: ScrollText },
] as const

export function AdminNav({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  const pathname = usePathname()
  return (
    <nav className={cn('flex gap-1', orientation === 'vertical' ? 'flex-col' : 'flex-row')}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-surface-muted text-foreground'
                : 'text-muted hover:bg-surface-muted/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
