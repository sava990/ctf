'use client'

import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import { ImageUp, LoaderCircle, X } from 'lucide-react'
import { register, type FormState } from '@/app/(auth)/actions'
import type { Rombel } from '@/lib/types'
import { cn, teamLabel } from '@/lib/utils'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { Field, Input, Select } from './ui/field'
import { PasswordInput } from './password-input'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

export function RegisterForm({ rombels }: { rombels: Pick<Rombel, 'id' | 'code' | 'team_name'>[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {})
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function pick(file: File | undefined) {
    setFileError(null)
    setFileName(file?.name ?? null)
    if (!file) return setPreview(null)
    if (!ACCEPT.includes(file.type)) {
      setFileError('Format harus JPG, PNG, atau WEBP.')
    } else if (file.size > MAX_BYTES) {
      setFileError('Ukuran maksimal 2 MB.')
    }
    setPreview(URL.createObjectURL(file))
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = ''
    pick(undefined)
  }

  const errors = state.fieldErrors ?? {}
  const ktmError = fileError ?? errors.ktm

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (fileError) return
        const formData = new FormData(e.currentTarget)
        startTransition(() => action(formData))
      }}
      className="space-y-4"
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Nama" htmlFor="name" hint="Dipakai untuk login dan tampil di tim." error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="username"
          defaultValue={state.values?.name}
          aria-invalid={!!errors.name}
          maxLength={40}
          required
        />
      </Field>

      <Field label="Rombel" htmlFor="rombel_id" hint="Satu rombel = satu tim." error={errors.rombel_id}>
        <Select
          id="rombel_id"
          name="rombel_id"
          defaultValue={state.values?.rombel_id ?? ''}
          aria-invalid={!!errors.rombel_id}
          required
        >
          <option value="" disabled>
            Pilih rombel…
          </option>
          {rombels.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code}
              {r.team_name ? ` — ${teamLabel(r)}` : ''}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={errors.password} hint="Min. 8 karakter">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            required
          />
        </Field>
        <Field label="Ulangi password" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            required
          />
        </Field>
      </div>

      <Field label="Foto KTM" htmlFor="ktm" error={ktmError ?? undefined} hint="JPG, PNG, atau WEBP · maks. 2 MB">
        <label
          htmlFor="ktm"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files[0]
            if (file && fileRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              fileRef.current.files = dt.files
              pick(file)
            }
          }}
          className={cn(
            'relative flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-3 transition-colors',
            dragging ? 'border-accent bg-accent-soft' : 'border-border-strong hover:bg-surface-muted',
            ktmError && 'border-danger',
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau KTM" className="h-16 w-24 rounded-md object-cover" />
          ) : (
            <span className="grid h-16 w-24 place-items-center rounded-md bg-surface-muted text-muted">
              <ImageUp className="size-5" />
            </span>
          )}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium">{preview ? 'Ganti foto' : 'Pilih atau seret foto KTM'}</span>
            <span className="block truncate text-muted">
              {fileName ?? 'Pastikan nama & foto terlihat jelas'}
            </span>
          </span>
          {preview ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                clearFile()
              }}
              aria-label="Hapus foto"
              className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
          <input
            ref={fileRef}
            id="ktm"
            name="ktm"
            type="file"
            accept={ACCEPT.join(',')}
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? 'Mendaftarkan…' : 'Buat akun'}
      </Button>
    </form>
  )
}
