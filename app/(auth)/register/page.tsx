import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { RegisterForm } from '@/components/register-form'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Daftar' }

export default function RegisterPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Buat akun peserta</h1>
        <p className="mt-1.5 text-sm text-muted">
          Anggota satu rombel otomatis menjadi satu tim dan berbagi poin.
        </p>
      </div>
      <Card className="p-6">
        <Suspense fallback={<FormSkeleton />}>
          <RegisterFormLoader />
        </Suspense>
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Masuk
        </Link>
      </p>
    </>
  )
}

async function RegisterFormLoader() {
  const supabase = await createClient()
  const { data: rombels } = await supabase
    .from('rombels')
    .select('id, code, team_name')
    .order('code')

  if (!rombels?.length) {
    return <Alert tone="warning">Belum ada rombel yang dibuka. Hubungi panitia.</Alert>
  }
  return <RegisterForm rombels={rombels} />
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ))}
      <div className="h-11 animate-pulse rounded-lg bg-surface-muted" />
    </div>
  )
}
