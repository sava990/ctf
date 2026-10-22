'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Source = { table: 'solves' | 'settings' | 'challenges'; filter?: string }

/** Memuat ulang data server saat tabel yang dipantau berubah (Supabase Realtime). */
export function RealtimeRefresh({ sources, channel }: { sources: Source[]; channel: string }) {
  const router = useRouter()
  const key = JSON.stringify(sources)

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 400)
    }

    let ch = supabase.channel(channel)
    for (const s of JSON.parse(key) as Source[]) {
      ch = ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: s.table, filter: s.filter },
        schedule,
      )
    }
    ch.subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(ch)
    }
  }, [channel, key, router])

  return null
}
