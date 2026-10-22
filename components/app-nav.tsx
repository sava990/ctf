'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flag, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/challenges', label: 'Soal', icon: Flag },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/team', label: 'Tim', icon: Users },
] as const

export function AppNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
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
