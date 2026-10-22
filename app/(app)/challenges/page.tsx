import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ChallengeBoard, type BoardChallenge } from '@/components/challenge-board'
import { WaitingRoom } from '@/components/waiting-room'
import { PageSkeleton } from '@/components/skeletons'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { requireUser } from '@/lib/auth'
import { competitionStatus } from '@/lib/competition'
import { createClient } from '@/lib/supabase/server'
import type { AttemptState, Challenge, Settings, Solve } from '@/lib/types'

export const metadata: Metadata = { title: 'Soal' }

export default function ChallengesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Board />
    </Suspense>
  )
}

async function Board() {
  const profile = await requireUser()
  const supabase = await createClient()

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single<Settings>()
  const status = competitionStatus(settings!)

  if (status === 'pending') {
    return (
      <>
        <RealtimeRefresh channel="settings-wait" sources={[{ table: 'settings' }]} />
        <WaitingRoom eventName={settings!.event_name} startAt={settings!.start_at} />
      </>
    )
  }

  const rombelId = profile.rombel_id
  const [challenges, solves, attempts, counts, members] = await Promise.all([
    supabase.from('challenges').select('*').order('points').order('title').returns<Challenge[]>(),
    rombelId
      ? supabase.from('solves').select('*').eq('rombel_id', rombelId).returns<Solve[]>()
      : Promise.resolve({ data: [] as Solve[] }),
    supabase.from('attempt_state').select('*').eq('user_id', profile.id).returns<AttemptState[]>(),
    supabase.rpc('get_challenge_solve_counts'),
    rombelId
      ? supabase.from('profiles').select('id, name').eq('rombel_id', rombelId)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const memberName = new Map((members.data ?? []).map((m) => [m.id, m.name]))
  const solveByChallenge = new Map((solves.data ?? []).map((s) => [s.challenge_id, s]))
  const attemptByChallenge = new Map((attempts.data ?? []).map((a) => [a.challenge_id, a]))
  const countRows = (counts.data ?? []) as { challenge_id: string; solve_count: number }[]
  const countByChallenge = new Map(countRows.map((c) => [c.challenge_id, Number(c.solve_count)]))

  const items: BoardChallenge[] = (challenges.data ?? []).map((c) => {
    const solve = solveByChallenge.get(c.id)
    const attempt = attemptByChallenge.get(c.id)
    return {
      id: c.id,
      title: c.title,
      category: c.category,
      description: c.description,
      hint: c.hint,
      attachmentUrl: c.attachment_url,
      points: c.points,
      solveCount: countByChallenge.get(c.id) ?? 0,
      solved: solve
        ? {
            by: (solve.user_id && memberName.get(solve.user_id)) || 'Anggota tim',
            byMe: solve.user_id === profile.id,
            at: solve.created_at,
          }
        : null,
      failCount: attempt?.fail_count ?? 0,
      lockedUntil: attempt?.locked_until ?? null,
    }
  })

  return (
    <>
      <RealtimeRefresh
        channel={`board-${rombelId}`}
        sources={[
          { table: 'solves', filter: rombelId ? `rombel_id=eq.${rombelId}` : undefined },
          { table: 'settings' },
        ]}
      />
      <ChallengeBoard
        eventName={settings!.event_name}
        status={status}
        endAt={settings!.end_at}
        maxAttempts={settings!.max_attempts}
        cooldownSeconds={settings!.cooldown_seconds}
        challenges={items}
      />
    </>
  )
}
