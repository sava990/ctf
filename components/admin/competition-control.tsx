'use client'

import { useActionState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlay, CircleStop, LoaderCircle, RotateCcw } from 'lucide-react'
import {
  closeCompetition,
  endNow,
  saveRules,
  saveSchedule,
  startNow,
  type ActionState,
} from '@/app/admin/actions'
import type { CompetitionStatus, Settings } from '@/lib/types'
import { formatDateTime, TIME_ZONE, toZonedInput } from '@/lib/utils'
import { Badge, StatusDot } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardHeader } from '../ui/card'
import { Countdown } from '../ui/countdown'
import { Field, Input } from '../ui/field'
import { SubmitButton } from '../ui/submit-button'

const statusMeta: Record<CompetitionStatus, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Belum dirilis', tone: 'warning' },
  running: { label: 'Berlangsung', tone: 'success' },
  ended: { label: 'Selesai', tone: 'danger' },
}

export function CompetitionControl({ settings, status }: { settings: Settings; status: CompetitionStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [scheduleState, scheduleAction] = useActionState<ActionState, FormData>(saveSchedule, {})
  const [rulesState, rulesAction] = useActionState<ActionState, FormData>(saveRules, {})
  const onTick = useCallback(() => router.refresh(), [router])

  const run = (fn: () => Promise<void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    startTransition(() => fn())
  }

  const meta = statusMeta[status]

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader
          title="Kontrol lomba"
          description="Soal hanya terlihat oleh peserta setelah waktu mulai."
          action={
            <Badge tone={meta.tone}>
              <StatusDot tone={meta.tone} pulse={status === 'running'} />
              {meta.label}
            </Badge>
          }
        />
        <div className="space-y-6 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-muted p-3">
              <div className="text-xs text-muted">Mulai</div>
              <div className="mt-0.5 text-sm font-medium">{formatDateTime(settings.start_at)}</div>
              {status === 'pending' && settings.start_at ? (
                <div className="mt-1 text-xs text-muted">
                  dalam <Countdown target={settings.start_at} onDone={onTick} className="font-mono" />
                </div>
              ) : null}
            </div>
            <div className="rounded-lg bg-surface-muted p-3">
              <div className="text-xs text-muted">Selesai</div>
              <div className="mt-0.5 text-sm font-medium">
                {settings.end_at ? formatDateTime(settings.end_at) : 'Tanpa batas'}
              </div>
              {status === 'running' && settings.end_at ? (
                <div className="mt-1 text-xs text-muted">
                  dalam <Countdown target={settings.end_at} onDone={onTick} className="font-mono" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {status !== 'running' ? (
              <Button
                variant="success"
                disabled={pending}
                onClick={() =>
                  run(startNow, 'Rilis semua soal yang terlihat ke peserta sekarang?')
                }
              >
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : <CirclePlay className="size-4" />}
                {status === 'ended' ? 'Buka lagi sekarang' : 'Rilis soal sekarang'}
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => run(endNow, 'Akhiri lomba sekarang? Peserta tidak bisa submit lagi.')}
              >
                <CircleStop className="size-4" />
                Akhiri lomba
              </Button>
            )}
            {status !== 'pending' || settings.start_at ? (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  run(closeCompetition, 'Tutup soal dan hapus jadwal? Poin yang sudah ada tetap tersimpan.')
                }
              >
                <RotateCcw className="size-4" />
                Tutup & reset jadwal
              </Button>
            ) : null}
          </div>

          <form action={scheduleAction} className="space-y-3 border-t border-border pt-5">
            <div className="text-sm font-medium">Jadwalkan otomatis</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Waktu mulai" htmlFor="start_at" hint={TIME_ZONE}>
                <Input
                  id="start_at"
                  name="start_at"
                  type="datetime-local"
                  defaultValue={toZonedInput(settings.start_at)}
                />
              </Field>
              <Field label="Waktu selesai" htmlFor="end_at" hint="Kosongkan jika tanpa batas">
                <Input id="end_at" name="end_at" type="datetime-local" defaultValue={toZonedInput(settings.end_at)} />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton variant="secondary" pendingText="Menyimpan">
                Simpan jadwal
              </SubmitButton>
              <FormMessage state={scheduleState} />
            </div>
          </form>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Aturan" description="Berlaku untuk semua soal." />
        <form action={rulesAction} className="space-y-4 p-5">
          <Field label="Nama event" htmlFor="event_name">
            <Input id="event_name" name="event_name" defaultValue={settings.event_name} required maxLength={80} />
          </Field>
          <Field label="Batas jawaban salah" htmlFor="max_attempts" hint="Sebelum terkena cooldown, per soal.">
            <Input
              id="max_attempts"
              name="max_attempts"
              type="number"
              min={1}
              max={100}
              defaultValue={settings.max_attempts}
              required
            />
          </Field>
          <Field label="Durasi cooldown (menit)" htmlFor="cooldown_minutes">
            <Input
              id="cooldown_minutes"
              name="cooldown_minutes"
              type="number"
              min={1}
              max={1440}
              step="any"
              defaultValue={settings.cooldown_seconds / 60}
              required
            />
          </Field>
          <div className="flex items-center gap-3">
            <SubmitButton variant="secondary" pendingText="Menyimpan">
              Simpan aturan
            </SubmitButton>
            <FormMessage state={rulesState} />
          </div>
        </form>
      </Card>
    </div>
  )
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <span className="text-sm text-danger">{state.error}</span>
  if (state.ok && state.message) return <span className="text-sm text-success">{state.message}</span>
  return null
}
