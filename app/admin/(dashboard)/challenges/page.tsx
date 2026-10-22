import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ChallengeManager, type AdminChallenge } from '@/components/admin/challenge-manager'
import { PageHeader } from '@/components/admin/page-header'
import { TableSkeleton } from '@/components/skeletons'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Challenge } from '@/lib/types'

export const metadata: Metadata = { title: 'Kelola soal' }

export default function AdminChallengesPage() {
  return (
    <>
      <PageHeader
        title="Soal"
        description="Soal berstatus Draft tidak terlihat peserta walaupun lomba sudah dimulai."
      />
      <Suspense fallback={<TableSkeleton />}>
        <Challenges />
      </Suspense>
    </>
  )
}

async function Challenges() {
  await requireAdmin()
  const db = createAdminClient()
  const [challenges, flags, solves] = await Promise.all([
    db.from('challenges').select('*').order('category').order('points').returns<Challenge[]>(),
    db.from('challenge_flags').select('challenge_id, flag'),
    db.from('solves').select('challenge_id'),
  ])

  const flagById = new Map((flags.data ?? []).map((f) => [f.challenge_id as string, f.flag as string]))
  const solveCount = new Map<string, number>()
  for (const s of solves.data ?? []) {
    solveCount.set(s.challenge_id, (solveCount.get(s.challenge_id) ?? 0) + 1)
  }

  const items: AdminChallenge[] = (challenges.data ?? []).map((c) => ({
    ...c,
    flag: flagById.get(c.id) ?? '',
    solve_count: solveCount.get(c.id) ?? 0,
  }))

  return <ChallengeManager challenges={items} />
}
