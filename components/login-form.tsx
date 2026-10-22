'use client'

import { startTransition, useActionState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { login, type FormState } from '@/app/(auth)/actions'
import { Alert } from './ui/alert'
import { Field, Input } from './ui/field'
import { Button } from './ui/button'
import { PasswordInput } from './password-input'

export function LoginForm({ scope = 'user' }: { scope?: 'user' | 'admin' }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {})

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        startTransition(() => action(formData))
      }}
      className="space-y-4"
    >
      <input type="hidden" name="scope" value={scope} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Nama" htmlFor="name">
        <Input
          id="name"
          name="name"
          autoComplete="username"
          defaultValue={state.values?.name}
          required
          autoFocus
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? 'Memeriksa…' : 'Masuk'}
      </Button>
    </form>
  )
}
