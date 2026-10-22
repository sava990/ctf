import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-muted border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export function StatusDot({ tone = 'neutral', pulse }: { tone?: Tone; pulse?: boolean }) {
  const color = {
    neutral: 'bg-muted',
    accent: 'bg-accent',
    success: 'bg-success',
    danger: 'bg-danger',
    warning: 'bg-warning',
  }[tone]
  return (
    <span className="relative inline-flex size-2">
      {pulse ? <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', color)} /> : null}
      <span className={cn('relative inline-flex size-2 rounded-full', color)} />
    </span>
  )
}
