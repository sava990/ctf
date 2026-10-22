import Link from 'next/link'
import { Suspense } from 'react'
import { AdminNav } from '@/components/admin/admin-nav'
import { Logo } from '@/components/logo'
import { PageSkeleton, Skeleton } from '@/components/skeletons'
import { UserMenu } from '@/components/user-menu'
import { requireAdmin } from '@/lib/auth'

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-5">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-medium text-muted">
              Admin
            </span>
          </Link>
          <Suspense fallback={<Skeleton className="h-8 w-32" />}>
            <CurrentAdmin />
          </Suspense>
        </div>
        <div className="overflow-x-auto border-t border-border px-3 py-1.5 lg:hidden">
          <AdminNav orientation="horizontal" />
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border p-3 lg:block">
          <div className="sticky top-17">
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<PageSkeleton />}>
              <Gate>{children}</Gate>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

async function CurrentAdmin() {
  const profile = await requireAdmin()
  return <UserMenu name={profile.name} subtitle="Administrator" />
}

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}
