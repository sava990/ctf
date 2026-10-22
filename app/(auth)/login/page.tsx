import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/login-form'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Masuk' }

export default function LoginPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Selamat datang kembali</h1>
        <p className="mt-1.5 text-sm text-muted">Masuk dengan nama dan password yang Anda daftarkan.</p>
      </div>
      <Card className="p-6">
        <LoginForm />
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        Belum punya akun?{' '}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </>
  )
}
