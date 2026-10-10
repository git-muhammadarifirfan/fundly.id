-- ============================================================================
-- Fundly.id — Production Database Schema (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Jalankan SELURUH file ini di Supabase Dashboard -> SQL Editor -> Run.
-- Script ini IDEMPOTENT: aman dijalankan berulang kali, dan aman dijalankan
-- di atas skema lama (sql/001_create_all_tables.sql / versi schema.sql lama).
--
-- Konvensi:
--   * Semua nominal uang disimpan dalam RUPIAH UTUH (BIGINT, tanpa sen).
--   * Saldo akun (accounts.balance) dikelola OTOMATIS oleh trigger transaksi.
--     Jangan update saldo manual dari aplikasi kecuali untuk penyesuaian saldo.
--   * Semua tabel milik user dilindungi Row Level Security (RLS).
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 PROFILES -----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  currency    text not null default 'IDR',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1.2 ACCOUNTS (Tunai, Bank, E-Wallet, Kartu Kredit) ---------------------------
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('cash', 'bank', 'ewallet', 'credit_card')),
  icon        text not null default 'wallet',
  color       text not null default '#C6E83B',
  balance     bigint not null default 0,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1.3 CATEGORIES -----------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  icon        text not null default 'tag',
  color       text not null default '#6E6E73',
  type        text not null check (type in ('income', 'expense')),
  is_default  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.categories add column if not exists updated_at timestamptz not null default now();

-- 1.4 RECURRING TEMPLATES (Transaksi berulang: gaji, sewa, langganan) ------------
create table if not exists public.recurring_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  type          text not null check (type in ('income', 'expense')),
  amount        bigint not null,
  frequency     text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month  int,
  day_of_week   int,
  start_date    date not null,
  end_date      date,
  is_active     boolean not null default true,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.recurring_templates add column if not exists next_run_date date;
alter table public.recurring_templates add column if not exists last_run_date date;
alter table public.recurring_templates add column if not exists transaction_time time not null default '08:00';
update public.recurring_templates set next_run_date = start_date where next_run_date is null;
alter table public.recurring_templates alter column next_run_date set not null;
alter table public.recurring_templates alter column category_id drop not null;

-- 1.5 TRANSACTIONS ---------------------------------------------------------------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  account_id        uuid not null references public.accounts(id) on delete cascade,
  to_account_id     uuid references public.accounts(id) on delete set null,
  category_id       uuid references public.categories(id) on delete set null,
  recurring_id      uuid references public.recurring_templates(id) on delete set null,
  type              text not null check (type in ('income', 'expense', 'transfer')),
  amount            bigint not null,
  note              text,
  location          text,
  receipt_url       text,
  status            text not null default 'cleared' check (status in ('cleared', 'pending')),
  transaction_date  date not null default current_date,
  transaction_time  time not null default localtime,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.transactions alter column category_id drop not null;

-- 1.6 BUDGETS (limit bulanan per kategori) ---------------------------------------
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  amount_limit  bigint not null,
  month         int not null check (month between 1 and 12),
  year          int not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

-- 1.7 GOALS (Target tabungan) ----------------------------------------------------
create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  category        text not null default 'Tabungan & Keamanan',
  icon            text not null default 'target',
  target_amount   bigint not null,
  current_amount  bigint not null default 0,
  deadline        date,
  color           text not null default '#C6E83B',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.goals add column if not exists category text not null default 'Tabungan & Keamanan';

-- ============================================================================
-- 2. FOREIGN KEY ADJUSTMENTS (untuk database yang dibuat dengan skema lama)
-- ============================================================================
-- Kategori yang dihapus tidak boleh menghapus/memblokir transaksi -> SET NULL.
alter table public.transactions drop constraint if exists transactions_category_id_fkey;
alter table public.transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete set null;

alter table public.recurring_templates drop constraint if exists recurring_templates_category_id_fkey;
alter table public.recurring_templates
  add constraint recurring_templates_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete set null;

-- ============================================================================
-- 3. DATA INTEGRITY CONSTRAINTS (NOT VALID = tidak memvalidasi data lama)
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_amount_positive') then
    alter table public.transactions add constraint transactions_amount_positive check (amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_transfer_shape') then
    alter table public.transactions add constraint transactions_transfer_shape check (
      (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
      or (type <> 'transfer' and to_account_id is null)
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'budgets_limit_positive') then
    alter table public.budgets add constraint budgets_limit_positive check (amount_limit > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'goals_amounts_valid') then
    alter table public.goals add constraint goals_amounts_valid check (target_amount > 0 and current_amount >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_amount_positive') then
    alter table public.recurring_templates add constraint recurring_amount_positive check (amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recurring_dates_valid') then
    alter table public.recurring_templates add constraint recurring_dates_valid check (end_date is null or end_date >= start_date) not valid;
  end if;
end $$;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
create index if not exists idx_accounts_user           on public.accounts(user_id);
create index if not exists idx_categories_user         on public.categories(user_id);
create index if not exists idx_transactions_user_date  on public.transactions(user_id, transaction_date desc, transaction_time desc);
create index if not exists idx_transactions_account    on public.transactions(account_id);
create index if not exists idx_transactions_to_account on public.transactions(to_account_id);
create index if not exists idx_transactions_category   on public.transactions(category_id);
create index if not exists idx_transactions_recurring  on public.transactions(recurring_id);
create index if not exists idx_budgets_user_period     on public.budgets(user_id, year, month);
create index if not exists idx_goals_user              on public.goals(user_id);
create index if not exists idx_recurring_due           on public.recurring_templates(user_id, next_run_date) where is_active;

-- ============================================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================================

-- 5.1 updated_at otomatis ---------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'accounts', 'categories', 'transactions', 'budgets', 'goals', 'recurring_templates']
  loop
    execute format('drop trigger if exists update_%1$s_updated_at on public.%1$I', t);
    execute format(
      'create trigger update_%1$s_updated_at before update on public.%1$I for each row execute function public.update_updated_at()',
      t
    );
  end loop;
end $$;
-- Nama trigger lama dari skema sebelumnya
drop trigger if exists update_recurring_updated_at on public.recurring_templates;

-- 5.2 Validasi transaksi (kepemilikan akun/kategori & bentuk transfer) ------------
create or replace function public.validate_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'Pemilik transaksi tidak dapat diubah';
  end if;

  if not exists (select 1 from accounts a where a.id = new.account_id and a.user_id = new.user_id) then
    raise exception 'Akun sumber tidak valid';
  end if;

  if new.type = 'transfer' then
    if new.to_account_id is null or new.to_account_id = new.account_id then
      raise exception 'Akun tujuan transfer harus berbeda dari akun sumber';
    end if;
    if not exists (select 1 from accounts a where a.id = new.to_account_id and a.user_id = new.user_id) then
      raise exception 'Akun tujuan transfer tidak valid';
    end if;
    new.category_id := null;
  else
    new.to_account_id := null;
    if new.category_id is not null and not exists (
      select 1 from categories c
      where c.id = new.category_id and c.user_id = new.user_id and c.type = new.type
    ) then
      raise exception 'Kategori tidak valid untuk jenis transaksi ini';
    end if;
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Nominal transaksi harus lebih dari 0';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_validate on public.transactions;
create trigger trg_transactions_validate
  before insert or update on public.transactions
  for each row execute function public.validate_transaction();

-- 5.3 Saldo akun otomatis (double-entry ringan) ----------------------------------
-- Hanya transaksi berstatus 'cleared' yang memengaruhi saldo.
create or replace function public.apply_transaction_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lewati update yang tidak memengaruhi saldo (mis. hanya ubah catatan)
  if tg_op = 'UPDATE'
     and old.amount = new.amount
     and old.type = new.type
     and old.account_id = new.account_id
     and old.to_account_id is not distinct from new.to_account_id
     and old.status = new.status then
    return new;
  end if;

  -- Batalkan efek baris lama
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'cleared' then
    if old.type = 'income' then
      update accounts set balance = balance - old.amount where id = old.account_id;
    elsif old.type = 'expense' then
      update accounts set balance = balance + old.amount where id = old.account_id;
    elsif old.type = 'transfer' then
      update accounts set balance = balance + old.amount where id = old.account_id;
      if old.to_account_id is not null then
        update accounts set balance = balance - old.amount where id = old.to_account_id;
      end if;
    end if;
  end if;

  -- Terapkan efek baris baru
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'cleared' then
    if new.type = 'income' then
      update accounts set balance = balance + new.amount where id = new.account_id;
    elsif new.type = 'expense' then
      update accounts set balance = balance - new.amount where id = new.account_id;
    elsif new.type = 'transfer' then
      update accounts set balance = balance - new.amount where id = new.account_id;
      update accounts set balance = balance + new.amount where id = new.to_account_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_transactions_balance on public.transactions;
create trigger trg_transactions_balance
  after insert or update or delete on public.transactions
  for each row execute function public.apply_transaction_balance();

-- 5.4 Validasi template berulang --------------------------------------------------
create or replace function public.validate_recurring_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'Pemilik transaksi berulang tidak dapat diubah';
  end if;
  if not exists (select 1 from accounts a where a.id = new.account_id and a.user_id = new.user_id) then
    raise exception 'Akun tidak valid';
  end if;
  if new.category_id is not null and not exists (
    select 1 from categories c where c.id = new.category_id and c.user_id = new.user_id and c.type = new.type
  ) then
    raise exception 'Kategori tidak valid untuk jenis transaksi ini';
  end if;
  if new.day_of_month is null then
    new.day_of_month := extract(day from new.start_date)::int;
  end if;
  if new.next_run_date is null then
    new.next_run_date := new.start_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recurring_validate on public.recurring_templates;
create trigger trg_recurring_validate
  before insert or update on public.recurring_templates
  for each row execute function public.validate_recurring_template();

-- 5.5 Hitung tanggal berikutnya untuk transaksi berulang -------------------------
create or replace function public.recurring_next_date(p_date date, p_frequency text, p_anchor_day int)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_first date;
  v_last_day int;
  v_anchor int := coalesce(p_anchor_day, extract(day from p_date)::int);
begin
  if p_frequency = 'daily' then
    return p_date + 1;
  elsif p_frequency = 'weekly' then
    return p_date + 7;
  elsif p_frequency = 'monthly' then
    v_first := (date_trunc('month', p_date) + interval '1 month')::date;
  elsif p_frequency = 'yearly' then
    v_first := (date_trunc('month', p_date) + interval '1 year')::date;
  else
    raise exception 'Frekuensi tidak dikenal: %', p_frequency;
  end if;
  v_last_day := extract(day from (v_first + interval '1 month' - interval '1 day'))::int;
  return v_first + (least(v_anchor, v_last_day) - 1);
end;
$$;

-- 5.6 RPC: proses transaksi berulang yang jatuh tempo untuk user saat ini ---------
-- Dipanggil aplikasi saat login/membuka app. p_today = tanggal lokal perangkat.
create or replace function public.process_recurring_transactions(p_today date default current_date)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_date date;
  v_count int := 0;
  v_today date := least(coalesce(p_today, current_date), current_date + 1);
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return 0;
  end if;

  for r in
    select * from recurring_templates
    where user_id = v_uid
      and is_active
      and next_run_date <= v_today
    order by next_run_date
    for update
  loop
    v_date := r.next_run_date;
    while v_date <= v_today
      and (r.end_date is null or v_date <= r.end_date)
      and v_count < 1000
    loop
      insert into transactions (
        user_id, account_id, category_id, recurring_id, type, amount, note,
        status, transaction_date, transaction_time
      ) values (
        r.user_id, r.account_id, r.category_id, r.id, r.type, r.amount, r.note,
        'cleared', v_date, r.transaction_time
      );
      v_count := v_count + 1;
      update recurring_templates set last_run_date = v_date where id = r.id;
      v_date := public.recurring_next_date(v_date, r.frequency, r.day_of_month);
    end loop;

    update recurring_templates
       set next_run_date = v_date,
           is_active = (r.end_date is null or v_date <= r.end_date)
     where id = r.id;
  end loop;

  return v_count;
end;
$$;

-- 5.7 RPC: tambah / tarik dana target tabungan secara atomik ---------------------
create or replace function public.adjust_goal_amount(p_goal_id uuid, p_delta bigint)
returns setof public.goals
language sql
security invoker
set search_path = public
as $$
  update goals
     set current_amount = greatest(0, current_amount + p_delta)
   where id = p_goal_id
     and user_id = auth.uid()
  returning *;
$$;

-- 5.8 Data default user baru (kategori & akun) -----------------------------------
create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from categories where user_id = p_user_id) then
    insert into categories (user_id, name, icon, color, type, is_default, sort_order) values
      (p_user_id, 'Makanan & Minuman',  'utensils',        '#FF6B6B', 'expense', true, 1),
      (p_user_id, 'Transportasi',       'car',             '#45B7D1', 'expense', true, 2),
      (p_user_id, 'Belanja',            'shopping-bag',    '#DDA0DD', 'expense', true, 3),
      (p_user_id, 'Tagihan & Utilitas', 'zap',             '#FF9500', 'expense', true, 4),
      (p_user_id, 'Hiburan',            'gamepad-2',       '#96CEB4', 'expense', true, 5),
      (p_user_id, 'Kesehatan',          'heart-pulse',     '#FF2D55', 'expense', true, 6),
      (p_user_id, 'Pendidikan',         'graduation-cap',  '#5AC8FA', 'expense', true, 7),
      (p_user_id, 'Rumah Tangga',       'house',           '#98D8C8', 'expense', true, 8),
      (p_user_id, 'Langganan',          'repeat',          '#AF52DE', 'expense', true, 9),
      (p_user_id, 'Pinjaman & Cicilan', 'hand-coins',      '#FFB020', 'expense', true, 10),
      (p_user_id, 'Lainnya',            'ellipsis',        '#6E6E73', 'expense', true, 11),
      (p_user_id, 'Gaji',               'briefcase',       '#C6E83B', 'income',  true, 1),
      (p_user_id, 'Freelance',          'laptop',          '#4ECDC4', 'income',  true, 2),
      (p_user_id, 'Bisnis & Penjualan', 'store',           '#96CEB4', 'income',  true, 3),
      (p_user_id, 'Investasi',          'trending-up',     '#45B7D1', 'income',  true, 4),
      (p_user_id, 'Bonus & Hadiah',     'gift',            '#FF9500', 'income',  true, 5),
      (p_user_id, 'Lainnya',            'ellipsis',        '#6E6E73', 'income',  true, 6);
  end if;

  if not exists (select 1 from accounts where user_id = p_user_id) then
    insert into accounts (user_id, name, type, icon, color, balance, sort_order) values
      (p_user_id, 'Tunai (Cash)', 'cash', 'wallet',   '#34C759', 0, 1),
      (p_user_id, 'Bank',         'bank', 'landmark', '#45B7D1', 0, 2);
  end if;
end;
$$;

-- 5.9 Trigger user baru: buat profil + data default ------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;

  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5.10 RPC: pastikan profil & data default ada (untuk user lama) ----------------
create or replace function public.ensure_user_setup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users%rowtype;
begin
  if v_uid is null then
    raise exception 'Tidak terautentikasi';
  end if;

  if not exists (select 1 from profiles where id = v_uid) then
    select * into v_user from auth.users where id = v_uid;
    insert into profiles (id, full_name, avatar_url)
    values (
      v_uid,
      coalesce(nullif(v_user.raw_user_meta_data->>'full_name', ''), nullif(v_user.raw_user_meta_data->>'name', ''), split_part(v_user.email, '@', 1)),
      coalesce(v_user.raw_user_meta_data->>'avatar_url', v_user.raw_user_meta_data->>'picture')
    )
    on conflict (id) do nothing;
  end if;

  perform public.seed_user_defaults(v_uid);
end;
$$;

-- Fungsi internal tidak boleh dipanggil langsung lewat API
revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;
revoke execute on function public.ensure_user_setup() from public, anon;
grant  execute on function public.ensure_user_setup() to authenticated;
revoke execute on function public.process_recurring_transactions(date) from public, anon;
grant  execute on function public.process_recurring_transactions(date) to authenticated;
revoke execute on function public.adjust_goal_amount(uuid, bigint) from public, anon;
grant  execute on function public.adjust_goal_amount(uuid, bigint) to authenticated;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.accounts            enable row level security;
alter table public.categories          enable row level security;
alter table public.transactions        enable row level security;
alter table public.budgets             enable row level security;
alter table public.goals               enable row level security;
alter table public.recurring_templates enable row level security;

-- Hapus semua policy lama pada tabel aplikasi agar tidak ada policy longgar tersisa
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'accounts', 'categories', 'transactions', 'budgets', 'goals', 'recurring_templates')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Profiles
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Accounts
create policy "accounts_select_own" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy "accounts_insert_own" on public.accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "accounts_update_own" on public.accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "accounts_delete_own" on public.accounts for delete to authenticated using ((select auth.uid()) = user_id);

-- Categories
create policy "categories_select_own" on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.categories for delete to authenticated using ((select auth.uid()) = user_id);

-- Transactions
create policy "transactions_select_own" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_insert_own" on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "transactions_update_own" on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_delete_own" on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

-- Budgets (kategori juga harus milik user)
create policy "budgets_select_own" on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "budgets_insert_own" on public.budgets for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
);
create policy "budgets_update_own" on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
);
create policy "budgets_delete_own" on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);

-- Goals
create policy "goals_select_own" on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals for delete to authenticated using ((select auth.uid()) = user_id);

-- Recurring templates
create policy "recurring_select_own" on public.recurring_templates for select to authenticated using ((select auth.uid()) = user_id);
create policy "recurring_insert_own" on public.recurring_templates for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "recurring_update_own" on public.recurring_templates for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "recurring_delete_own" on public.recurring_templates for delete to authenticated using ((select auth.uid()) = user_id);

-- ============================================================================
-- 7. STORAGE (Foto profil)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policy lama (terlalu longgar) dari skema sebelumnya
drop policy if exists "Avatar Images are Public"    on storage.objects;
drop policy if exists "Users can upload avatar"     on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Users can view own receipt"  on storage.objects;
drop policy if exists "Users can upload receipt"    on storage.objects;

drop policy if exists "fundly_avatars_public_read" on storage.objects;
drop policy if exists "fundly_avatars_insert_own"  on storage.objects;
drop policy if exists "fundly_avatars_update_own"  on storage.objects;
drop policy if exists "fundly_avatars_delete_own"  on storage.objects;

-- File avatar wajib berada di folder "<user_id>/..."
create policy "fundly_avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "fundly_avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fundly_avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fundly_avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================================
-- 8. REALTIME (sinkronisasi live antar perangkat/tab)
-- ============================================================================
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['accounts', 'categories', 'transactions', 'budgets', 'goals', 'recurring_templates', 'profiles']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================================
-- 9. BACKFILL: pastikan semua user yang sudah ada punya profil & data default
-- ============================================================================
insert into public.profiles (id, full_name, avatar_url)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
       u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;

do $$
declare
  u record;
begin
  for u in select id from public.profiles loop
    perform public.seed_user_defaults(u.id);
  end loop;
end $$;

-- ============================================================================
-- Catatan: transaksi berulang diproses otomatis oleh aplikasi setiap kali user
-- membuka aplikasi (RPC public.process_recurring_transactions), memakai tanggal
-- lokal perangkat sehingga tidak bergeser karena zona waktu.
-- ============================================================================
