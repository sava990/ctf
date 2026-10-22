export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? 'Asia/Jakarta'

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

export function formatTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

export function teamLabel(rombel: { code: string; team_name: string | null }) {
  return rombel.team_name || rombel.code
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

const zonedParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** ISO -> nilai `datetime-local` di TIME_ZONE (sama di server & browser). */
export function toZonedInput(iso: string | null | undefined) {
  if (!iso) return ''
  const parts = zonedParts.formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** Nilai `datetime-local` di TIME_ZONE -> ISO UTC. */
export function fromZonedInput(value: string | null | undefined) {
  if (!value) return null
  const asUtc = new Date(`${value}:00Z`)
  if (Number.isNaN(asUtc.getTime())) return null
  const zoned = new Date(`${toZonedInput(asUtc.toISOString())}:00Z`)
  const offset = zoned.getTime() - asUtc.getTime()
  return new Date(asUtc.getTime() - offset).toISOString()
}
