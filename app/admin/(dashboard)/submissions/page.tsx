import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { SubmissionLog, type LogRow } from '@/components/admin/submission-log'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { TableSkeleton } from '@/components/skeletons'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Log submit' }

const LIMIT = 300

export default function AdminSubmissionsPage() {
  return (
    <>
      <PageHeader
        title="Log submit"
        description={`${LIMIT} percobaan terakhir. Semua jawaban, benar maupun salah, tercatat permanen.`}
      />
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <Log />
      </Suspense>
    </>
  )
}

type Raw = {
  id: number
  submitted: string
  is_correct: boolean
  created_at: string
  profiles: { name: string } | null
  rombels: { code: string } | null
  challenges: { title: string } | null
}

async function Log() {
  await requireAdmin()
  const db = createAdminClient()
  const { data } = await db
    .from('submissions')
    .select('id, submitted, is_correct, created_at, profiles(name), rombels(code), challenges(title)')
    .order('created_at', { ascending: false })
    .limit(LIMIT)
    .returns<Raw[]>()

  const rows: LogRow[] = (data ?? []).map((r) => ({
    id: r.id,
    submitted: r.submitted,
    is_correct: r.is_correct,
    created_at: r.created_at,
    user: r.profiles?.name ?? '—',
    rombel: r.rombels?.code ?? '—',
    challenge: r.challenges?.title ?? '—',
  }))

  return (
    <>
      <RealtimeRefresh channel="admin-submissions" sources={[{ table: 'solves' }]} />
      <SubmissionLog rows={rows} />
    </>
  )
}
