import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CircleCheck } from 'lucide-react'
import { CompetitionControl } from '@/components/admin/competition-control'
import { PageHeader } from '@/components/admin/page-header'
import { PageSkeleton } from '@/components/skeletons'
import { Card, CardHeader } from '@/components/ui/card'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { requireAdmin } from '@/lib/auth'
import { competitionStatus } from '@/lib/competition'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Settings } from '@/lib/types'
import { formatTime, teamLabel } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin' }

export default function AdminHome() {
  return (
    <>
      <PageHeader title="Ringkasan" description="Kendalikan jalannya lomba dan pantau aktivitas peserta." />
      <Suspense fallback={<PageSkeleton />}>
        <Overview />
      </Suspense>
    </>
  )
}

async function Overview() {
  await requireAdmin()
  const db = createAdminClient()
  const head = { count: 'exact', head: true } as const

  const [settings, users, banned, teams, challenges, visible, solves, wrong, recent] = await Promise.all([
    db.from('settings').select('*').eq('id', 1).single<Settings>(),
    db.from('profiles').select('*', head).eq('role', 'user'),
    db.from('profiles').select('*', head).eq('is_banned', true),
    db.from('rombels').select('*', head),
    db.from('challenges').select('*', head),
    db.from('challenges').select('*', head).eq('is_visible', true),
    db.from('solves').select('*', head),
    db.from('submissions').select('*', head).eq('is_correct', false),
    db
      .from('solves')
      .select('id, points, created_at, challenges(title), rombels(code, team_name), profiles(name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const status = competitionStatus(settings.data!)
  const stats = [
    { label: 'Peserta', value: users.count ?? 0, sub: banned.count ? `${banned.count} diblokir` : undefined },
    { label: 'Tim (rombel)', value: teams.count ?? 0 },
    { label: 'Soal terlihat', value: `${visible.count ?? 0}/${challenges.count ?? 0}` },
    { label: 'Total solve', value: solves.count ?? 0 },
    { label: 'Jawaban salah', value: wrong.count ?? 0 },
  ]

  type Recent = {
    id: string
    points: number
    created_at: string
    challenges: { title: string } | null
    rombels: { code: string; team_name: string | null } | null
    profiles: { name: string } | null
  }

  return (
    <div className="space-y-6">
      <RealtimeRefresh channel="admin-overview" sources={[{ table: 'solves' }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{s.value}</div>
            {s.sub ? <div className="mt-0.5 text-xs text-danger">{s.sub}</div> : null}
          </Card>
        ))}
      </div>

      <CompetitionControl settings={settings.data!} status={status} />

      <Card>
        <CardHeader title="Solve terbaru" description="Diperbarui secara langsung." />
        {(recent.data as unknown as Recent[] | null)?.length ? (
          <ul className="divide-y divide-border">
            {(recent.data as unknown as Recent[]).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <CircleCheck className="size-4 shrink-0 text-success" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{s.rombels ? teamLabel(s.rombels) : '—'}</span>
                  <span className="text-muted"> menyelesaikan </span>
                  <span className="font-medium">{s.challenges?.title}</span>
                  <span className="text-muted"> · {s.profiles?.name}</span>
                </div>
                <span className="font-mono text-xs text-muted tabular-nums">{formatTime(s.created_at)}</span>
                <span className="w-12 text-right font-mono font-semibold tabular-nums">+{s.points}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">Belum ada solve.</p>
        )}
      </Card>
    </div>
  )
}
