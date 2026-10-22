'use server'

import { redirect } from 'next/navigation'
import { nameToEmail, normalizeName } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type FormState = {
  error?: string
  fieldErrors?: Partial<Record<'name' | 'password' | 'confirm' | 'rombel_id' | 'ktm', string>>
  values?: { name?: string; rombel_id?: string }
}

const NAME_PATTERN = /^[\p{L}\p{N} .'_-]{3,40}$/u
const MAX_KTM_BYTES = 2 * 1024 * 1024

const IMAGE_SIGNATURES: { ext: string; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: 'jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    type: 'image/png',
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: 'webp',
    type: 'image/webp',
    test: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
  },
]

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = normalizeName(String(formData.get('name') ?? ''))
  const password = String(formData.get('password') ?? '')
  const scope = formData.get('scope') === 'admin' ? 'admin' : 'user'

  if (!name || !password) {
    return { error: 'Nama dan password wajib diisi.', values: { name } }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: nameToEmail(name),
    password,
  })

  if (error || !data.user) {
    const banned = error?.code === 'user_banned'
    return {
      error: banned
        ? 'Akun Anda diblokir oleh admin. Hubungi panitia jika ini keliru.'
        : 'Nama atau password salah.',
      values: { name },
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (scope === 'admin' && profile?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'Akun ini bukan akun admin.', values: { name } }
  }

  redirect(profile?.role === 'admin' ? '/admin' : '/challenges')
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = normalizeName(String(formData.get('name') ?? ''))
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  const rombelId = String(formData.get('rombel_id') ?? '')
  const ktm = formData.get('ktm')
  const values = { name, rombel_id: rombelId }

  const fieldErrors: FormState['fieldErrors'] = {}
  if (!NAME_PATTERN.test(name)) {
    fieldErrors.name = '3–40 karakter: huruf, angka, spasi, titik, - atau _.'
  }
  if (password.length < 8) fieldErrors.password = 'Minimal 8 karakter.'
  if (password !== confirm) fieldErrors.confirm = 'Konfirmasi password tidak sama.'
  if (!rombelId) fieldErrors.rombel_id = 'Pilih rombel Anda.'

  let ktmBytes: Uint8Array | null = null
  let ktmKind: (typeof IMAGE_SIGNATURES)[number] | undefined
  if (!(ktm instanceof File) || ktm.size === 0) {
    fieldErrors.ktm = 'Unggah foto KTM.'
  } else if (ktm.size > MAX_KTM_BYTES) {
    fieldErrors.ktm = 'Ukuran maksimal 2 MB.'
  } else {
    ktmBytes = new Uint8Array(await ktm.arrayBuffer())
    ktmKind = IMAGE_SIGNATURES.find((s) => s.test(ktmBytes!))
    if (!ktmKind) fieldErrors.ktm = 'Format harus JPG, PNG, atau WEBP.'
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values }

  const admin = createAdminClient()

  const { data: rombel } = await admin.from('rombels').select('id').eq('id', rombelId).maybeSingle()
  if (!rombel) return { fieldErrors: { rombel_id: 'Rombel tidak ditemukan.' }, values }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: nameToEmail(name),
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !created.user) {
    if (createError?.code === 'email_exists' || createError?.code === 'user_already_exists') {
      return { fieldErrors: { name: 'Nama ini sudah terdaftar. Gunakan nama lain.' }, values }
    }
    if (createError?.code === 'weak_password') {
      return { fieldErrors: { password: 'Password terlalu lemah.' }, values }
    }
    console.error('createUser failed', createError)
    return { error: 'Gagal membuat akun. Coba lagi sebentar.', values }
  }

  const userId = created.user.id
  const ktmPath = `${userId}/ktm-${Date.now()}.${ktmKind!.ext}`

  const { error: uploadError } = await admin.storage
    .from('ktm')
    .upload(ktmPath, ktmBytes!, { contentType: ktmKind!.type, upsert: false })

  const { error: profileError } = uploadError
    ? { error: uploadError }
    : await admin.from('profiles').insert({
        id: userId,
        name,
        rombel_id: rombelId,
        ktm_path: ktmPath,
      })

  if (uploadError || profileError) {
    console.error('register failed', uploadError ?? profileError)
    await admin.storage.from('ktm').remove([ktmPath])
    await admin.auth.admin.deleteUser(userId)
    const duplicate = (profileError as { code?: string } | null)?.code === '23505'
    return duplicate
      ? { fieldErrors: { name: 'Nama ini sudah terdaftar. Gunakan nama lain.' }, values }
      : { error: 'Gagal menyimpan data pendaftaran. Coba lagi.', values }
  }

  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email: nameToEmail(name), password })
  redirect('/challenges')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
