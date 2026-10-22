import { Suspense } from 'react'
import { Flag, ShieldCheck, Trophy, Users } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Skeleton } from '@/components/skeletons'
import { StatusDot } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Countdown } from '@/components/ui/countdown'
import { getCurrentProfile } from '@/lib/auth'
import { competitionStatus } from '@/lib/competition'
import { createClient } from '@/lib/supabase/server'
import type { Settings } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

const features = [
  { icon: Users, title: 'Main per rombel', text: 'Satu rombel satu tim. Solve dari satu anggota langsung terlihat oleh semua.' },
  { icon: Trophy, title: 'Leaderboard live', text: 'Poin tim diperbarui seketika setiap ada flag yang benar.' },
  { icon: ShieldCheck, title: 'Fair play', text: 'Setiap jawaban tercatat. Terlalu banyak salah berarti cooldown.' },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Suspense fallback={<Skeleton className="h-9 w-32" />}>
          <HeaderActions />
        </Suspense>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-16">
        <Suspense fallback={<Skeleton className="h-6 w-56 rounded-full" />}>
          <EventStatus />
        </Suspense>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Temukan flag. Kumpulkan poin. Bawa rombelmu ke puncak.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
          Platform Capture The Flag untuk kompetisi antar rombel — sederhana, adil, dan real-time.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Suspense fallback={<Skeleton className="h-11 w-64" />}>
            <PrimaryActions />
          </Suspense>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-surface p-5">
              <Icon className="size-5 text-muted" />
              <h2 className="mt-4 font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 py-6 text-xs text-muted">
        <Flag className="mr-1.5 inline size-3" />
        Selamat bertanding dan junjung sportivitas.
      </footer>
    </div>
  )
}

async function HeaderActions() {
  const profile = await getCurrentProfile()
  if (profile) {
    return (
      <ButtonLink href={profile.role === 'admin' ? '/admin' : '/challenges'} variant="secondary" size="sm">
        Dashboard
      </ButtonLink>
    )
  }
  return (
    <ButtonLink href="/login" variant="ghost" size="sm">
      Masuk
    </ButtonLink>
  )
}

async function PrimaryActions() {
  const profile = await getCurrentProfile()
  if (profile) {
    return (
      <ButtonLink href={profile.role === 'admin' ? '/admin' : '/challenges'} size="lg">
        Buka dashboard
      </ButtonLink>
    )
  }
  return (
    <>
      <ButtonLink href="/register" size="lg">
        Daftar sebagai peserta
      </ButtonLink>
      <ButtonLink href="/login" variant="secondary" size="lg">
        Saya sudah punya akun
      </ButtonLink>
    </>
  )
}

async function EventStatus() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle<Settings>()
  if (!settings) return null
  const status = competitionStatus(settings)

  return (
    <div className="inline-flex w-fit flex-wrap items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm">
      <span className="font-medium">{settings.event_name}</span>
      <span className="text-border-strong">|</span>
      {status === 'running' ? (
        <span className="inline-flex items-center gap-2 text-success">
          <StatusDot tone="success" pulse /> Sedang berlangsung
        </span>
      ) : status === 'ended' ? (
        <span className="text-muted">Telah berakhir</span>
      ) : settings.start_at ? (
        <span className="text-muted">
          Mulai {formatDateTime(settings.start_at)} ·{' '}
          <Countdown target={settings.start_at} className="font-mono text-foreground tabular-nums" />
        </span>
      ) : (
        <span className="text-muted">Segera dimulai</span>
      )}
    </div>
  )
}
