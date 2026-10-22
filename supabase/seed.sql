-- Data contoh (opsional). Ubah sesuai rombel di kampus/sekolah Anda.

insert into public.rombels (code) values
  ('TI-1A'), ('TI-1B'), ('TI-1C'), ('SI-1A'), ('SI-1B')
on conflict (code) do nothing;

update public.settings
   set event_name = 'CTF Kampus 2026', max_attempts = 5, cooldown_seconds = 300
 where id = 1;

with c as (
  insert into public.challenges (title, category, description, hint, points)
  values
    ('Sanity Check', 'Misc',
     'Selamat datang! Flag-nya ada di sini: `CTF{selamat_datang}`',
     'Baca deskripsinya baik-baik.', 50),
    ('Base Jumping', 'Crypto',
     'Q1RGe2Jhc2U2NF9pc19ub3RfZW5jcnlwdGlvbn0=',
     'Encoding yang sering diakhiri tanda sama dengan.', 100)
  returning id, title
)
insert into public.challenge_flags (challenge_id, flag)
select id, case title
  when 'Sanity Check' then 'CTF{selamat_datang}'
  when 'Base Jumping' then 'CTF{base64_is_not_encryption}'
end
from c;
