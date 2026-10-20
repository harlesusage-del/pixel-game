-- PIXEL LIFE — Migrasi 005: tabungan bersama (persetujuan ganda), pesanan spesial pernikahan, keputusan host Chapter 4-6
-- Jalankan SETELAH 001-004. Aman dijalankan sekali saja.
-- Tabungan bersama dibuka pada Chapter 5 (diverifikasi server dari story_state.chapter). Menikah TIDAK menggabungkan uang pribadi.

-- Jenis dompet 'family' (tabungan bersama)
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.wallets'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%personal%';
  if c is not null then execute format('alter table public.wallets drop constraint %I', c); end if;
end $$;
alter table public.wallets add constraint wallets_kind_chk check (kind in ('personal','business','family'));
drop policy if exists wallets_read on public.wallets;
create policy wallets_read on public.wallets for select to authenticated
  using (public.is_world_member(world_id) and (kind in ('business','family') or owner_id = auth.uid()));

create table public.family_requests (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  purpose text not null check (purpose in ('gedung','dekorasi','busana','jamuan','rumah','lainnya')),
  amount bigint not null check (amount > 0),
  status text not null default 'MENUNGGU' check (status in ('MENUNGGU','DISETUJUI','DITOLAK','DIBATALKAN')),
  idem_key text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (world_id, requested_by, idem_key)
);
create index on public.family_requests (world_id, status);
alter table public.family_requests enable row level security;
revoke insert, update, delete on public.family_requests from anon, authenticated;
create policy family_req_read on public.family_requests for select to authenticated using (public.is_world_member(world_id));

-- ===== Tabungan bersama =====
create or replace function public.family_open(p_world uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ch int; hostid uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select chapter into ch from story_state where world_id = p_world;
  if coalesce(ch, 1) < 5 then raise exception 'Tabungan bersama dibuka pada Chapter 5.'; end if;
  perform pg_advisory_xact_lock(hashtext('family' || p_world::text));
  if not exists (select 1 from wallets where world_id = p_world and kind = 'family') then
    select host_id into hostid from worlds where id = p_world;
    insert into wallets (world_id, kind, owner_id) values (p_world, 'family', hostid);
    insert into activity_logs (world_id, actor_id, event) values (p_world, auth.uid(), 'family_savings_opened');
  end if;
  return public.econ_state(p_world);
end $$;

create or replace function public.family_contribute(p_world uuid, p_amount bigint, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pw uuid; fw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if public._dup(p_world, p_key) then return public.econ_state(p_world); end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'Setoran 1 sampai 100.000 KC.'; end if;
  select id into fw from wallets where world_id = p_world and kind = 'family';
  if fw is null then raise exception 'Tabungan bersama belum dibuka.'; end if;
  select id into pw from wallets where world_id = p_world and owner_id = uid and kind = 'personal';
  perform public._move(p_world, pw, fw, p_amount, 'family_in', uid, p_key, null, 'Setoran ke tabungan bersama');
  return public.econ_state(p_world);
end $$;

create or replace function public.family_propose(p_world uuid, p_purpose text, p_amount bigint, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bal bigint; cnt int;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if p_key is not null and exists (select 1 from family_requests where world_id = p_world and requested_by = uid and idem_key = p_key) then
    return public.econ_state(p_world); end if;
  select balance into bal from wallets where world_id = p_world and kind = 'family';
  if bal is null then raise exception 'Tabungan bersama belum dibuka.'; end if;
  if p_purpose is null or p_purpose not in ('gedung','dekorasi','busana','jamuan','rumah','lainnya') then raise exception 'Tujuan tidak valid.'; end if;
  if p_amount is null or p_amount < 1 then raise exception 'Jumlah tidak valid.'; end if;
  if p_amount > bal then raise exception 'Saldo tabungan bersama tidak cukup.'; end if;
  select count(*) into cnt from family_requests where world_id = p_world and status = 'MENUNGGU';
  if cnt >= 3 then raise exception 'Masih ada 3 permintaan menunggu. Selesaikan dulu.'; end if;
  insert into family_requests (world_id, requested_by, purpose, amount, idem_key) values (p_world, uid, p_purpose, p_amount, p_key);
  return public.econ_state(p_world);
end $$;

-- Pengeluaran dari tabungan bersama HARUS disetujui pemain lain (pengaju tidak bisa menyetujui sendiri)
create or replace function public.family_respond(p_world uuid, p_req uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r family_requests; fw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select * into r from family_requests where id = p_req and world_id = p_world for update;
  if not found then raise exception 'Permintaan tidak ditemukan.'; end if;
  if r.status <> 'MENUNGGU' then raise exception 'Permintaan ini sudah diputuskan.'; end if;
  if p_action = 'approve' then
    if uid = r.requested_by then raise exception 'Pengeluaran harus disetujui pemain lain.'; end if;
    select id into fw from wallets where world_id = p_world and kind = 'family';
    perform public._move(p_world, fw, null, r.amount, 'family_spend', uid, null, r.id::text, 'Pengeluaran bersama: ' || r.purpose);
    update family_requests set status = 'DISETUJUI', decided_at = now() where id = r.id;
  elsif p_action = 'reject' then
    if uid = r.requested_by then raise exception 'Gunakan Batalkan untuk permintaanmu sendiri.'; end if;
    update family_requests set status = 'DITOLAK', decided_at = now() where id = r.id;
  elsif p_action = 'cancel' then
    if uid <> r.requested_by then raise exception 'Hanya pengaju yang dapat membatalkan.'; end if;
    update family_requests set status = 'DIBATALKAN', decided_at = now() where id = r.id;
  else raise exception 'Tindakan tidak dikenal.'; end if;
  return public.econ_state(p_world);
end $$;

-- ===== Pesanan spesial pernikahan (hanya Chapter 6 ke atas, satu per pemain) =====
create or replace function public.biz_special_order(p_world uuid, p_kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r text; ch int; t text; need jsonb;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if p_kind <> 'wedding' then raise exception 'Jenis pesanan tidak dikenal.'; end if;
  select chapter into ch from story_state where world_id = p_world;
  if coalesce(ch, 1) < 6 then raise exception 'Pesanan spesial pernikahan dibuka pada Chapter 6.'; end if;
  select role into r from businesses where world_id = p_world and owner_id = uid;
  if r is null then raise exception 'Usaha belum dibuat.'; end if;
  if r = 'florist' then t := 'Bouquet Pengantin'; need := '{"mawar":4,"lili":3,"pita":2,"kertas":1}'::jsonb;
  else t := 'Dekorasi Motor Pengantin'; need := '{"oli":1,"filter":1,"rantai":1,"busi":1}'::jsonb; end if;
  if exists (select 1 from business_orders where world_id = p_world and owner_id = uid and title = t) then return public.econ_state(p_world); end if;
  insert into business_orders (world_id, owner_id, title, need, reward) values (p_world, uid, t, need, 80);
  return public.econ_state(p_world);
end $$;

-- ===== Keputusan host (menggantikan versi 004): 7 keputusan, berurutan, hanya sekali =====
create or replace function public.story_decide(p_world uuid, p_key text, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st story_state; req text; nxt int; prev text; ok boolean := false;
begin
  if not exists (select 1 from worlds where id = p_world and host_id = auth.uid()) then
    raise exception 'Hanya host yang boleh menentukan pilihan cerita.'; end if;
  if p_key = 'intro_night' and p_choice in ('cafe','taman','alun') then req := 'ch1:done'; nxt := 2; prev := null; ok := true;
  elsif p_key = 'first_outing' and p_choice in ('taman','alun','sekolah') then req := 'ch2:done'; nxt := 3; prev := 'intro_night'; ok := true;
  elsif p_key = 'festival_meet' and p_choice in ('alun','taman','sekolah') then req := 'ch3:done'; nxt := 4; prev := 'first_outing'; ok := true;
  elsif p_key = 'couple_ritual' and p_choice in ('makan_malam','jalan_pagi','kelas_malam') then req := 'ch4:done'; nxt := 5; prev := 'festival_meet'; ok := true;
  elsif p_key = 'proposal_place' and p_choice in ('taman','alun','sekolah','kafe') then req := 'ch5:done'; nxt := 6; prev := 'couple_ritual'; ok := true;
  elsif p_key = 'wedding_venue' and p_choice in ('taman','alun','sekolah') then req := 'engaged'; nxt := 6; prev := 'proposal_place'; ok := true;
  elsif p_key = 'first_home_wish' and p_choice in ('dekat_taman','dekat_alun','dekat_sekolah') then req := 'ch6:done'; nxt := 7; prev := 'wedding_venue'; ok := true;
  end if;
  if not ok then raise exception 'Pilihan tidak valid.'; end if;
  if not exists (select 1 from story_flags where world_id = p_world and user_id = auth.uid() and flag = req) then
    raise exception 'Tahap cerita ini belum selesai.'; end if;
  insert into story_state (world_id) values (p_world) on conflict do nothing;
  select * into st from story_state where world_id = p_world for update;
  if prev is not null and not (st.decisions ? prev) then raise exception 'Selesaikan keputusan sebelumnya dulu.'; end if;
  if st.decisions ? p_key then raise exception 'Keputusan ini sudah ditetapkan.'; end if;
  update story_state set decisions = decisions || jsonb_build_object(p_key, p_choice), chapter = greatest(chapter, nxt), updated_at = now()
    where world_id = p_world returning * into st;
  insert into activity_logs (world_id, actor_id, event, detail)
    values (p_world, auth.uid(), 'story_decision', jsonb_build_object('key', p_key, 'choice', p_choice));
  return st.decisions;
end $$;

-- ===== State ekonomi (versi 004 + tabungan bersama + pesanan spesial) =====
create or replace function public.econ_state(p_world uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); mine uuid[];
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select coalesce(array_agg(id), '{}') into mine from wallets where world_id = p_world and (owner_id = uid or kind = 'family');
  return jsonb_build_object(
    'uid', uid,
    'gifts', jsonb_build_object(
      'sent', (select count(*) from financial_transactions t where t.world_id = p_world and t.kind = 'gift' and t.from_wallet = any(mine)),
      'received', (select count(*) from financial_transactions t where t.world_id = p_world and t.kind = 'gift' and t.to_wallet = any(mine))),
    'wallets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'owner_id', owner_id, 'biz_role', biz_role, 'balance', balance))
        from wallets where world_id = p_world and (kind in ('business','family') or owner_id = uid)), '[]'::jsonb),
    'businesses', coalesce((select jsonb_agg(jsonb_build_object('owner_id', owner_id, 'role', role, 'level', level, 'reputation', reputation))
        from businesses where world_id = p_world), '[]'::jsonb),
    'inventory', coalesce((select jsonb_agg(jsonb_build_object('item', item, 'qty', qty)) from business_inventory
        where world_id = p_world and owner_id = uid and qty > 0), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'need', need, 'reward', reward) order by created_at)
        from business_orders where world_id = p_world and owner_id = uid and status = 'terbuka'), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(x order by x->>'at' desc) from (
        select jsonb_build_object('id', t.id, 'kind', t.kind, 'amount', t.amount, 'memo', t.memo, 'at', t.created_at,
               'from', t.from_wallet, 'to', t.to_wallet) as x
        from financial_transactions t
        where t.world_id = p_world and (t.from_wallet = any(mine) or t.to_wallet = any(mine))
        order by t.created_at desc limit 30) s), '[]'::jsonb),
    'loans', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'lender', lender_id, 'borrower', borrower_id, 'principal', principal,
        'interest', interest_pct, 'n', n_installments, 'total', total_due, 'paid_count', paid_count, 'paid_total', paid_total,
        'purpose', purpose, 'status', status, 'offered_by', offered_by) order by created_at desc)
        from loan_contracts where world_id = p_world and (lender_id = uid or borrower_id = uid)), '[]'::jsonb),
    'family', jsonb_build_object(
      'wallet', (select jsonb_build_object('id', w.id, 'balance', w.balance) from wallets w where w.world_id = p_world and w.kind = 'family'),
      'in_total', coalesce((select sum(t.amount) from financial_transactions t join wallets w on w.id = t.to_wallet where t.world_id = p_world and w.kind = 'family' and t.kind = 'family_in'), 0),
      'in_mine', coalesce((select sum(t.amount) from financial_transactions t join wallets w on w.id = t.to_wallet where t.world_id = p_world and w.kind = 'family' and t.kind = 'family_in' and t.actor_id = uid), 0),
      'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'purpose', r.purpose, 'amount', r.amount, 'status', r.status, 'by', r.requested_by) order by r.created_at desc)
        from family_requests r where r.world_id = p_world), '[]'::jsonb)),
    'specials', coalesce((select jsonb_agg(distinct o.title) from business_orders o where o.world_id = p_world and o.owner_id = uid and o.status = 'selesai'
        and o.title in ('Bouquet Pengantin','Dekorasi Motor Pengantin')), '[]'::jsonb),
    'reset', (select jsonb_build_object('id', r.id, 'requested_by', r.requested_by, 'expires_at', r.expires_at,
        'status', case when r.status = 'menunggu' and r.expires_at < now() then 'kedaluwarsa' else r.status end,
        'approvals', coalesce((select jsonb_agg(a.user_id) from world_reset_approvals a where a.request_id = r.id and a.approved), '[]'::jsonb))
        from world_reset_requests r where r.world_id = p_world order by r.created_at desc limit 1)
  );
end $$;

-- ===== Reset dunia (versi 003 + hapus permintaan tabungan) =====
create or replace function public.reset_respond(p_world uuid, p_request uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r world_reset_requests; n_ok int; n_mem int;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select * into r from world_reset_requests where id = p_request and world_id = p_world for update;
  if not found then raise exception 'Permintaan reset tidak ditemukan.'; end if;
  if r.status <> 'menunggu' then raise exception 'Permintaan ini sudah tidak aktif.'; end if;
  if r.expires_at < now() then
    update world_reset_requests set status = 'kedaluwarsa' where id = r.id;
    return public.econ_state(p_world);
  end if;
  if not p_approve then
    update world_reset_requests set status = 'ditolak' where id = r.id;
    insert into activity_logs (world_id, actor_id, event, detail) values (p_world, uid, 'reset_rejected', jsonb_build_object('request', r.id));
    return public.econ_state(p_world);
  end if;
  if uid = r.requested_by then raise exception 'Kamu sudah menyetujui. Menunggu pemain kedua.'; end if;
  insert into world_reset_approvals (request_id, user_id, approved) values (r.id, uid, true)
    on conflict (request_id, user_id) do update set approved = true;
  select count(*) into n_ok from world_reset_approvals where request_id = r.id and approved;
  select count(*) into n_mem from world_members where world_id = p_world;
  if n_mem = 2 and n_ok = 2 then
    -- Cadangan sebelum menghapus
    insert into world_snapshots (world_id, reason, data) values (p_world, 'sebelum_reset', jsonb_build_object(
      'wallets', coalesce((select jsonb_agg(to_jsonb(w)) from wallets w where world_id = p_world), '[]'::jsonb),
      'businesses', coalesce((select jsonb_agg(to_jsonb(b)) from businesses b where world_id = p_world), '[]'::jsonb),
      'loans', coalesce((select jsonb_agg(to_jsonb(l)) from loan_contracts l where world_id = p_world), '[]'::jsonb),
      'ledger', coalesce((select jsonb_agg(to_jsonb(t)) from financial_transactions t where world_id = p_world), '[]'::jsonb),
      'story_state', (select to_jsonb(s) from story_state s where world_id = p_world),
      'story_flags', coalesce((select jsonb_agg(to_jsonb(f)) from story_flags f where world_id = p_world), '[]'::jsonb)));
    delete from financial_transactions where world_id = p_world;
    delete from business_orders where world_id = p_world;
    delete from business_inventory where world_id = p_world;
    delete from loan_contracts where world_id = p_world;
    delete from family_requests where world_id = p_world;
    delete from wallets where world_id = p_world;
    delete from businesses where world_id = p_world;
    delete from story_flags where world_id = p_world;
    update story_state set chapter = 1, decisions = '{}', updated_at = now() where world_id = p_world;
    update character_states set x = 0, y = 0, updated_at = now() where world_id = p_world;
    update world_reset_requests set status = 'dijalankan', executed_at = now() where id = r.id;
    insert into activity_logs (world_id, actor_id, event, detail) values (p_world, uid, 'world_reset', jsonb_build_object('request', r.id));
  end if;
  return public.econ_state(p_world);
end $$;

revoke all on function public.family_open(uuid), public.family_contribute(uuid, bigint, text), public.family_propose(uuid, text, bigint, text),
  public.family_respond(uuid, uuid, text), public.biz_special_order(uuid, text), public.story_decide(uuid, text, text),
  public.econ_state(uuid), public.reset_respond(uuid, uuid, boolean) from public, anon;
grant execute on function public.family_open(uuid), public.family_contribute(uuid, bigint, text), public.family_propose(uuid, text, bigint, text),
  public.family_respond(uuid, uuid, text), public.biz_special_order(uuid, text), public.story_decide(uuid, text, text),
  public.econ_state(uuid), public.reset_respond(uuid, uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.family_requests;
