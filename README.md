# CTF Platform

Platform kompetisi Capture The Flag per rombel. Dibuat dengan Next.js 16 (App Router, Cache Components) dan Supabase (Auth, Postgres, Storage, Realtime).

## Fitur

**Peserta**
- Daftar dengan nama, password, rombel, dan foto KTM. Login dengan nama dan password.
- Ruang tunggu dengan hitung mundur. Soal terbuka otomatis saat lomba dimulai, tanpa perlu memuat ulang halaman.
- Dashboard soal: filter per kategori, pencarian, dan popup soal berisi deskripsi, lampiran, hint, serta kolom jawaban.
- Satu rombel = satu tim. Saat satu anggota menjawab benar, soal langsung berstatus *solved* di layar semua anggota tim (realtime).
- Leaderboard live, dan halaman tim berisi anggota, nama tim yang bisa diubah, dan riwayat solve.
- Anti brute force: semua jawaban (benar maupun salah) dicatat. Setelah N kali salah pada satu soal, form dikunci (cooldown) selama X menit. Nilai N dan X diatur admin.

**Admin** (`/admin/login`)
- Merilis soal sekarang, menjadwalkan waktu mulai dan selesai, mengakhiri lomba, serta mengatur batas percobaan dan durasi cooldown.
- CRUD soal (judul, kategori, poin, deskripsi, hint, lampiran, flag, draft/terlihat).
- Data peserta beserta foto KTM, statistik jawaban salah dan cooldown, filter "Mencurigakan", blokir/buka blokir, dan reset cooldown.
- Kelola rombel (tambah banyak sekaligus, ubah nama tim, hapus).
- Log semua submit.

## Setup

### 1. Buat project Supabase
Buat project di [supabase.com](https://supabase.com). Setelah itu buka **Project Settings → API** dan catat URL, anon key, dan service_role key.

### 2. Jalankan skema database
Buka **SQL Editor** lalu jalankan berurutan:

1. `supabase/migrations/20261023000000_init.sql`: tabel, RLS, fungsi `submit_flag`, realtime, dan bucket `ktm`.
2. `supabase/seed.sql` (opsional): contoh rombel dan 2 soal.

Jika memakai Supabase CLI: `npx supabase link --project-ref <ref>` lalu `npx supabase db push`.

### 3. Environment
```bash
cp .env.example .env.local
```
Isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`.

### 4. Buat akun admin
```bash
npm install
node --env-file=.env.local scripts/create-admin.mjs "Panitia" "passwordKuat123"
```

### 5. Jalankan
```bash
npm run dev
```
- Peserta: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

Alur lomba: buat rombel → peserta mendaftar → tambah soal → klik **Rilis soal sekarang** atau pasang jadwal.

## Catatan teknis

- **Login dengan nama.** Supabase Auth butuh email, jadi nama diubah menjadi email sintetis yang deterministik (`u<sha256>@ctf.local`). Akun dibuat lewat admin API dengan `email_confirm: true`, sehingga tidak ada email yang dikirim dan pengaturan "Confirm email" tidak berpengaruh.
- **Keamanan flag.** Flag disimpan di tabel `challenge_flags` dengan RLS aktif tanpa policy, sehingga tidak bisa dibaca client. Pengecekan dilakukan di fungsi Postgres `submit_flag` (security definer) yang atomik: kunci baris per user untuk mencegah submit paralel menembus cooldown, dan constraint unik `(challenge_id, rombel_id)` agar satu soal hanya bisa di-solve sekali per tim.
- **Foto KTM** disimpan di bucket privat `ktm` dan hanya bisa dibuka admin lewat signed URL (berlaku 1 jam). File divalidasi dari *magic bytes* (JPG/PNG/WEBP, maks. 2 MB).
- **Blokir** dilakukan di dua lapis: `profiles.is_banned` (submit ditolak) dan `ban_duration` di Supabase Auth (tidak bisa login lagi).
- **Zona waktu** untuk tampilan dan input jadwal diatur lewat `NEXT_PUBLIC_TIME_ZONE` (default `Asia/Jakarta`).

## Struktur

```
app/
  (auth)/        login, register, server actions auth
  (app)/         challenges, leaderboard, team (peserta)
  admin/         login + (dashboard)/ ringkasan, soal, peserta, rombel, log
components/      UI (button, dialog, field, countdown, ...) + fitur
lib/             supabase clients, auth (DAL), types, utils
proxy.ts         refresh sesi Supabase + redirect route terproteksi
supabase/        migration & seed
scripts/         create-admin.mjs
```
