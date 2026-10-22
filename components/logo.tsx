import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, label = 'CTF' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Flag className="size-3.5" strokeWidth={2.5} />
      </span>
      <span>{label}</span>
    </span>
  )
}
