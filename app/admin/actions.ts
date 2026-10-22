'use server'

import { refresh } from 'next/cache'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { fromZonedInput } from '@/lib/utils'

export type ActionState = { error?: string; ok?: boolean; message?: string }

async function adminClient() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') throw new Error('Unauthorized')
  return createAdminClient()
}

function done(message?: string): ActionState {
  refresh()
  return { ok: true, message }
}

const str = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()

// ---------------------------------------------------------------- Lomba

export async function startNow() {
  const db = await adminClient()
  const { data } = await db.from('settings').select('end_at').eq('id', 1).single()
  const now = new Date().toISOString()
  const endAt = data?.end_at && data.end_at > now ? data.end_at : null
  await db.from('settings').update({ start_at: now, end_at: endAt, updated_at: now }).eq('id', 1)
  refresh()
}

export async function endNow() {
  const db = await adminClient()
  const now = new Date().toISOString()
  await db.from('settings').update({ end_at: now, updated_at: now }).eq('id', 1)
  refresh()
}

export async function closeCompetition() {
  const db = await adminClient()
  await db
    .from('settings')
    .update({ start_at: null, end_at: null, updated_at: new Date().toISOString() })
    .eq('id', 1)
  refresh()
}

export async function saveSchedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await adminClient()
  const startAt = fromZonedInput(str(formData, 'start_at'))
  const endAt = fromZonedInput(str(formData, 'end_at'))
  if (startAt && endAt && endAt <= startAt) {
    return { error: 'Waktu selesai harus setelah waktu mulai.' }
  }
  const { error } = await db
    .from('settings')
    .update({ start_at: startAt, end_at: endAt, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) return { error: error.message }
  return done('Jadwal disimpan.')
}

export async function saveRules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await adminClient()
  const eventName = str(formData, 'event_name')
  const maxAttempts = Number(formData.get('max_attempts'))
  const cooldownMinutes = Number(formData.get('cooldown_minutes'))
  if (!eventName) return { error: 'Nama event wajib diisi.' }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    return { error: 'Batas percobaan 1–100.' }
  }
  if (!(cooldownMinutes > 0 && cooldownMinutes <= 1440)) {
    return { error: 'Cooldown 1–1440 menit.' }
  }
  const { error } = await db
    .from('settings')
    .update({
      event_name: eventName,
      max_attempts: maxAttempts,
      cooldown_seconds: Math.round(cooldownMinutes * 60),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) return { error: error.message }
  return done('Aturan disimpan.')
}

// ---------------------------------------------------------------- Soal

export async function saveChallenge(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await adminClient()
  const id = str(formData, 'id') || undefined
  const flag = str(formData, 'flag')
  const points = Number(formData.get('points'))
  const record = {
    title: str(formData, 'title'),
    category: str(formData, 'category') || 'Misc',
    description: String(formData.get('description') ?? ''),
    hint: str(formData, 'hint') || null,
    attachment_url: str(formData, 'attachment_url') || null,
    points,
    is_visible: formData.get('is_visible') === 'on',
  }

  if (!record.title) return { error: 'Judul wajib diisi.' }
  if (!Number.isInteger(points) || points < 1 || points > 10000) return { error: 'Poin 1–10000.' }
  if (!flag) return { error: 'Flag wajib diisi.' }
  if (record.attachment_url && !/^https?:\/\//.test(record.attachment_url)) {
    return { error: 'URL lampiran harus diawali http:// atau https://' }
  }

  const { data, error } = id
    ? await db.from('challenges').update(record).eq('id', id).select('id').single()
    : await db.from('challenges').insert(record).select('id').single()
  if (error || !data) return { error: error?.message ?? 'Gagal menyimpan soal.' }

  const { error: flagError } = await db
    .from('challenge_flags')
    .upsert({ challenge_id: data.id, flag })
  if (flagError) return { error: flagError.message }

  return done(id ? 'Soal diperbarui.' : 'Soal ditambahkan.')
}

export async function setChallengeVisibility(id: string, visible: boolean) {
  const db = await adminClient()
  await db.from('challenges').update({ is_visible: visible }).eq('id', id)
  refresh()
}

export async function deleteChallenge(id: string) {
  const db = await adminClient()
  await db.from('challenges').delete().eq('id', id)
  refresh()
}

// ---------------------------------------------------------------- Peserta

export async function banUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await adminClient()
  const userId = str(formData, 'user_id')
  const reason = str(formData, 'reason') || 'Terdeteksi percobaan brute force.'

  const { error } = await db
    .from('profiles')
    .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('role', 'user')
  if (error) return { error: error.message }

  // Blokir juga di level Auth: user tidak bisa login lagi & token tidak di-refresh.
  await db.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
  return done('Peserta diblokir.')
}

export async function unbanUser(userId: string) {
  const db = await adminClient()
  await db
    .from('profiles')
    .update({ is_banned: false, ban_reason: null, banned_at: null })
    .eq('id', userId)
  await db.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  refresh()
}

export async function resetCooldown(userId: string) {
  const db = await adminClient()
  await db
    .from('attempt_state')
    .update({ fail_count: 0, locked_until: null })
    .eq('user_id', userId)
  refresh()
}

// ---------------------------------------------------------------- Rombel

export async function addRombels(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await adminClient()
  const codes = Array.from(
    new Set(
      String(formData.get('codes') ?? '')
        .split(/[\n,;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
  if (codes.length === 0) return { error: 'Masukkan minimal satu kode rombel.' }
  if (codes.some((c) => c.length > 32)) return { error: 'Kode rombel maksimal 32 karakter.' }

  const { data, error } = await db
    .from('rombels')
    .upsert(codes.map((code) => ({ code })), { onConflict: 'code', ignoreDuplicates: true })
    .select('id')
  if (error) return { error: error.message }
  return done(`${data?.length ?? 0} rombel ditambahkan.`)
}

export async function updateRombel(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const db = await adminClient()
  const id = str(formData, 'id')
  const code = str(formData, 'code').toUpperCase()
  const teamName = str(formData, 'team_name') || null
  if (!code) return { error: 'Kode wajib diisi.' }
  if (teamName && teamName.length > 40) return { error: 'Nama tim maksimal 40 karakter.' }
  const { error } = await db.from('rombels').update({ code, team_name: teamName }).eq('id', id)
  if (error) return { error: error.code === '23505' ? 'Kode rombel sudah dipakai.' : error.message }
  return done('Rombel diperbarui.')
}

export async function deleteRombel(id: string) {
  const db = await adminClient()
  await db.from('rombels').delete().eq('id', id)
  refresh()
}
