import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/logo'
import { LoginForm } from '@/components/login-form'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Login Admin' }

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 py-5">
        <Link href="/" aria-label="Beranda">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted">
              <ShieldCheck className="size-3.5" /> Panel panitia
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Masuk sebagai admin</h1>
          </div>
          <Card className="p-6">
            <LoginForm scope="admin" />
          </Card>
        </div>
      </main>
    </div>
  )
}
