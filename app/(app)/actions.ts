'use server'

import { refresh } from 'next/cache'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { SubmitResult } from '@/lib/types'

export async function submitFlag(challengeId: string, flag: string): Promise<SubmitResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { status: 'unauthenticated' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_flag', {
    p_challenge_id: challengeId,
    p_flag: flag,
  })

  if (error) {
    console.error('submit_flag failed', error)
    return { status: 'error' }
  }

  const result = data as SubmitResult
  if (result.status === 'correct' || result.status === 'already_solved' || result.status === 'locked') {
    refresh()
  }
  return result
}

export type TeamNameState = { error?: string; ok?: boolean }

export async function updateTeamName(_prev: TeamNameState, formData: FormData): Promise<TeamNameState> {
  const profile = await getCurrentProfile()
  if (!profile || profile.is_banned) return { error: 'Tidak diizinkan.' }

  const name = String(formData.get('team_name') ?? '').trim().replace(/\s+/g, ' ')
  if (name.length > 40) return { error: 'Maksimal 40 karakter.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('set_team_name', { p_name: name })
  if (error) return { error: 'Gagal menyimpan nama tim.' }

  refresh()
  return { ok: true }
}
