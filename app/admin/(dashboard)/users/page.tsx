import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { UserManager, type AdminUser } from '@/components/admin/user-manager'
import { TableSkeleton } from '@/components/skeletons'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/types'

export const metadata: Metadata = { title: 'Peserta' }

export default function AdminUsersPage() {
  return (
    <>
      <PageHeader
        title="Peserta"
        description="Data diri, foto KTM, dan riwayat percobaan. Tandai Mencurigakan = pernah kena cooldown atau ≥ 20 jawaban salah."
      />
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <Users />
      </Suspense>
    </>
  )
}

type Stats = {
  user_id: string
  wrong_count: number
  correct_count: number
  lockout_count: number
  last_submit_at: string | null
}

async function Users() {
  await requireAdmin()
  const db = createAdminClient()
  const [profiles, stats] = await Promise.all([
    db
      .from('profiles')
      .select('*, rombels(code)')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .returns<(Profile & { rombels: { code: string } | null })[]>(),
    db.rpc('admin_user_stats'),
  ])

  const paths = (profiles.data ?? []).map((p) => p.ktm_path).filter((p): p is string => !!p)
  const { data: signed } = paths.length
    ? await db.storage.from('ktm').createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  const statsById = new Map(((stats.data ?? []) as Stats[]).map((s) => [s.user_id, s]))

  const users: AdminUser[] = (profiles.data ?? []).map((p) => {
    const s = statsById.get(p.id)
    return {
      id: p.id,
      name: p.name,
      rombel: p.rombels?.code ?? null,
      created_at: p.created_at,
      is_banned: p.is_banned,
      ban_reason: p.ban_reason,
      ktm_url: (p.ktm_path && urlByPath.get(p.ktm_path)) || null,
      wrong_count: Number(s?.wrong_count ?? 0),
      correct_count: Number(s?.correct_count ?? 0),
      lockout_count: Number(s?.lockout_count ?? 0),
      last_submit_at: s?.last_submit_at ?? null,
    }
  })

  const rombels = Array.from(new Set(users.map((u) => u.rombel).filter((r): r is string => !!r))).sort()

  return <UserManager users={users} rombels={rombels} />
}
