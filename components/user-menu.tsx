import { LogOut } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import { initials } from '@/lib/utils'

export function UserMenu({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <div className="text-sm font-medium">{name}</div>
        {subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null}
      </div>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-muted"
      >
        {initials(name)}
      </span>
      <form action={logout}>
        <button
          type="submit"
          title="Keluar"
          aria-label="Keluar"
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  )
}
