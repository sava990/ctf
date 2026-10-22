-- =====================================================================
--  CTF Platform — skema awal
--  Jalankan di Supabase SQL Editor, atau `npx supabase db push`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------

-- Rombel = tim. Semua anggota rombel berbagi poin & status soal.
create table public.rombels (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (char_length(code) between 1 and 32),
  team_name   text check (team_name is null or char_length(team_name) between 1 and 40),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 3 and 40),
  rombel_id   uuid references public.rombels (id) on delete set null,
  ktm_path    text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  is_banned   boolean not null default false,
  ban_reason  text,
  banned_at   timestamptz,
  created_at  timestamptz not null default now()
);
create unique index profiles_name_lower_idx on public.profiles (lower(name));
create index profiles_rombel_idx on public.profiles (rombel_id);

-- Satu baris pengaturan lomba (id selalu 1).
create table public.settings (
  id                 int primary key default 1 check (id = 1),
  event_name         text not null default 'CTF',
  start_at           timestamptz,
  end_at             timestamptz,
  max_attempts       int not null default 5 check (max_attempts between 1 and 100),
  cooldown_seconds   int not null default 300 check (cooldown_seconds between 10 and 86400),
  updated_at         timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.challenges (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 80),
  category     text not null default 'Misc',
  description  text not null default '',
  hint         text,
  attachment_url text,
  points       int not null default 100 check (points between 1 and 10000),
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Flag disimpan terpisah, RLS aktif tanpa policy -> tidak bisa dibaca user.
create table public.challenge_flags (
  challenge_id uuid primary key references public.challenges (id) on delete cascade,
  flag         text not null
);

-- Satu soal hanya bisa di-solve sekali per tim.
create table public.solves (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  rombel_id     uuid not null references public.rombels (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete set null,
  points        int not null,
  created_at    timestamptz not null default now(),
  unique (challenge_id, rombel_id)
);
create index solves_rombel_idx on public.solves (rombel_id);

-- Semua percobaan submit (benar & salah) tercatat.
create table public.submissions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  rombel_id     uuid references public.rombels (id) on delete set null,
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  submitted     text not null,
  is_correct    boolean not null,
  created_at    timestamptz not null default now()
);
create index submissions_user_idx on public.submissions (user_id, created_at desc);
create index submissions_created_idx on public.submissions (created_at desc);

-- Status percobaan per user per soal (dasar cooldown).
create table public.attempt_state (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  fail_count     int not null default 0,
  lockout_count  int not null default 0,
  locked_until   timestamptz,
  primary key (user_id, challenge_id)
);

-- ---------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------

create or replace function public.my_rombel_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select rombel_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Soal terlihat setelah waktu mulai lomba tercapai.
create or replace function public.competition_started()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select start_at is not null and start_at <= now() from public.settings where id = 1), false);
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.rombels         enable row level security;
alter table public.profiles        enable row level security;
alter table public.settings        enable row level security;
alter table public.challenges      enable row level security;
alter table public.challenge_flags enable row level security;
alter table public.solves          enable row level security;
alter table public.submissions     enable row level security;
alter table public.attempt_state   enable row level security;

-- Daftar rombel dibutuhkan di halaman register (belum login).
create policy "rombels readable by everyone" on public.rombels
  for select using (true);

create policy "settings readable by everyone" on public.settings
  for select using (true);

create policy "read own profile and teammates" on public.profiles
  for select to authenticated
  using (id = auth.uid() or rombel_id = public.my_rombel_id() or public.is_admin());

create policy "challenges visible after start" on public.challenges
  for select to authenticated
  using (public.is_admin() or (is_visible and public.competition_started()));

create policy "solves readable" on public.solves
  for select to authenticated using (true);

create policy "read own submissions" on public.submissions
  for select to authenticated using (user_id = auth.uid());

create policy "read own attempt state" on public.attempt_state
  for select to authenticated using (user_id = auth.uid());

-- challenge_flags: sengaja tanpa policy.
-- Semua penulisan dilakukan lewat fungsi security definer atau service role.

-- ---------------------------------------------------------------------
-- RPC: submit flag (atomik, dengan cooldown anti-bruteforce)
-- ---------------------------------------------------------------------

create or replace function public.submit_flag(p_challenge_id uuid, p_flag text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles;
  v_settings  public.settings;
  v_chal      public.challenges;
  v_flag      text;
  v_state     public.attempt_state;
  v_solve     public.solves;
  v_correct   boolean;
  v_input     text := btrim(coalesce(p_flag, ''));
begin
  if v_uid is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    return jsonb_build_object('status', 'unauthenticated');
  end if;
  if v_profile.is_banned then
    return jsonb_build_object('status', 'banned');
  end if;
  if v_profile.rombel_id is null then
    return jsonb_build_object('status', 'no_team');
  end if;

  select * into v_settings from public.settings where id = 1;
  if v_settings.start_at is null or v_settings.start_at > now() then
    return jsonb_build_object('status', 'not_started');
  end if;
  if v_settings.end_at is not null and v_settings.end_at <= now() then
    return jsonb_build_object('status', 'ended');
  end if;

  select * into v_chal from public.challenges where id = p_challenge_id and is_visible;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_input = '' or char_length(v_input) > 256 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_solve from public.solves
   where challenge_id = p_challenge_id and rombel_id = v_profile.rombel_id;
  if found then
    return jsonb_build_object('status', 'already_solved');
  end if;

  -- Kunci baris state user agar submit paralel tidak lolos cooldown.
  insert into public.attempt_state (user_id, challenge_id)
  values (v_uid, p_challenge_id)
  on conflict do nothing;

  select * into v_state from public.attempt_state
   where user_id = v_uid and challenge_id = p_challenge_id
   for update;

  if v_state.locked_until is not null and v_state.locked_until > now() then
    return jsonb_build_object('status', 'locked', 'locked_until', v_state.locked_until);
  end if;

  select flag into v_flag from public.challenge_flags where challenge_id = p_challenge_id;
  v_correct := v_flag is not null and v_input = btrim(v_flag);

  insert into public.submissions (user_id, rombel_id, challenge_id, submitted, is_correct)
  values (v_uid, v_profile.rombel_id, p_challenge_id, left(v_input, 256), v_correct);

  if v_correct then
    insert into public.solves (challenge_id, rombel_id, user_id, points)
    values (p_challenge_id, v_profile.rombel_id, v_uid, v_chal.points)
    on conflict (challenge_id, rombel_id) do nothing;

    if not found then
      -- Rekan setim baru saja menyelesaikannya di saat bersamaan.
      return jsonb_build_object('status', 'already_solved');
    end if;

    update public.attempt_state
       set fail_count = 0, locked_until = null
     where user_id = v_uid and challenge_id = p_challenge_id;

    return jsonb_build_object('status', 'correct', 'points', v_chal.points);
  end if;

  if v_state.fail_count + 1 >= v_settings.max_attempts then
    update public.attempt_state
       set fail_count = 0,
           lockout_count = lockout_count + 1,
           locked_until = now() + make_interval(secs => v_settings.cooldown_seconds)
     where user_id = v_uid and challenge_id = p_challenge_id
     returning * into v_state;

    return jsonb_build_object('status', 'locked', 'locked_until', v_state.locked_until);
  end if;

  update public.attempt_state
     set fail_count = fail_count + 1, locked_until = null
   where user_id = v_uid and challenge_id = p_challenge_id
   returning * into v_state;

  return jsonb_build_object(
    'status', 'incorrect',
    'remaining', v_settings.max_attempts - v_state.fail_count
  );
end;
$$;

revoke all on function public.submit_flag(uuid, text) from public, anon;
grant execute on function public.submit_flag(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: ganti nama tim (hanya anggota tim tersebut)
-- ---------------------------------------------------------------------

create or replace function public.set_team_name(p_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_rombel uuid;
  v_name   text := nullif(btrim(coalesce(p_name, '')), '');
begin
  select rombel_id into v_rombel from public.profiles
   where id = auth.uid() and not is_banned;
  if v_rombel is null then
    raise exception 'not allowed';
  end if;
  if v_name is not null and char_length(v_name) > 40 then
    raise exception 'name too long';
  end if;
  update public.rombels set team_name = v_name where id = v_rombel;
end;
$$;

revoke all on function public.set_team_name(text) from public, anon;
grant execute on function public.set_team_name(text) to authenticated;

-- ---------------------------------------------------------------------
-- Leaderboard
-- ---------------------------------------------------------------------

create or replace function public.get_leaderboard()
returns table (
  rombel_id     uuid,
  code          text,
  team_name     text,
  score         bigint,
  solve_count   bigint,
  member_count  bigint,
  last_solve_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select r.id,
         r.code,
         r.team_name,
         coalesce(s.score, 0)        as score,
         coalesce(s.solve_count, 0)  as solve_count,
         coalesce(m.member_count, 0) as member_count,
         s.last_solve_at
    from public.rombels r
    left join (
      select rombel_id, sum(points) as score, count(*) as solve_count, max(created_at) as last_solve_at
        from public.solves group by rombel_id
    ) s on s.rombel_id = r.id
    left join (
      select rombel_id, count(*) as member_count
        from public.profiles where role = 'user' group by rombel_id
    ) m on m.rombel_id = r.id
   order by score desc, last_solve_at asc nulls last, r.code asc;
$$;

revoke all on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated, service_role;

-- Jumlah solve per soal (untuk ditampilkan di kartu soal).
create or replace function public.get_challenge_solve_counts()
returns table (challenge_id uuid, solve_count bigint)
language sql stable security definer set search_path = ''
as $$
  select challenge_id, count(*) from public.solves group by challenge_id;
$$;

revoke all on function public.get_challenge_solve_counts() from public, anon;
grant execute on function public.get_challenge_solve_counts() to authenticated;

-- Statistik percobaan per user untuk dashboard admin (hanya service role).
create or replace function public.admin_user_stats()
returns table (
  user_id        uuid,
  wrong_count    bigint,
  correct_count  bigint,
  lockout_count  bigint,
  last_submit_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id,
         coalesce(s.wrong, 0),
         coalesce(s.correct, 0),
         coalesce(a.lockouts, 0),
         s.last_at
    from public.profiles p
    left join (
      select user_id,
             count(*) filter (where not is_correct) as wrong,
             count(*) filter (where is_correct)     as correct,
             max(created_at)                        as last_at
        from public.submissions group by user_id
    ) s on s.user_id = p.id
    left join (
      select user_id, sum(lockout_count) as lockouts
        from public.attempt_state group by user_id
    ) a on a.user_id = p.id;
$$;

revoke all on function public.admin_user_stats() from public, anon, authenticated;
grant execute on function public.admin_user_stats() to service_role;

-- ---------------------------------------------------------------------
-- Realtime: perubahan solve langsung terlihat oleh seluruh anggota tim.
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.solves;
alter publication supabase_realtime add table public.settings;

-- ---------------------------------------------------------------------
-- Storage: bucket privat untuk foto KTM (hanya diakses via service role).
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ktm', 'ktm', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
