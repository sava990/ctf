import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { RombelManager, type AdminRombel } from '@/components/admin/rombel-manager'
import { TableSkeleton } from '@/components/skeletons'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LeaderboardRow } from '@/lib/types'

export const metadata: Metadata = { title: 'Rombel' }

export default function AdminRombelsPage() {
  return (
    <>
      <PageHeader title="Rombel" description="Setiap rombel adalah satu tim. Peserta memilih rombel saat mendaftar." />
      <Suspense fallback={<TableSkeleton />}>
        <Rombels />
      </Suspense>
    </>
  )
}

async function Rombels() {
  await requireAdmin()
  const db = createAdminClient()
  const { data } = await db.rpc('get_leaderboard')
  const rombels: AdminRombel[] = ((data ?? []) as LeaderboardRow[])
    .map((r) => ({
      id: r.rombel_id,
      code: r.code,
      team_name: r.team_name,
      member_count: Number(r.member_count),
      score: Number(r.score),
    }))
    .sort((a, b) => a.code.localeCompare(b.code))

  return <RombelManager rombels={rombels} />
}
