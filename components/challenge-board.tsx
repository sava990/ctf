'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CircleCheck,
  Lightbulb,
  LoaderCircle,
  Lock,
  Paperclip,
  PartyPopper,
  Search,
  Timer,
} from 'lucide-react'
import { submitFlag } from '@/app/(app)/actions'
import type { CompetitionStatus, SubmitResult } from '@/lib/types'
import { cn, formatDateTime } from '@/lib/utils'
import { Alert } from './ui/alert'
import { Badge, StatusDot } from './ui/badge'
import { Button } from './ui/button'
import { Countdown, formatRemaining, useRemaining } from './ui/countdown'
import { Dialog } from './ui/dialog'
import { Input } from './ui/field'
import { RichText } from './rich-text'

export type BoardChallenge = {
  id: string
  title: string
  category: string
  description: string
  hint: string | null
  attachmentUrl: string | null
  points: number
  solveCount: number
  solved: { by: string; byMe: boolean; at: string } | null
  failCount: number
  lockedUntil: string | null
}

type Props = {
  eventName: string
  status: CompetitionStatus
  endAt: string | null
  maxAttempts: number
  cooldownSeconds: number
  challenges: BoardChallenge[]
}

export function ChallengeBoard({ eventName, status, endAt, maxAttempts, cooldownSeconds, challenges }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState<string>('all')
  const [hideSolved, setHideSolved] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(challenges.map((c) => c.category))).sort(),
    [challenges],
  )

  const solvedCount = challenges.filter((c) => c.solved).length
  const teamScore = challenges.reduce((sum, c) => sum + (c.solved ? c.points : 0), 0)

  const visible = challenges.filter(
    (c) =>
      (category === 'all' || c.category === category) &&
      (!hideSolved || !c.solved) &&
      (!query || c.title.toLowerCase().includes(query.toLowerCase())),
  )

  const grouped = categories
    .map((cat) => ({ cat, items: visible.filter((c) => c.category === cat) }))
    .filter((g) => g.items.length > 0)

  const open = challenges.find((c) => c.id === openId) ?? null
  const onEnded = useCallback(() => router.refresh(), [router])

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            {status === 'running' ? (
              <>
                <StatusDot tone="success" pulse />
                <span>Berlangsung</span>
                {endAt ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      berakhir dalam{' '}
                      <Countdown target={endAt} onDone={onEnded} className="font-mono tabular-nums text-foreground" />
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <StatusDot tone="danger" />
                <span>Lomba telah berakhir</span>
              </>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">{eventName}</h1>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
          <div className="px-5 py-3">
            <dt className="text-xs text-muted">Skor tim</dt>
            <dd className="font-mono text-xl font-semibold tabular-nums">{teamScore}</dd>
          </div>
          <div className="px-5 py-3">
            <dt className="text-xs text-muted">Terselesaikan</dt>
            <dd className="font-mono text-xl font-semibold tabular-nums">
              {solvedCount}
              <span className="text-muted">/{challenges.length}</span>
            </dd>
          </div>
        </dl>
      </section>

      {status === 'ended' ? (
        <Alert tone="warning">Waktu lomba sudah habis. Soal masih bisa dilihat, tetapi flag tidak dapat dikirim lagi.</Alert>
      ) : null}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:pb-0">
          {['all', ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-sm transition-colors',
                category === cat
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:text-foreground',
              )}
            >
              {cat === 'all' ? 'Semua' : cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted select-none">
            <input
              type="checkbox"
              checked={hideSolved}
              onChange={(e) => setHideSolved(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Sembunyikan selesai
          </label>
          <div className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari soal…"
              className="h-9 pl-9"
              aria-label="Cari soal"
            />
          </div>
        </div>
      </section>

      {challenges.length === 0 ? (
        <EmptyState text="Belum ada soal yang dipublikasikan." />
      ) : grouped.length === 0 ? (
        <EmptyState text="Tidak ada soal yang cocok dengan filter." />
      ) : (
        grouped.map(({ cat, items }) => (
          <section key={cat} className="space-y-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
              {cat}
              <span className="font-normal normal-case tracking-normal">
                {items.filter((c) => c.solved).length}/{items.length}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <ChallengeCard key={c.id} challenge={c} onOpen={() => setOpenId(c.id)} />
              ))}
            </div>
          </section>
        ))
      )}

      <Dialog
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.title}
        description={
          open ? (
            <span className="flex items-center gap-2">
              <Badge>{open.category}</Badge>
              <span className="font-mono">{open.points} poin</span>
              <span aria-hidden>·</span>
              <span>{open.solveCount} tim berhasil</span>
            </span>
          ) : null
        }
      >
        {open ? (
          <ChallengeDetail
            key={open.id}
            challenge={open}
            status={status}
            maxAttempts={maxAttempts}
            cooldownSeconds={cooldownSeconds}
          />
        ) : null}
      </Dialog>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong py-16 text-center text-sm text-muted">
      {text}
    </div>
  )
}

function ChallengeCard({ challenge: c, onOpen }: { challenge: BoardChallenge; onOpen: () => void }) {
  const remaining = useRemaining(c.lockedUntil)
  const locked = !c.solved && remaining !== null && remaining > 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex min-h-32 flex-col rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
        c.solved
          ? 'border-success/30 bg-success-soft/60 hover:border-success/50'
          : 'border-border bg-surface hover:border-border-strong',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-muted">{c.category}</span>
        <span
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            c.solved ? 'text-success' : 'text-foreground',
          )}
        >
          {c.points}
        </span>
      </div>
      <h3 className="mt-1.5 line-clamp-2 font-medium">{c.title}</h3>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
        {c.solved ? (
          <span className="flex min-w-0 items-center gap-1.5 text-success">
            <CircleCheck className="size-3.5 shrink-0" />
            <span className="truncate">
              {c.solved.byMe ? 'Diselesaikan oleh Anda' : `Diselesaikan oleh ${c.solved.by}`}
            </span>
          </span>
        ) : locked ? (
          <span className="flex items-center gap-1.5 text-warning">
            <Timer className="size-3.5" />
            Cooldown {formatRemaining(remaining ?? 0)}
          </span>
        ) : (
          <span className="text-muted">{c.solveCount} tim berhasil</span>
        )}
        <span className="text-muted opacity-0 transition-opacity group-hover:opacity-100">Buka →</span>
      </div>
    </button>
  )
}

type Feedback =
  | { tone: 'success'; text: string }
  | { tone: 'danger'; text: string }
  | { tone: 'warning'; text: string }
  | null

function ChallengeDetail({
  challenge: c,
  status,
  maxAttempts,
  cooldownSeconds,
}: {
  challenge: BoardChallenge
  status: CompetitionStatus
  maxAttempts: number
  cooldownSeconds: number
}) {
  const [flag, setFlag] = useState('')
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(c.lockedUntil)
  const [remainingTries, setRemainingTries] = useState(maxAttempts - c.failCount)

  const onUnlock = useCallback(() => {
    setRemainingTries(maxAttempts)
    setFeedback(null)
  }, [maxAttempts])
  const lockRemaining = useRemaining(lockedUntil, onUnlock)
  const locked = lockRemaining !== null && lockRemaining > 0

  function handle(result: SubmitResult) {
    switch (result.status) {
      case 'correct':
        setFeedback({ tone: 'success', text: `Benar! Tim Anda mendapat ${result.points} poin.` })
        setFlag('')
        break
      case 'incorrect':
        setRemainingTries(result.remaining)
        setFeedback({ tone: 'danger', text: 'Flag salah.' })
        setShakeKey((k) => k + 1)
        break
      case 'locked':
        setLockedUntil(result.locked_until)
        setFeedback(null)
        setShakeKey((k) => k + 1)
        break
      case 'already_solved':
        setFeedback({ tone: 'success', text: 'Soal ini sudah diselesaikan oleh tim Anda.' })
        break
      case 'not_started':
        setFeedback({ tone: 'warning', text: 'Lomba belum dimulai.' })
        break
      case 'ended':
        setFeedback({ tone: 'warning', text: 'Waktu lomba sudah habis.' })
        break
      case 'banned':
        setFeedback({ tone: 'danger', text: 'Akun Anda diblokir.' })
        break
      case 'no_team':
        setFeedback({ tone: 'warning', text: 'Akun Anda belum terdaftar di rombel mana pun.' })
        break
      case 'invalid':
        setFeedback({ tone: 'warning', text: 'Flag tidak boleh kosong (maks. 256 karakter).' })
        break
      default:
        setFeedback({ tone: 'danger', text: 'Terjadi kesalahan. Coba lagi.' })
    }
  }

  return (
    <div className="space-y-5">
      <RichText text={c.description || 'Tidak ada deskripsi.'} />

      {c.attachmentUrl ? (
        <a
          href={c.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
        >
          <Paperclip className="size-4 text-muted" />
          Lampiran
        </a>
      ) : null}

      {c.hint ? (
        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium select-none">
            <Lightbulb className="size-4 text-warning" />
            Lihat hint
            <span className="ml-auto text-xs text-muted group-open:hidden">Klik untuk membuka</span>
          </summary>
          <div className="border-t border-border px-3 py-3 text-muted">
            <RichText text={c.hint} />
          </div>
        </details>
      ) : null}

      <div className="border-t border-border pt-5">
        {c.solved ? (
          <div className="flex items-start gap-3 rounded-lg bg-success-soft p-3 text-success">
            {feedback?.tone === 'success' ? (
              <PartyPopper className="mt-0.5 size-5 shrink-0" />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0" />
            )}
            <div className="text-sm">
              <p className="font-medium">
                {feedback?.tone === 'success' ? feedback.text : 'Soal ini sudah diselesaikan tim Anda.'}
              </p>
              <p className="mt-0.5 opacity-80">
                oleh {c.solved.byMe ? 'Anda' : c.solved.by} · {formatDateTime(c.solved.at)}
              </p>
            </div>
          </div>
        ) : status === 'ended' ? (
          <Alert tone="warning">Pengiriman flag sudah ditutup.</Alert>
        ) : locked ? (
          <div className="flex items-start gap-3 rounded-lg bg-warning-soft p-3 text-warning">
            <Lock className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Terlalu banyak jawaban salah</p>
              <p className="mt-0.5 opacity-90">
                Coba lagi dalam{' '}
                <span className="font-mono font-semibold tabular-nums">{formatRemaining(lockRemaining ?? 0)}</span>
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!flag.trim()) return
              startTransition(async () => handle(await submitFlag(c.id, flag)))
            }}
            className="space-y-3"
          >
            <label htmlFor="flag" className="block text-sm font-medium">
              Jawaban
            </label>
            <div key={shakeKey} className={cn('flex gap-2', shakeKey > 0 && 'animate-shake')}>
              <Input
                id="flag"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="CTF{...}"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                maxLength={256}
                aria-invalid={feedback?.tone === 'danger'}
                className="font-mono"
              />
              <Button type="submit" disabled={pending || !flag.trim()} className="w-24 shrink-0">
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : 'Kirim'}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              {feedback ? (
                <span
                  className={cn(
                    feedback.tone === 'success' && 'text-success',
                    feedback.tone === 'danger' && 'text-danger',
                    feedback.tone === 'warning' && 'text-warning',
                  )}
                >
                  {feedback.text}
                </span>
              ) : (
                <span className="text-muted">Setiap jawaban salah dicatat.</span>
              )}
              <span className={cn('shrink-0 tabular-nums', remainingTries <= 2 ? 'text-warning' : 'text-muted')}>
                Sisa {remainingTries}/{maxAttempts} percobaan
              </span>
            </div>
            {remainingTries <= 2 ? (
              <p className="text-xs text-muted">
                Jika habis, form akan terkunci selama {Math.round(cooldownSeconds / 60)} menit.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  )
}
