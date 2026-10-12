-- PIXEL LIFE — Migrasi 002: penyimpanan cerita (chapter, penanda progres, keputusan host)
-- Jalankan SETELAH 001_foundation.sql. Aman dijalankan sekali saja.

create table public.story_state (
  world_id uuid primary key references public.worlds(id) on delete cascade,
  chapter int not null default 1,
  decisions jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.story_flags (
  world_id uuid not null references public.worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  flag text not null check (flag ~ '^[a-z0-9:_-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (world_id, user_id, flag)
);

alter table public.story_state enable row level security;
alter table public.story_flags enable row level security;
revoke insert, update, delete on public.story_state, public.story_flags from anon, authenticated;

create policy story_state_read on public.story_state for select to authenticated
  using (public.is_world_member(world_id));
create policy story_flags_read on public.story_flags for select to authenticated
  using (public.is_world_member(world_id));

-- Muat progres: membuat baris cerita jika belum ada, mengembalikan penanda milik pemain sendiri
create or replace function public.story_load(p_world uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st story_state; fl jsonb;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  insert into story_state (world_id) values (p_world) on conflict do nothing;
  select * into st from story_state where world_id = p_world;
  select coalesce(jsonb_agg(flag), '[]'::jsonb) into fl from story_flags where world_id = p_world and user_id = auth.uid();
  return jsonb_build_object('chapter', st.chapter, 'decisions', st.decisions, 'flags', fl);
end $$;

-- Catat penanda progres milik pemain sendiri (hanya penjelajahan cerita, tidak menyentuh uang)
create or replace function public.story_flag(p_world uuid, p_flag text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if p_flag is null or p_flag !~ '^[a-z0-9:_-]{1,40}$' then raise exception 'Penanda tidak valid.'; end if;
  if (select count(*) from story_flags where world_id = p_world and user_id = auth.uid()) >= 200 then
    raise exception 'Batas penanda tercapai.'; end if;
  insert into story_flags (world_id, user_id, flag) values (p_world, auth.uid(), p_flag) on conflict do nothing;
end $$;

-- Keputusan cerita: HANYA host, hanya setelah chapter selesai, hanya pilihan sah, hanya sekali
create or replace function public.story_decide(p_world uuid, p_key text, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st story_state; valid boolean;
begin
  if not exists (select 1 from worlds where id = p_world and host_id = auth.uid()) then
    raise exception 'Hanya host yang boleh menentukan pilihan cerita.'; end if;
  valid := (p_key = 'intro_night' and p_choice in ('cafe','taman','alun'));
  if not valid then raise exception 'Pilihan tidak valid.'; end if;
  if not exists (select 1 from story_flags where world_id = p_world and user_id = auth.uid() and flag = 'ch1:done') then
    raise exception 'Chapter 1 belum selesai.'; end if;
  insert into story_state (world_id) values (p_world) on conflict do nothing;
  select * into st from story_state where world_id = p_world for update;
  if st.decisions ? p_key then raise exception 'Keputusan ini sudah ditetapkan.'; end if;
  update story_state set decisions = decisions || jsonb_build_object(p_key, p_choice), chapter = greatest(chapter, 2), updated_at = now()
    where world_id = p_world returning * into st;
  insert into activity_logs (world_id, actor_id, event, detail)
    values (p_world, auth.uid(), 'story_decision', jsonb_build_object('key', p_key, 'choice', p_choice));
  return st.decisions;
end $$;

revoke all on function public.story_load(uuid), public.story_flag(uuid, text), public.story_decide(uuid, text, text) from public, anon;
grant execute on function public.story_load(uuid), public.story_flag(uuid, text), public.story_decide(uuid, text, text) to authenticated;

alter publication supabase_realtime add table public.story_state;
