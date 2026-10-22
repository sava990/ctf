import 'server-only'
import { createHash } from 'node:crypto'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { Profile } from './types'

const EMAIL_DOMAIN = process.env.AUTH_EMAIL_DOMAIN ?? 'ctf.local'

export function normalizeName(raw: string) {
  return raw.trim().replace(/\s+/g, ' ')
}

// Supabase Auth butuh email; nama diubah jadi email sintetis yang deterministik.
export function nameToEmail(name: string) {
  const hash = createHash('sha256').update(normalizeName(name).toLowerCase()).digest('hex')
  return `u${hash.slice(0, 32)}@${EMAIL_DOMAIN}`
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<Profile>()
  return profile
})

export async function requireUser() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')
  return profile
}

export async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/admin/login')
  if (profile.role !== 'admin') redirect('/challenges')
  return profile
}
