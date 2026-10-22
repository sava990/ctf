'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { addRombels, deleteRombel, updateRombel, type ActionState } from '@/app/admin/actions'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card, CardHeader } from '../ui/card'
import { Dialog } from '../ui/dialog'
import { Field, Input, Textarea } from '../ui/field'
import { SubmitButton } from '../ui/submit-button'
import { FormMessage } from './competition-control'

export type AdminRombel = {
  id: string
  code: string
  team_name: string | null
  member_count: number
  score: number
}

export function RombelManager({ rombels }: { rombels: AdminRombel[] }) {
  const [editing, setEditing] = useState<AdminRombel | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [addState, addAction] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await addRombels(prev, formData)
    if (result.ok) formRef.current?.reset()
    return result
  }, {})

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader title="Tambah rombel" description="Satu kode per baris, atau pisahkan dengan koma." />
        <form ref={formRef} action={addAction} className="space-y-3 p-5">
          <Textarea name="codes" rows={5} placeholder={'TI-1A\nTI-1B\nSI-1A'} className="font-mono" />
          <div className="flex items-center gap-3">
            <SubmitButton pendingText="Menyimpan">Tambah</SubmitButton>
            <FormMessage state={addState} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Rombel</th>
                <th className="px-5 py-3 font-medium">Nama tim</th>
                <th className="px-5 py-3 text-right font-medium">Anggota</th>
                <th className="px-5 py-3 text-right font-medium">Poin</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rombels.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                  <td className="px-5 py-3 font-mono font-medium">{r.code}</td>
                  <td className="px-5 py-3 text-muted">{r.team_name ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{r.member_count}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{r.score}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
                        aria-label={`Ubah ${r.code}`}
                        title="Ubah"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const warn = r.member_count
                            ? `Rombel ${r.code} punya ${r.member_count} anggota. Menghapusnya juga menghapus seluruh solve tim ini. Lanjutkan?`
                            : `Hapus rombel ${r.code}?`
                          if (window.confirm(warn)) startTransition(() => deleteRombel(r.id))
                        }}
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-danger disabled:opacity-50"
                        aria-label={`Hapus ${r.code}`}
                        title="Hapus"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rombels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-muted">
                    Belum ada rombel. Peserta tidak bisa mendaftar sebelum rombel dibuat.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={`Ubah rombel ${editing?.code ?? ''}`}>
        {editing ? <EditForm key={editing.id} rombel={editing} onDone={() => setEditing(null)} /> : null}
      </Dialog>
    </div>
  )
}

function EditForm({ rombel, onDone }: { rombel: AdminRombel; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await updateRombel(prev, formData)
    if (result.ok) onDone()
    return result
  }, {})

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={rombel.id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Kode rombel" htmlFor="code">
        <Input id="code" name="code" defaultValue={rombel.code} required maxLength={32} className="font-mono" />
      </Field>
      <Field label="Nama tim" htmlFor="team_name" hint="Kosongkan untuk memakai kode rombel.">
        <Input id="team_name" name="team_name" defaultValue={rombel.team_name ?? ''} maxLength={40} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Batal
        </Button>
        <SubmitButton pendingText="Menyimpan">Simpan</SubmitButton>
      </div>
    </form>
  )
}
