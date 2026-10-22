import Link from 'next/link'
import { Suspense } from 'react'
import { ShieldAlert } from 'lucide-react'
import { AppNav } from '@/components/app-nav'
import { Logo } from '@/components/logo'
import { PageSkeleton, Skeleton } from '@/components/skeletons'
import { UserMenu } from '@/components/user-menu'
import { Card } from '@/components/ui/card'
import { logout } from '@/app/(auth)/actions'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { teamLabel } from '@/lib/utils'

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-6">
            <Link href="/challenges" aria-label="Beranda">
              <Logo />
            </Link>
            <div className="hidden md:block">
              <AppNav />
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-8 w-40" />}>
            <CurrentUser />
          </Suspense>
        </div>
        <div className="overflow-x-auto border-t border-border px-3 py-1.5 md:hidden">
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Suspense fallback={<PageSkeleton />}>
          <Gate>{children}</Gate>
        </Suspense>
      </main>
    </div>
  )
}

async function CurrentUser() {
  const profile = await requireUser()
  const supabase = await createClient()
  const { data: rombel } = profile.rombel_id
    ? await supabase.from('rombels').select('code, team_name').eq('id', profile.rombel_id).maybeSingle()
    : { data: null }
  return <UserMenu name={profile.name} subtitle={rombel ? teamLabel(rombel) : undefined} />
}

async function Gate({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()
  if (profile.is_banned) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Akun Anda diblokir</h1>
        <p className="mt-2 text-sm text-muted">
          {profile.ban_reason || 'Terdeteksi aktivitas yang melanggar aturan lomba.'} Hubungi panitia
          jika menurut Anda ini keliru.
        </p>
        <form action={logout} className="mt-6">
          <button type="submit" className="text-sm font-medium underline underline-offset-4">
            Keluar
          </button>
        </form>
      </Card>
    )
  }
  return children
}
