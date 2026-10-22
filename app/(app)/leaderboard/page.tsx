import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Trophy } from 'lucide-react'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { TableSkeleton } from '@/components/skeletons'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { LeaderboardRow } from '@/lib/types'
import { cn, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Leaderboard' }

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted">
            Peringkat tim berdasarkan total poin. Seri ditentukan oleh waktu solve terakhir tercepat.
          </p>
        </div>
        <span className="hidden items-center gap-2 text-xs text-muted sm:inline-flex">
          <StatusDot tone="success" pulse /> Live
        </span>
      </div>
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <Board />
      </Suspense>
    </div>
  )
}

const podium = ['text-amber-500', 'text-zinc-400', 'text-orange-700 dark:text-orange-400']

async function Board() {
  const profile = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_leaderboard')
  const rows = (data ?? []) as LeaderboardRow[]
  const top = rows[0] ? Number(rows[0].score) : 0

  return (
    <>
      <RealtimeRefresh channel="leaderboard" sources={[{ table: 'solves' }]} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="w-16 px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Tim</th>
                <th className="hidden px-5 py-3 text-right font-medium sm:table-cell">Anggota</th>
                <th className="hidden px-5 py-3 text-right font-medium sm:table-cell">Solve</th>
                <th className="hidden px-5 py-3 text-right font-medium md:table-cell">Terakhir</th>
                <th className="px-5 py-3 text-right font-medium">Poin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const mine = r.rombel_id === profile.rombel_id
                const score = Number(r.score)
                return (
                  <tr
                    key={r.rombel_id}
                    className={cn(
                      'border-b border-border last:border-0',
                      mine ? 'bg-accent-soft/60' : 'hover:bg-surface-muted/50',
                    )}
                  >
                    <td className="px-5 py-3.5">
                      {i < 3 && score > 0 ? (
                        <Trophy className={cn('size-4', podium[i])} aria-label={`Peringkat ${i + 1}`} />
                      ) : (
                        <span className="font-mono text-muted tabular-nums">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.team_name || r.code}</span>
                        {mine ? <Badge tone="accent">Tim Anda</Badge> : null}
                      </div>
                      {r.team_name ? <div className="text-xs text-muted">{r.code}</div> : null}
                      <div className="mt-2 h-1 w-full max-w-48 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={cn('h-full rounded-full', mine ? 'bg-accent' : 'bg-foreground/30')}
                          style={{ width: top > 0 ? `${(score / top) * 100}%` : '0%' }}
                        />
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 text-right text-muted tabular-nums sm:table-cell">
                      {r.member_count}
                    </td>
                    <td className="hidden px-5 py-3.5 text-right text-muted tabular-nums sm:table-cell">
                      {r.solve_count}
                    </td>
                    <td className="hidden px-5 py-3.5 text-right text-muted tabular-nums md:table-cell">
                      {formatTime(r.last_solve_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-base font-semibold tabular-nums">
                      {score}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    Belum ada tim.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
