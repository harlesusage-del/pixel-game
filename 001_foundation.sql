-- PIXEL LIFE: TWO SHOPS, ONE LIFE — Tahap 1: Fondasi
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).

create extension if not exists pgcrypto;

-- ========== TABEL ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  created_at timestamptz not null default now()
);

create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_id uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('active','reset_pending','archived')),
  data_version int not null default 1,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table public.world_members (
  world_id uuid not null references public.worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('host','member')),
  slot smallint not null check (slot in (1,2)),
  character_role text not null check (character_role in ('florist','mechanic')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (world_id, user_id),
  unique (world_id, slot),
  unique (world_id, character_role)
);
create index on public.world_members (user_id);

create table public.character_states (
  world_id uuid not null,
  user_id uuid not null,
  map_id text not null default 'kota',
  x real not null default 0,
  y real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (world_id, user_id),
  foreign key (world_id, user_id) references public.world_members(world_id, user_id) on delete cascade
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  world_id uuid not null references public.worlds(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.activity_logs (world_id, created_at desc);

-- ========== FUNGSI BANTU ==========
create or replace function public.is_world_member(p_world uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from world_members where world_id = p_world and user_id = auth.uid());
$$;

-- Profil otomatis saat akun dibuat
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 24), ''), 'Pemain'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.worlds enable row level security;
alter table public.world_members enable row level security;
alter table public.character_states enable row level security;
alter table public.activity_logs enable row level security;

-- Klien hanya boleh MEMBACA. Semua penulisan penting lewat RPC server.
revoke insert, update, delete on public.profiles, public.worlds, public.world_members,
  public.activity_logs from anon, authenticated;
revoke insert, delete on public.character_states from anon, authenticated;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from world_members a join world_members b on a.world_id = b.world_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy worlds_read on public.worlds for select to authenticated
  using (public.is_world_member(id));
create policy members_read on public.world_members for select to authenticated
  using (public.is_world_member(world_id));
create policy logs_read on public.activity_logs for select to authenticated
  using (public.is_world_member(world_id));
-- Posisi: dibaca anggota dunia, hanya pemilik yang boleh memperbarui miliknya sendiri
create policy chars_read on public.character_states for select to authenticated
  using (public.is_world_member(world_id));
create policy chars_update_own on public.character_states for update to authenticated
  using (user_id = auth.uid() and public.is_world_member(world_id))
  with check (user_id = auth.uid());
grant update (map_id, x, y, updated_at) on public.character_states to authenticated;

-- ========== RPC ==========
create or replace function public.gen_room_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- tanpa I,O,0,1
  s text := 'KOTA-'; i int;
begin
  for i in 1..8 loop
    s := s || substr(alphabet, 1 + floor(random()*32)::int, 1);
    if i = 4 then s := s || '-'; end if;
  end loop;
  return s;
end $$;

create or replace function public.create_world(p_character_role text default 'florist')
returns worlds language plpgsql security definer set search_path = public as $$
declare w worlds; code text; tries int := 0;
begin
  if auth.uid() is null then raise exception 'Belum masuk akun.'; end if;
  if p_character_role not in ('florist','mechanic') then
    raise exception 'Peran karakter tidak valid.';
  end if;
  loop
    code := gen_room_code(); tries := tries + 1;
    begin
      insert into worlds (room_code, host_id) values (code, auth.uid()) returning * into w;
      exit;
    exception when unique_violation then
      if tries > 10 then raise exception 'Gagal membuat kode ruang, coba lagi.'; end if;
    end;
  end loop;
  insert into world_members (world_id, user_id, role, slot, character_role)
    values (w.id, auth.uid(), 'host', 1, p_character_role);
  insert into character_states (world_id, user_id) values (w.id, auth.uid());
  insert into activity_logs (world_id, actor_id, event) values (w.id, auth.uid(), 'world_created');
  return w;
end $$;

create or replace function public.join_world(p_code text)
returns worlds language plpgsql security definer set search_path = public as $$
declare w worlds; host_role text; cnt int;
begin
  if auth.uid() is null then raise exception 'Belum masuk akun.'; end if;
  select * into w from worlds where room_code = upper(trim(p_code)) for update;
  if not found then raise exception 'Kode ruang tidak ditemukan.'; end if;
  if w.status = 'archived' then raise exception 'Dunia ini sudah diarsipkan.'; end if;
  -- Sudah anggota: masuk kembali tanpa mengubah apa pun
  if exists (select 1 from world_members where world_id = w.id and user_id = auth.uid()) then
    return w;
  end if;
  select count(*) into cnt from world_members where world_id = w.id;
  if cnt >= 2 then raise exception 'Dunia ini sudah penuh (2 pemain).'; end if;
  select character_role into host_role from world_members where world_id = w.id and role = 'host';
  insert into world_members (world_id, user_id, role, slot, character_role)
    values (w.id, auth.uid(), 'member', 2, case host_role when 'florist' then 'mechanic' else 'florist' end);
  insert into character_states (world_id, user_id) values (w.id, auth.uid());
  update worlds set last_active_at = now() where id = w.id;
  insert into activity_logs (world_id, actor_id, event) values (w.id, auth.uid(), 'member_joined');
  return w;
end $$;

create or replace function public.touch_presence(p_world uuid)
returns void language sql security definer set search_path = public as $$
  update world_members set last_seen_at = now()
   where world_id = p_world and user_id = auth.uid();
  update worlds set last_active_at = now() where id = p_world and public.is_world_member(id);
$$;

revoke all on function public.create_world(text), public.join_world(text), public.touch_presence(uuid)
  from public, anon;
grant execute on function public.create_world(text), public.join_world(text), public.touch_presence(uuid)
  to authenticated;

-- ========== REALTIME ==========
alter publication supabase_realtime add table public.world_members;
