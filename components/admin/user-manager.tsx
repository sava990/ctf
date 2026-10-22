'use client'

import { useActionState, useState, useTransition } from 'react'
import { AlertTriangle, Ban, ImageOff, RotateCcw, Search, ShieldCheck } from 'lucide-react'
import { banUser, resetCooldown, unbanUser, type ActionState } from '@/app/admin/actions'
import { cn, formatDateTime } from '@/lib/utils'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Dialog } from '../ui/dialog'
import { Field, Input, Textarea } from '../ui/field'
import { SubmitButton } from '../ui/submit-button'

export type AdminUser = {
  id: string
  name: string
  rombel: string | null
  created_at: string
  is_banned: boolean
  ban_reason: string | null
  ktm_url: string | null
  wrong_count: number
  correct_count: number
  lockout_count: number
  last_submit_at: string | null
}

type Filter = 'all' | 'suspicious' | 'banned'

export const isSuspicious = (u: AdminUser) => u.lockout_count > 0 || u.wrong_count >= 20

export function UserManager({ users, rombels }: { users: AdminUser[]; rombels: string[] }) {
  const [query, setQuery] = useState('')
  const [rombel, setRombel] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [ktm, setKtm] = useState<AdminUser | null>(null)
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = {
    all: users.length,
    suspicious: users.filter(isSuspicious).length,
    banned: users.filter((u) => u.is_banned).length,
  }

  const rows = users
    .filter((u) => (filter === 'suspicious' ? isSuspicious(u) : filter === 'banned' ? u.is_banned : true))
    .filter((u) => !rombel || u.rombel === rombel)
    .filter((u) => !query || u.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (filter === 'suspicious' ? b.wrong_count - a.wrong_count : 0))

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'suspicious', label: 'Mencurigakan' },
    { key: 'banned', label: 'Diblokir' },
  ]

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-border bg-surface p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
                filter === t.key ? 'bg-surface-muted font-medium text-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              {t.label}
              <span className="font-mono text-xs text-muted tabular-nums">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={rombel}
            onChange={(e) => setRombel(e.target.value)}
            aria-label="Filter rombel"
            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
          >
            <option value="">Semua rombel</option>
            {rombels.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="relative w-full md:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama…"
              className="h-9 pl-9"
              aria-label="Cari peserta"
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Peserta</th>
                <th className="px-5 py-3 font-medium">KTM</th>
                <th className="px-5 py-3 text-right font-medium" title="Jawaban salah">Salah</th>
                <th className="px-5 py-3 text-right font-medium" title="Berapa kali terkena cooldown">Cooldown</th>
                <th className="px-5 py-3 text-right font-medium">Benar</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-5 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted">
                      {u.rombel ?? 'Tanpa rombel'} · daftar {formatDateTime(u.created_at)}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {u.ktm_url ? (
                      <button
                        type="button"
                        onClick={() => setKtm(u)}
                        className="block overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                        aria-label={`Lihat KTM ${u.name}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.ktm_url} alt="" className="h-9 w-14 object-cover" loading="lazy" />
                      </button>
                    ) : (
                      <span className="grid h-9 w-14 place-items-center rounded-md bg-surface-muted text-muted">
                        <ImageOff className="size-4" />
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      'px-5 py-3 text-right font-mono tabular-nums',
                      u.wrong_count >= 20 ? 'font-semibold text-danger' : 'text-muted',
                    )}
                  >
                    {u.wrong_count}
                  </td>
                  <td
                    className={cn(
                      'px-5 py-3 text-right font-mono tabular-nums',
                      u.lockout_count > 0 ? 'font-semibold text-warning' : 'text-muted',
                    )}
                  >
                    {u.lockout_count}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-muted tabular-nums">{u.correct_count}</td>
                  <td className="px-5 py-3">
                    {u.is_banned ? (
                      <Badge tone="danger" title={u.ban_reason ?? undefined}>
                        Diblokir
                      </Badge>
                    ) : isSuspicious(u) ? (
                      <Badge tone="warning">
                        <AlertTriangle className="size-3" /> Mencurigakan
                      </Badge>
                    ) : (
                      <Badge>Aktif</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      {u.lockout_count > 0 && !u.is_banned ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          title="Hapus cooldown aktif peserta ini"
                          onClick={() => startTransition(() => resetCooldown(u.id))}
                        >
                          <RotateCcw className="size-3.5" />
                          Reset
                        </Button>
                      ) : null}
                      {u.is_banned ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => {
                            if (window.confirm(`Buka blokir ${u.name}?`)) startTransition(() => unbanUser(u.id))
                          }}
                        >
                          <ShieldCheck className="size-3.5" />
                          Buka blokir
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setBanTarget(u)}>
                          <Ban className="size-3.5" />
                          Blokir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-muted">
                    Tidak ada peserta yang cocok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={ktm !== null}
        onClose={() => setKtm(null)}
        title={ktm ? `KTM — ${ktm.name}` : ''}
        description={ktm?.rombel}
        className="max-w-2xl"
      >
        {ktm?.ktm_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ktm.ktm_url} alt={`KTM ${ktm.name}`} className="w-full rounded-lg border border-border" />
        ) : null}
      </Dialog>

      <Dialog
        open={banTarget !== null}
        onClose={() => setBanTarget(null)}
        title={banTarget ? `Blokir ${banTarget.name}?` : ''}
        description="Peserta langsung keluar dan tidak bisa login atau submit flag."
      >
        {banTarget ? <BanForm key={banTarget.id} user={banTarget} onDone={() => setBanTarget(null)} /> : null}
      </Dialog>
    </>
  )
}

function BanForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await banUser(prev, formData)
    if (result.ok) onDone()
    return result
  }, {})

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="user_id" value={user.id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Salah', user.wrong_count],
          ['Cooldown', user.lockout_count],
          ['Benar', user.correct_count],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-muted py-2.5">
            <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>
      <Field label="Alasan" htmlFor="reason" hint="Ditampilkan kepada peserta.">
        <Textarea
          id="reason"
          name="reason"
          rows={2}
          className="min-h-0"
          defaultValue="Terdeteksi percobaan brute force flag."
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Batal
        </Button>
        <SubmitButton variant="danger" pendingText="Memblokir">
          Blokir peserta
        </SubmitButton>
      </div>
    </form>
  )
}
