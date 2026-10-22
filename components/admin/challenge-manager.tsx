'use client'

import { useActionState, useState, useTransition } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteChallenge, saveChallenge, setChallengeVisibility, type ActionState } from '@/app/admin/actions'
import type { Challenge } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Dialog } from '../ui/dialog'
import { Field, Input, Textarea } from '../ui/field'
import { SubmitButton } from '../ui/submit-button'

export type AdminChallenge = Challenge & { flag: string; solve_count: number }

export function ChallengeManager({ challenges }: { challenges: AdminChallenge[] }) {
  const [editing, setEditing] = useState<AdminChallenge | 'new' | null>(null)
  const [pending, startTransition] = useTransition()
  const categories = Array.from(new Set(challenges.map((c) => c.category))).sort()

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> Tambah soal
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Soal</th>
                <th className="px-5 py-3 font-medium">Flag</th>
                <th className="px-5 py-3 text-right font-medium">Poin</th>
                <th className="px-5 py-3 text-right font-medium">Solve</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {challenges.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-5 py-3">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted">{c.category}</div>
                  </td>
                  <td className="max-w-56 px-5 py-3">
                    <code className="block truncate font-mono text-xs text-muted" title={c.flag}>
                      {c.flag || '—'}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{c.points}</td>
                  <td className="px-5 py-3 text-right font-mono text-muted tabular-nums">{c.solve_count}</td>
                  <td className="px-5 py-3">
                    {c.is_visible ? <Badge tone="success">Terlihat</Badge> : <Badge>Draft</Badge>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={c.is_visible ? 'Jadikan draft' : 'Tampilkan'}
                        disabled={pending}
                        onClick={() => startTransition(() => setChallengeVisibility(c.id, !c.is_visible))}
                      >
                        {c.is_visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </IconButton>
                      <IconButton label="Ubah" onClick={() => setEditing(c)}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Hapus"
                        danger
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm(`Hapus soal "${c.title}"? Solve terkait juga akan terhapus.`)) {
                            startTransition(() => deleteChallenge(c.id))
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {challenges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-muted">
                    Belum ada soal. Klik “Tambah soal” untuk memulai.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Tambah soal' : 'Ubah soal'}
        className="max-w-2xl"
      >
        {editing ? (
          <ChallengeForm
            key={editing === 'new' ? 'new' : editing.id}
            challenge={editing === 'new' ? null : editing}
            categories={categories}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
    </>
  )
}

function IconButton({
  label,
  danger,
  ...props
}: React.ComponentProps<'button'> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted disabled:opacity-50',
        danger ? 'hover:text-danger' : 'hover:text-foreground',
      )}
      {...props}
    />
  )
}

function ChallengeForm({
  challenge,
  categories,
  onDone,
}: {
  challenge: AdminChallenge | null
  categories: string[]
  onDone: () => void
}) {
  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await saveChallenge(prev, formData)
    if (result.ok) onDone()
    return result
  }, {})

  return (
    <form action={action} className="space-y-4">
      {challenge ? <input type="hidden" name="id" value={challenge.id} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Judul" htmlFor="title" className="sm:col-span-2">
          <Input id="title" name="title" defaultValue={challenge?.title} required maxLength={80} autoFocus />
        </Field>
        <Field label="Poin" htmlFor="points">
          <Input
            id="points"
            name="points"
            type="number"
            min={1}
            max={10000}
            defaultValue={challenge?.points ?? 100}
            required
          />
        </Field>
      </div>

      <Field label="Kategori" htmlFor="category" hint="Contoh: Web, Crypto, Forensic, Reverse, Pwn, Misc">
        <Input
          id="category"
          name="category"
          list="category-options"
          defaultValue={challenge?.category ?? ''}
          placeholder="Misc"
        />
        <datalist id="category-options">
          {['Web', 'Crypto', 'Forensic', 'Reverse', 'Pwn', 'OSINT', 'Misc', ...categories]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((c) => (
              <option key={c} value={c} />
            ))}
        </datalist>
      </Field>

      <Field label="Deskripsi" htmlFor="description" hint="Gunakan `backtick` untuk kode. URL otomatis jadi tautan.">
        <Textarea id="description" name="description" defaultValue={challenge?.description} rows={6} />
      </Field>

      <Field label="Hint" htmlFor="hint" hint="Opsional. Peserta bisa membukanya kapan saja.">
        <Textarea id="hint" name="hint" defaultValue={challenge?.hint ?? ''} rows={2} className="min-h-0" />
      </Field>

      <Field label="URL lampiran" htmlFor="attachment_url" hint="Opsional. Link file soal (Drive, GitHub, dsb).">
        <Input
          id="attachment_url"
          name="attachment_url"
          type="url"
          defaultValue={challenge?.attachment_url ?? ''}
          placeholder="https://"
        />
      </Field>

      <Field label="Flag" htmlFor="flag" hint="Dicocokkan persis (case-sensitive), spasi di awal/akhir diabaikan.">
        <Input
          id="flag"
          name="flag"
          defaultValue={challenge?.flag}
          required
          className="font-mono"
          placeholder="CTF{...}"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="is_visible"
          defaultChecked={challenge?.is_visible ?? true}
          className="size-4 accent-[var(--primary)]"
        />
        Tampilkan ke peserta saat lomba berjalan
      </label>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onDone}>
          Batal
        </Button>
        <SubmitButton pendingText="Menyimpan">{challenge ? 'Simpan perubahan' : 'Tambah soal'}</SubmitButton>
      </div>
    </form>
  )
}
