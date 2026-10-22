import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CircleCheck } from 'lucide-react'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { PageSkeleton } from '@/components/skeletons'
import { TeamNameForm } from '@/components/team-name-form'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { LeaderboardRow, Rombel, Solve } from '@/lib/types'
import { formatDateTime, initials } from '@/lib/utils'

export const metadata: Metadata = { title: 'Tim' }

export default function TeamPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Team />
    </Suspense>
  )
}

async function Team() {
  const profile = await requireUser()
  if (!profile.rombel_id) {
    return <Alert tone="warning">Akun Anda belum tergabung di rombel mana pun. Hubungi panitia.</Alert>
  }

  const supabase = await createClient()
  const [rombel, members, solves, board] = await Promise.all([
    supabase.from('rombels').select('*').eq('id', profile.rombel_id).single<Rombel>(),
    supabase
      .from('profiles')
      .select('id, name, created_at, role')
      .eq('rombel_id', profile.rombel_id)
      .eq('role', 'user')
      .order('created_at'),
    supabase
      .from('solves')
      .select('*, challenges(title, category)')
      .eq('rombel_id', profile.rombel_id)
      .order('created_at', { ascending: false })
      .returns<(Solve & { challenges: { title: string; category: string } | null })[]>(),
    supabase.rpc('get_leaderboard'),
  ])

  const team = rombel.data!
  const rankIndex = ((board.data ?? []) as LeaderboardRow[]).findIndex((r) => r.rombel_id === team.id)
  const score = (solves.data ?? []).reduce((sum, s) => sum + s.points, 0)
  const solvesByMember = new Map<string, number>()
  for (const s of solves.data ?? []) {
    if (s.user_id) solvesByMember.set(s.user_id, (solvesByMember.get(s.user_id) ?? 0) + 1)
  }
  const memberName = new Map((members.data ?? []).map((m) => [m.id, m.name]))

  return (
    <div className="space-y-6">
      <RealtimeRefresh channel={`team-${team.id}`} sources={[{ table: 'solves', filter: `rombel_id=eq.${team.id}` }]} />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Rombel {team.code}</p>
          <div className="mt-1">
            <TeamNameForm current={team.team_name} code={team.code} />
          </div>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
          <Stat label="Peringkat" value={rankIndex >= 0 ? `#${rankIndex + 1}` : '—'} />
          <Stat label="Poin" value={score} />
          <Stat label="Solve" value={solves.data?.length ?? 0} />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Anggota" description={`${members.data?.length ?? 0} orang`} />
          <ul className="divide-y divide-border">
            {(members.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-muted">
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{m.name}</span>
                    {m.id === profile.id ? <Badge tone="accent">Anda</Badge> : null}
                  </div>
                  <div className="text-xs text-muted">Bergabung {formatDateTime(m.created_at)}</div>
                </div>
                <span className="font-mono text-sm text-muted tabular-nums" title="Jumlah solve">
                  {solvesByMember.get(m.id) ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Soal terselesaikan" description="Berlaku untuk semua anggota tim." />
          {solves.data?.length ? (
            <ul className="divide-y divide-border">
              {solves.data.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <CircleCheck className="size-4 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.challenges?.title ?? 'Soal dihapus'}</div>
                    <div className="text-xs text-muted">
                      {s.challenges?.category} · oleh {(s.user_id && memberName.get(s.user_id)) || '—'} ·{' '}
                      {formatDateTime(s.created_at)}
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums">+{s.points}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-muted">Belum ada soal yang diselesaikan.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
