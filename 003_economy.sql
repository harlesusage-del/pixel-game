-- PIXEL LIFE — Migrasi 003: ekonomi, bisnis, pinjaman antarpemain, reset dunia persetujuan ganda
-- Jalankan SETELAH 001 dan 002. Semua perubahan uang terjadi di server (fungsi security definer).
-- Mata uang fiktif: Koin Kota (KC). Tidak ada uang sungguhan.

-- ===================== TABEL =====================
create table public.businesses (
  world_id uuid not null references public.worlds(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  role text not null check (role in ('florist','mechanic')),
  level int not null default 1 check (level between 1 and 3),
  reputation int not null default 0,
  primary key (world_id, owner_id)
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  kind text not null check (kind in ('personal','business')),
  owner_id uuid not null references auth.users(id),
  biz_role text check (biz_role in ('florist','mechanic')),
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (world_id, owner_id, kind)
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  kind text not null,
  from_wallet uuid references public.wallets(id) on delete set null,
  to_wallet uuid references public.wallets(id) on delete set null,
  amount bigint not null check (amount > 0),
  actor_id uuid references auth.users(id),
  ref text,
  memo text,
  idem_key text,
  status text not null default 'selesai',
  created_at timestamptz not null default now(),
  unique (world_id, actor_id, idem_key)
);
create index on public.financial_transactions (world_id, created_at desc);

create table public.business_inventory (
  world_id uuid not null references public.worlds(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  item text not null,
  qty int not null default 0 check (qty >= 0),
  primary key (world_id, owner_id, item)
);

create table public.business_orders (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  title text not null,
  need jsonb not null,
  reward bigint not null check (reward > 0),
  status text not null default 'terbuka' check (status in ('terbuka','selesai')),
  created_at timestamptz not null default now()
);
create index on public.business_orders (world_id, owner_id, status);

create table public.loan_contracts (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  lender_id uuid not null references auth.users(id),
  borrower_id uuid not null references auth.users(id),
  principal bigint not null check (principal > 0),
  interest_pct numeric(5,2) not null check (interest_pct between 0 and 50),
  n_installments int not null check (n_installments between 1 and 24),
  total_due bigint not null check (total_due > 0),
  paid_count int not null default 0,
  paid_total bigint not null default 0,
  purpose text not null default 'lainnya',
  status text not null check (status in ('MENUNGGU_PERSETUJUAN','MENAWAR','AKTIF','LUNAS','DITOLAK','DIBATALKAN')),
  offered_by uuid not null references auth.users(id),
  idem_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lender_id <> borrower_id),
  unique (world_id, borrower_id, idem_key)
);
create index on public.loan_contracts (world_id, status);

create table public.world_reset_requests (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  status text not null default 'menunggu' check (status in ('menunggu','dijalankan','ditolak','kedaluwarsa')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);
create unique index one_active_reset on public.world_reset_requests (world_id) where status = 'menunggu';

create table public.world_reset_approvals (
  request_id uuid not null references public.world_reset_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  approved boolean not null,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create table public.world_snapshots (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  reason text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ===================== RLS: klien hanya boleh MEMBACA =====================
alter table public.businesses enable row level security;
alter table public.wallets enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.business_inventory enable row level security;
alter table public.business_orders enable row level security;
alter table public.loan_contracts enable row level security;
alter table public.world_reset_requests enable row level security;
alter table public.world_reset_approvals enable row level security;
alter table public.world_snapshots enable row level security; -- tanpa policy: tidak bisa dibaca klien

revoke insert, update, delete on public.businesses, public.wallets, public.financial_transactions, public.business_inventory,
  public.business_orders, public.loan_contracts, public.world_reset_requests, public.world_reset_approvals, public.world_snapshots
  from anon, authenticated;

create policy biz_read on public.businesses for select to authenticated using (public.is_world_member(world_id));
create policy wallets_read on public.wallets for select to authenticated
  using (public.is_world_member(world_id) and (kind = 'business' or owner_id = auth.uid()));
create policy ledger_read on public.financial_transactions for select to authenticated
  using (public.is_world_member(world_id) and (
    from_wallet in (select id from public.wallets where owner_id = auth.uid()) or
    to_wallet in (select id from public.wallets where owner_id = auth.uid())));
create policy inv_read on public.business_inventory for select to authenticated using (owner_id = auth.uid() and public.is_world_member(world_id));
create policy orders_read on public.business_orders for select to authenticated using (owner_id = auth.uid() and public.is_world_member(world_id));
create policy loans_read on public.loan_contracts for select to authenticated
  using (public.is_world_member(world_id) and (lender_id = auth.uid() or borrower_id = auth.uid()));
create policy reset_read on public.world_reset_requests for select to authenticated using (public.is_world_member(world_id));
create policy reset_appr_read on public.world_reset_approvals for select to authenticated
  using (exists (select 1 from public.world_reset_requests r where r.id = request_id and public.is_world_member(r.world_id)));

-- ===================== FUNGSI INTERNAL (tidak bisa dipanggil klien) =====================
create or replace function public._other_member(p_world uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from world_members where world_id = p_world and user_id <> auth.uid() limit 1;
$$;

create or replace function public._dup(p_world uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_key is not null and exists (select 1 from financial_transactions
    where world_id = p_world and actor_id = auth.uid() and idem_key = p_key);
$$;

-- Satu-satunya pintu perubahan saldo. p_from / p_to boleh null (null = sistem kota / pemasok).
create or replace function public._move(p_world uuid, p_from uuid, p_to uuid, p_amt bigint, p_kind text,
  p_actor uuid, p_key text, p_ref text, p_memo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if p_amt is null or p_amt <= 0 then raise exception 'Jumlah harus lebih dari 0.'; end if;
  perform 1 from wallets where id in (p_from, p_to) and world_id = p_world order by id for update;
  if p_from is not null then
    update wallets set balance = balance - p_amt, updated_at = now()
      where id = p_from and world_id = p_world and balance >= p_amt;
    if not found then raise exception 'Saldo tidak mencukupi.'; end if;
  end if;
  if p_to is not null then
    update wallets set balance = balance + p_amt, updated_at = now() where id = p_to and world_id = p_world;
    if not found then raise exception 'Dompet tujuan belum siap.'; end if;
  end if;
  insert into financial_transactions (world_id, kind, from_wallet, to_wallet, amount, actor_id, ref, memo, idem_key)
    values (p_world, p_kind, p_from, p_to, p_amt, p_actor, p_ref, p_memo, p_key) returning id into tid;
  return tid;
end $$;

create or replace function public._catalog(p_role text)
returns jsonb language sql immutable as $$
  select case p_role
    when 'florist' then '{"mawar":{"name":"Mawar","price":8},"tulip":{"name":"Tulip","price":7},"lili":{"name":"Lili","price":10},"pita":{"name":"Pita","price":4},"kertas":{"name":"Kertas pembungkus","price":5}}'::jsonb
    else '{"busi":{"name":"Busi","price":9},"kampas":{"name":"Kampas rem","price":14},"rantai":{"name":"Rantai","price":18},"oli":{"name":"Oli mesin","price":10},"filter":{"name":"Filter udara","price":12}}'::jsonb
  end;
$$;

create or replace function public._templates(p_role text)
returns jsonb language sql immutable as $$
  select case p_role
    when 'florist' then '[{"title":"Bouquet Sederhana","need":{"mawar":3,"pita":1,"kertas":1},"reward":75},{"title":"Bouquet Tulip Ceria","need":{"tulip":4,"pita":1,"kertas":1},"reward":85},{"title":"Bouquet Lili Elegan","need":{"lili":3,"mawar":2,"pita":2,"kertas":1},"reward":130}]'::jsonb
    else '[{"title":"Ganti Oli","need":{"oli":1,"filter":1},"reward":60},{"title":"Servis Rem","need":{"kampas":2},"reward":75},{"title":"Ganti Rantai dan Busi","need":{"rantai":1,"busi":2,"oli":1},"reward":110}]'::jsonb
  end;
$$;

revoke all on function public._other_member(uuid), public._dup(uuid, text),
  public._move(uuid, uuid, uuid, bigint, text, uuid, text, text, text),
  public._catalog(text), public._templates(text) from public, anon, authenticated;

-- ===================== STATE UNTUK KLIEN =====================
create or replace function public.econ_state(p_world uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); mine uuid[];
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select coalesce(array_agg(id), '{}') into mine from wallets where world_id = p_world and owner_id = uid;
  return jsonb_build_object(
    'uid', uid,
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

-- Muat progres cerita (menggantikan versi 002: ditambah 'epoch' = jumlah reset yang sudah dijalankan)
create or replace function public.story_load(p_world uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st story_state; fl jsonb; ep int;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  insert into story_state (world_id) values (p_world) on conflict do nothing;
  select * into st from story_state where world_id = p_world;
  select coalesce(jsonb_agg(flag), '[]'::jsonb) into fl from story_flags where world_id = p_world and user_id = auth.uid();
  select count(*) into ep from world_reset_requests where world_id = p_world and status = 'dijalankan';
  return jsonb_build_object('chapter', st.chapter, 'decisions', st.decisions, 'flags', fl, 'epoch', ep);
end $$;

-- ===================== EKONOMI & BISNIS =====================
create or replace function public.econ_init(p_world uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r text; pw uuid; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  perform pg_advisory_xact_lock(hashtext(p_world::text || uid::text));
  select character_role into r from world_members where world_id = p_world and user_id = uid;
  insert into businesses (world_id, owner_id, role) values (p_world, uid, r) on conflict do nothing;
  if not exists (select 1 from wallets where world_id = p_world and owner_id = uid and kind = 'personal') then
    insert into wallets (world_id, kind, owner_id) values (p_world, 'personal', uid) returning id into pw;
    perform public._move(p_world, null, pw, 500, 'seed', uid, null, null, 'Modal awal pribadi');
  end if;
  if not exists (select 1 from wallets where world_id = p_world and owner_id = uid and kind = 'business') then
    insert into wallets (world_id, kind, owner_id, biz_role) values (p_world, 'business', uid, r) returning id into bw;
    perform public._move(p_world, null, bw, 300, 'seed', uid, null, null, 'Modal awal usaha');
  end if;
  return public.econ_state(p_world);
end $$;

create or replace function public.econ_transfer(p_world uuid, p_dir text, p_amount bigint, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pw uuid; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if public._dup(p_world, p_key) then return public.econ_state(p_world); end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then raise exception 'Jumlah tidak valid.'; end if;
  select id into pw from wallets where world_id = p_world and owner_id = uid and kind = 'personal';
  select id into bw from wallets where world_id = p_world and owner_id = uid and kind = 'business';
  if pw is null or bw is null then raise exception 'Dompet belum siap.'; end if;
  if p_dir = 'fund' then perform public._move(p_world, pw, bw, p_amount, 'fund_business', uid, p_key, null, 'Modal pribadi ke usaha');
  elsif p_dir = 'withdraw' then perform public._move(p_world, bw, pw, p_amount, 'withdraw', uid, p_key, null, 'Tarik keuntungan usaha');
  else raise exception 'Arah transfer tidak valid.'; end if;
  return public.econ_state(p_world);
end $$;

create or replace function public.biz_new_order(p_world uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r text; lvl int; open_ct int; maxo int; t jsonb; rw bigint;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select role, level into r, lvl from businesses where world_id = p_world and owner_id = uid;
  if r is null then raise exception 'Usaha belum dibuat.'; end if;
  select count(*) into open_ct from business_orders where world_id = p_world and owner_id = uid and status = 'terbuka';
  maxo := least(5, 2 + lvl);
  if open_ct >= maxo then raise exception 'Pesanan terbuka sudah penuh (maks. %). Selesaikan dulu.', maxo; end if;
  t := public._templates(r) -> (floor(random() * 3))::int;
  rw := round((t->>'reward')::numeric * (1 + 0.25 * (lvl - 1)));
  insert into business_orders (world_id, owner_id, title, need, reward) values (p_world, uid, t->>'title', t->'need', rw);
  return public.econ_state(p_world);
end $$;

create or replace function public.biz_buy(p_world uuid, p_item text, p_qty int, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r text; cat jsonb; price int; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if public._dup(p_world, p_key) then return public.econ_state(p_world); end if;
  select role into r from businesses where world_id = p_world and owner_id = uid;
  if r is null then raise exception 'Usaha belum dibuat.'; end if;
  cat := public._catalog(r);
  if p_item is null or not (cat ? p_item) then raise exception 'Barang tidak dikenal.'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 50 then raise exception 'Jumlah harus 1 sampai 50.'; end if;
  price := (cat -> p_item ->> 'price')::int;
  select id into bw from wallets where world_id = p_world and owner_id = uid and kind = 'business';
  perform public._move(p_world, bw, null, (price * p_qty)::bigint, 'buy_stock', uid, p_key, p_item,
    'Beli ' || p_qty || ' x ' || (cat -> p_item ->> 'name'));
  insert into business_inventory (world_id, owner_id, item, qty) values (p_world, uid, p_item, p_qty)
    on conflict (world_id, owner_id, item) do update set qty = business_inventory.qty + excluded.qty;
  return public.econ_state(p_world);
end $$;

create or replace function public.biz_fulfill(p_world uuid, p_order uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o business_orders; rec record; have int; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select * into o from business_orders where id = p_order and world_id = p_world and owner_id = uid for update;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  if o.status <> 'terbuka' then return public.econ_state(p_world); end if;
  for rec in select key, value from jsonb_each_text(o.need) loop
    select qty into have from business_inventory where world_id = p_world and owner_id = uid and item = rec.key;
    if coalesce(have, 0) < rec.value::int then
      raise exception 'Stok % kurang (butuh %, ada %).', rec.key, rec.value, coalesce(have, 0); end if;
  end loop;
  for rec in select key, value from jsonb_each_text(o.need) loop
    update business_inventory set qty = qty - rec.value::int where world_id = p_world and owner_id = uid and item = rec.key;
  end loop;
  select id into bw from wallets where world_id = p_world and owner_id = uid and kind = 'business';
  perform public._move(p_world, null, bw, o.reward, 'sale', uid, p_key, o.id::text, 'Pesanan: ' || o.title);
  update business_orders set status = 'selesai' where id = o.id;
  update businesses set reputation = reputation + 1 where world_id = p_world and owner_id = uid;
  return public.econ_state(p_world);
end $$;

create or replace function public.biz_upgrade(p_world uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lvl int; cost bigint; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if public._dup(p_world, p_key) then return public.econ_state(p_world); end if;
  select level into lvl from businesses where world_id = p_world and owner_id = uid for update;
  if lvl is null then raise exception 'Usaha belum dibuat.'; end if;
  if lvl >= 3 then raise exception 'Usaha sudah di level tertinggi.'; end if;
  cost := case lvl when 1 then 250 else 500 end;
  select id into bw from wallets where world_id = p_world and owner_id = uid and kind = 'business';
  perform public._move(p_world, bw, null, cost, 'upgrade', uid, p_key, null, 'Upgrade usaha ke level ' || (lvl + 1));
  update businesses set level = lvl + 1 where world_id = p_world and owner_id = uid;
  return public.econ_state(p_world);
end $$;

-- ===================== PINJAMAN ANTARPEMAIN =====================
create or replace function public.loan_request(p_world uuid, p_principal bigint, p_interest numeric, p_n int, p_purpose text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lender uuid; cnt int; total bigint;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if p_key is not null and exists (select 1 from loan_contracts where world_id = p_world and borrower_id = uid and idem_key = p_key) then
    return public.econ_state(p_world); end if;
  lender := public._other_member(p_world);
  if lender is null then raise exception 'Pemain kedua belum bergabung.'; end if;
  if p_principal is null or p_principal < 1 or p_principal > 100000 then raise exception 'Jumlah pinjaman 1 sampai 100.000.'; end if;
  if p_interest is null or p_interest < 0 or p_interest > 50 then raise exception 'Bunga harus 0 sampai 50 persen.'; end if;
  if p_n is null or p_n < 1 or p_n > 24 then raise exception 'Cicilan harus 1 sampai 24 kali.'; end if;
  if p_purpose is null or p_purpose not in ('modal_bisnis','pembelian_bahan','upgrade','rumah','keluarga','lainnya') then
    raise exception 'Tujuan pinjaman tidak valid.'; end if;
  select count(*) into cnt from loan_contracts where world_id = p_world and borrower_id = uid
    and status in ('MENUNGGU_PERSETUJUAN','MENAWAR','AKTIF');
  if cnt >= 3 then raise exception 'Terlalu banyak pinjaman berjalan (maks. 3).'; end if;
  total := p_principal + round(p_principal * p_interest / 100)::bigint;
  insert into loan_contracts (world_id, lender_id, borrower_id, principal, interest_pct, n_installments, total_due, purpose, status, offered_by, idem_key)
    values (p_world, lender, uid, p_principal, p_interest, p_n, total, p_purpose, 'MENUNGGU_PERSETUJUAN', uid, p_key);
  return public.econ_state(p_world);
end $$;

create or replace function public.loan_respond(p_world uuid, p_loan uuid, p_action text,
  p_principal bigint default null, p_interest numeric default null, p_n int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l loan_contracts; lw uuid; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  select * into l from loan_contracts where id = p_loan and world_id = p_world for update;
  if not found then raise exception 'Kontrak tidak ditemukan.'; end if;
  if uid not in (l.lender_id, l.borrower_id) then raise exception 'Bukan pihak dalam kontrak ini.'; end if;

  if p_action in ('approve', 'accept') then
    if not ((p_action = 'approve' and uid = l.lender_id and l.status = 'MENUNGGU_PERSETUJUAN')
         or (p_action = 'accept' and uid = l.borrower_id and l.status = 'MENAWAR')) then
      raise exception 'Tindakan ini tidak tersedia untuk status kontrak saat ini.'; end if;
    select id into lw from wallets where world_id = p_world and owner_id = l.lender_id and kind = 'personal';
    select id into bw from wallets where world_id = p_world and owner_id = l.borrower_id and kind = 'personal';
    perform public._move(p_world, lw, bw, l.principal, 'loan_disburse', uid, null, l.id::text, 'Pencairan pinjaman');
    update loan_contracts set status = 'AKTIF', updated_at = now() where id = l.id;
  elsif p_action = 'reject' then
    if not ((uid = l.lender_id and l.status = 'MENUNGGU_PERSETUJUAN') or (uid = l.borrower_id and l.status = 'MENAWAR')) then
      raise exception 'Tindakan ini tidak tersedia untuk status kontrak saat ini.'; end if;
    update loan_contracts set status = 'DITOLAK', updated_at = now() where id = l.id;
  elsif p_action = 'cancel' then
    if not (uid = l.borrower_id and l.status in ('MENUNGGU_PERSETUJUAN','MENAWAR')) then
      raise exception 'Hanya peminjam yang dapat membatalkan permintaan yang belum aktif.'; end if;
    update loan_contracts set status = 'DIBATALKAN', updated_at = now() where id = l.id;
  elsif p_action = 'counter' then
    if not (uid = l.lender_id and l.status = 'MENUNGGU_PERSETUJUAN') then raise exception 'Tawaran ulang tidak tersedia.'; end if;
    if p_principal is null or p_principal < 1 or p_principal > 100000 then raise exception 'Jumlah pinjaman 1 sampai 100.000.'; end if;
    if p_interest is null or p_interest < 0 or p_interest > 50 then raise exception 'Bunga harus 0 sampai 50 persen.'; end if;
    if p_n is null or p_n < 1 or p_n > 24 then raise exception 'Cicilan harus 1 sampai 24 kali.'; end if;
    update loan_contracts set principal = p_principal, interest_pct = p_interest, n_installments = p_n,
      total_due = p_principal + round(p_principal * p_interest / 100)::bigint, status = 'MENAWAR', offered_by = uid, updated_at = now()
      where id = l.id;
  else raise exception 'Tindakan tidak dikenal.'; end if;
  return public.econ_state(p_world);
end $$;

create or replace function public.loan_pay(p_world uuid, p_loan uuid, p_mode text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l loan_contracts; base bigint; remaining bigint; amt bigint; lw uuid; bw uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if public._dup(p_world, p_key) then return public.econ_state(p_world); end if;
  select * into l from loan_contracts where id = p_loan and world_id = p_world for update;
  if not found then raise exception 'Kontrak tidak ditemukan.'; end if;
  if uid <> l.borrower_id then raise exception 'Hanya peminjam yang membayar cicilan.'; end if;
  if l.status <> 'AKTIF' then raise exception 'Pinjaman tidak aktif.'; end if;
  base := l.total_due / l.n_installments;
  remaining := l.total_due - l.paid_total;
  if p_mode = 'all' then amt := remaining;
  elsif p_mode = 'next' then amt := case when l.paid_count + 1 >= l.n_installments then remaining else base end;
  else raise exception 'Mode pembayaran tidak valid.'; end if;
  if amt <= 0 then raise exception 'Tidak ada tagihan.'; end if;
  select id into bw from wallets where world_id = p_world and owner_id = l.borrower_id and kind = 'personal';
  select id into lw from wallets where world_id = p_world and owner_id = l.lender_id and kind = 'personal';
  perform public._move(p_world, bw, lw, amt, 'loan_payment', uid, p_key, l.id::text, 'Pembayaran pinjaman');
  update loan_contracts set paid_total = paid_total + amt,
    paid_count = case when p_mode = 'all' then n_installments else paid_count + 1 end,
    status = case when paid_total + amt >= total_due then 'LUNAS' else status end, updated_at = now()
    where id = l.id;
  return public.econ_state(p_world);
end $$;

-- ===================== RESET DUNIA (PERSETUJUAN GANDA) =====================
create or replace function public.reset_request(p_world uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); rid uuid;
begin
  if not public.is_world_member(p_world) then raise exception 'Bukan anggota dunia ini.'; end if;
  if (select count(*) from world_members where world_id = p_world) < 2 then
    raise exception 'Reset memerlukan persetujuan kedua pemain; pemain kedua belum bergabung.'; end if;
  update world_reset_requests set status = 'kedaluwarsa' where world_id = p_world and status = 'menunggu' and expires_at < now();
  begin
    insert into world_reset_requests (world_id, requested_by) values (p_world, uid) returning id into rid;
  exception when unique_violation then
    raise exception 'Sudah ada permintaan reset yang masih aktif.';
  end;
  insert into world_reset_approvals (request_id, user_id, approved) values (rid, uid, true);
  insert into activity_logs (world_id, actor_id, event, detail) values (p_world, uid, 'reset_requested', jsonb_build_object('request', rid));
  return public.econ_state(p_world);
end $$;

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

revoke all on function public.econ_state(uuid), public.story_load(uuid), public.econ_init(uuid),
  public.econ_transfer(uuid, text, bigint, text), public.biz_new_order(uuid), public.biz_buy(uuid, text, int, text),
  public.biz_fulfill(uuid, uuid, text), public.biz_upgrade(uuid, text),
  public.loan_request(uuid, bigint, numeric, int, text, text), public.loan_respond(uuid, uuid, text, bigint, numeric, int),
  public.loan_pay(uuid, uuid, text, text), public.reset_request(uuid), public.reset_respond(uuid, uuid, boolean)
  from public, anon;
grant execute on function public.econ_state(uuid), public.story_load(uuid), public.econ_init(uuid),
  public.econ_transfer(uuid, text, bigint, text), public.biz_new_order(uuid), public.biz_buy(uuid, text, int, text),
  public.biz_fulfill(uuid, uuid, text), public.biz_upgrade(uuid, text),
  public.loan_request(uuid, bigint, numeric, int, text, text), public.loan_respond(uuid, uuid, text, bigint, numeric, int),
  public.loan_pay(uuid, uuid, text, text), public.reset_request(uuid), public.reset_respond(uuid, uuid, boolean)
  to authenticated;

-- ===================== REALTIME =====================
alter publication supabase_realtime add table public.wallets, public.loan_contracts,
  public.business_orders, public.world_reset_requests;
