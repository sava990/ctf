import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'danger' | 'warning'

const tones: Record<Tone, string> = {
  info: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
}

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <div role="status" className={cn('rounded-lg px-3 py-2.5 text-sm', tones[tone], className)}>
      {children}
    </div>
  )
}
