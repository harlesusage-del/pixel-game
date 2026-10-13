-- PIXEL LIFE — Migrasi 004: hadiah antarpemain, batas penanda cerita lebih besar, keputusan host untuk 3 chapter
-- Jalankan SETELAH 001, 002, 003. Aman dijalankan sekali saja (semua memakai create or replace).

-- Batas penanda progres per pemain dinaikkan (cerita kini lebih panjang)
create or replace function public.story_flag(p_world uuid, p_flag text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if p_flag is null or p_flag !~ '^[a-z0-9:_-]{1,40}$' then raise exception 'Penanda tidak valid.'; end if;
  if (select count(*) from story_flags where world_id = p_world and user_id = auth.uid()) >= 600 then
    raise exception 'Batas penanda tercapai.'; end if;
  insert into story_flags (world_id, user_id, flag) values (p_world, auth.uid(), p_flag) on conflict do nothing;
end $$;

-- Keputusan cerita (HANYA host, hanya setelah chapter terkait selesai, hanya pilihan sah, hanya sekali)
create or replace function public.story_decide(p_world uuid, p_key text, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st story_state; req text; nxt int; ok boolean := false;
begin
  if not exists (select 1 from worlds where id = p_world and host_id = auth.uid()) then
    raise exception 'Hanya host yang boleh menentukan pilihan cerita.'; end if;
  if p_key = 'intro_night' and p_choice in ('cafe','taman','alun') then req := 'ch1:done'; nxt := 2; ok := true;
  elsif p_key = 'first_outing' and p_choice in ('taman','alun','sekolah') then req := 'ch2:done'; nxt := 3; ok := true;
  elsif p_key = 'festival_meet' and p_choice in ('alun','taman','sekolah') then req := 'ch3:done'; nxt := 4; ok := true;
  end if;
  if not ok then raise exception 'Pilihan tidak valid.'; end if;
  if not exists (select 1 from story_flags where world_id = p_world and user_id = auth.uid() and flag = req) then
    raise exception 'Chapter ini belum selesai.'; end if;
  insert into story_state (world_id) values (p_world) on conflict do nothing;
  select * into st from story_state where world_id = p_world for update;
  if st.decisions ? p_key then raise exception 'Keputusan ini sudah ditetapkan.'; end if;
  update story_state set decisions = decisions || jsonb_build_object(p_key, p_choice), chapter = greatest(chapter, nxt), updated_at = now()
    where world_id = p_world returning * into st;
  insert into activity_logs (world_id, actor_id, event, detail)
    values (p_world, auth.uid(), 'story_decision', jsonb_build_object('key', p_key, 'choice', p_choice));
  return st.decisions;
end $$;

-- Hadiah antarpemain (sukarela, dari uang pribadi pengirim ke uang pribadi pasangan, maks. 1.000 KC per hadiah)
create or replace function public.econ_gift(p_world uuid, p_amount bigint, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); partner uuid; pw uuid; tw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if public._dup(p_world, p_key) then return public.econ_state(p_world); end if;
  partner := public._other_member(p_world);
  if partner is null then raise exception 'Pemain kedua belum bergabung.'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000 then raise exception 'Hadiah 1 sampai 1.000 KC.'; end if;
  select id into pw from wallets where world_id = p_world and owner_id = uid and kind = 'personal';
  select id into tw from wallets where world_id = p_world and owner_id = partner and kind = 'personal';
  if pw is null or tw is null then raise exception 'Dompet belum siap.'; end if;
  perform public._move(p_world, pw, tw, p_amount, 'gift', uid, p_key, null, 'Hadiah untuk pasangan');
  return public.econ_state(p_world);
end $$;

-- State ekonomi (versi 003 ditambah penghitung hadiah)
create or replace function public.econ_state(p_world uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); mine uuid[];
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select coalesce(array_agg(id), '{}') into mine from wallets where world_id = p_world and owner_id = uid;
  return jsonb_build_object(
    'uid', uid,
    'gifts', jsonb_build_object(
      'sent', (select count(*) from financial_transactions t where t.world_id = p_world and t.kind = 'gift' and t.from_wallet = any(mine)),
      'received', (select count(*) from financial_transactions t where t.world_id = p_world and t.kind = 'gift' and t.to_wallet = any(mine))),
    'wallets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'owner_id', owner_id, 'biz_role', biz_role, 'balance', balance))
        from wallets where world_id = p_world and (kind = 'business' or owner_id = uid)), '[]'::jsonb),
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
    'reset', (select jsonb_build_object('id', r.id, 'requested_by', r.requested_by, 'expires_at', r.expires_at,
        'status', case when r.status = 'menunggu' and r.expires_at < now() then 'kedaluwarsa' else r.status end,
        'approvals', coalesce((select jsonb_agg(a.user_id) from world_reset_approvals a where a.request_id = r.id and a.approved), '[]'::jsonb))
        from world_reset_requests r where r.world_id = p_world order by r.created_at desc limit 1)
  );
end $$;

revoke all on function public.story_flag(uuid, text), public.story_decide(uuid, text, text), public.econ_gift(uuid, bigint, text), public.econ_state(uuid) from public, anon;
grant execute on function public.story_flag(uuid, text), public.story_decide(uuid, text, text), public.econ_gift(uuid, bigint, text), public.econ_state(uuid) to authenticated;
