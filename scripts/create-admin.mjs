// Membuat (atau mempromosikan) akun admin.
// Pemakaian: node --env-file=.env.local scripts/create-admin.mjs "<nama>" "<password>"
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [rawName, password] = process.argv.slice(2)
if (!rawName || !password || password.length < 8) {
  console.error('Pemakaian: node --env-file=.env.local scripts/create-admin.mjs "<nama>" "<password min 8>"')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.')
  process.exit(1)
}

// Harus sama dengan nameToEmail() di lib/auth.ts
const name = rawName.trim().replace(/\s+/g, ' ')
const domain = process.env.AUTH_EMAIL_DOMAIN ?? 'ctf.local'
const hash = createHash('sha256').update(name.toLowerCase()).digest('hex')
const email = `u${hash.slice(0, 32)}@${domain}`

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

let userId
const { data: created, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
})

if (error) {
  if (error.code !== 'email_exists') {
    console.error('Gagal membuat user:', error.message)
    process.exit(1)
  }
  const { data: profile } = await db.from('profiles').select('id').ilike('name', name).maybeSingle()
  if (!profile) {
    console.error('Email sudah ada tetapi profil tidak ditemukan.')
    process.exit(1)
  }
  userId = profile.id
  await db.auth.admin.updateUserById(userId, { password })
} else {
  userId = created.user.id
}

const { error: upsertError } = await db
  .from('profiles')
  .upsert({ id: userId, name, role: 'admin', rombel_id: null })
if (upsertError) {
  console.error('Gagal menyimpan profil admin:', upsertError.message)
  process.exit(1)
}

console.log(`✔ Admin "${name}" siap. Login di /admin/login`)
