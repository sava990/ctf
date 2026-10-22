'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Hourglass } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { BigCountdown } from './ui/countdown'
import { StatusDot } from './ui/badge'

export function WaitingRoom({ eventName, startAt }: { eventName: string; startAt: string | null }) {
  const router = useRouter()
  const onDone = useCallback(() => router.refresh(), [router])

  return (
    <div className="mx-auto max-w-xl py-10 text-center sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-surface text-muted">
        <Hourglass className="size-5" />
      </span>
      <p className="mt-6 text-sm font-medium text-muted">{eventName}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Soal belum dirilis</h1>

      {startAt ? (
        <>
          <p className="mt-3 text-sm text-muted">
            Lomba dimulai pada <span className="font-medium text-foreground">{formatDateTime(startAt)}</span>
          </p>
          <div className="mt-8">
            <BigCountdown target={startAt} onDone={onDone} />
          </div>
        </>
      ) : (
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          Panitia belum menjadwalkan waktu mulai. Halaman ini akan terbuka otomatis saat soal dirilis.
        </p>
      )}

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
        <StatusDot tone="success" pulse />
        Terhubung — tidak perlu memuat ulang halaman
      </div>
    </div>
  )
}
