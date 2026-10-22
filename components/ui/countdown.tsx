'use client'

import { useEffect, useState } from 'react'

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatRemaining(ms: number) {
  const { d, h, m, s } = parts(ms)
  if (d > 0) return `${d} hari ${pad(h)}:${pad(m)}:${pad(s)}`
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

/** Sisa milidetik menuju `target`, diperbarui tiap detik. `null` sebelum hydrate. */
export function useRemaining(target: string | null, onDone?: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!target) return
    const end = new Date(target).getTime()
    let done = false
    const tick = () => {
      const left = end - Date.now()
      setRemaining(Math.max(0, left))
      if (left <= 0 && !done) {
        done = true
        onDone?.()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target, onDone])

  return target ? remaining : null
}

export function Countdown({
  target,
  onDone,
  className,
}: {
  target: string
  onDone?: () => void
  className?: string
}) {
  const remaining = useRemaining(target, onDone)
  return (
    <span className={className} suppressHydrationWarning>
      {remaining === null ? '--:--' : formatRemaining(remaining)}
    </span>
  )
}

export function BigCountdown({ target, onDone }: { target: string; onDone?: () => void }) {
  const remaining = useRemaining(target, onDone)
  const p = remaining === null ? null : parts(remaining)
  const items = [
    ['Hari', p?.d],
    ['Jam', p?.h],
    ['Menit', p?.m],
    ['Detik', p?.s],
  ] as const

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-surface px-3 py-4 text-center sm:px-5"
        >
          <div className="font-mono text-2xl font-semibold tabular-nums sm:text-4xl">
            {value === undefined ? '--' : pad(value)}
          </div>
          <div className="mt-1 text-xs text-muted">{label}</div>
        </div>
      ))}
    </div>
  )
}
