'use client'

import { useActionState, useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateTeamName, type TeamNameState } from '@/app/(app)/actions'
import { Button } from './ui/button'
import { Input } from './ui/field'
import { SubmitButton } from './ui/submit-button'

export function TeamNameForm({ current, code }: { current: string | null; code: string }) {
  const [editing, setEditing] = useState(false)
  const [state, action] = useActionState<TeamNameState, FormData>(async (prev, formData) => {
    const result = await updateTeamName(prev, formData)
    if (result.ok) setEditing(false)
    return result
  }, {})

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{current || code}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Ubah nama tim"
          title="Ubah nama tim"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-1.5">
      <div className="flex max-w-md gap-2">
        <Input
          name="team_name"
          defaultValue={current ?? ''}
          placeholder={`Nama tim (default: ${code})`}
          maxLength={40}
          autoFocus
        />
        <SubmitButton pendingText="Menyimpan">Simpan</SubmitButton>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Batal
        </Button>
      </div>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <p className="text-xs text-muted">Kosongkan untuk memakai kode rombel. Terlihat oleh semua peserta.</p>
    </form>
  )
}
