'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { Input } from '../ui/field'

export type LogRow = {
  id: number
  submitted: string
  is_correct: boolean
  created_at: string
  user: string
  rombel: string
  challenge: string
}

export function SubmissionLog({ rows }: { rows: LogRow[] }) {
  const [onlyWrong, setOnlyWrong] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()
  const visible = rows.filter(
    (r) =>
      (!onlyWrong || !r.is_correct) &&
      (!q || r.user.toLowerCase().includes(q) || r.challenge.toLowerCase().includes(q) || r.rombel.toLowerCase().includes(q)),
  )

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
          <input
            type="checkbox"
            checked={onlyWrong}
            onChange={(e) => setOnlyWrong(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Hanya jawaban salah
        </label>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari peserta, rombel, soal…"
            className="h-9 pl-9"
          />
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Waktu</th>
                <th className="px-5 py-3 font-medium">Peserta</th>
                <th className="px-5 py-3 font-medium">Soal</th>
                <th className="px-5 py-3 font-medium">Jawaban</th>
                <th className="px-5 py-3 font-medium">Hasil</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted tabular-nums">{formatDateTime(r.created_at)}</td>
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{r.user}</div>
                    <div className="text-xs text-muted">{r.rombel}</div>
                  </td>
                  <td className="px-5 py-2.5">{r.challenge}</td>
                  <td className="max-w-64 px-5 py-2.5">
                    <code
                      className={cn('block truncate font-mono text-xs', r.is_correct ? 'text-success' : 'text-muted')}
                      title={r.submitted}
                    >
                      {r.submitted}
                    </code>
                  </td>
                  <td className="px-5 py-2.5">
                    {r.is_correct ? <Badge tone="success">Benar</Badge> : <Badge tone="danger">Salah</Badge>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-muted">
                    Belum ada data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
