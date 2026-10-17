-- ============================================================================
-- Fundly.id - Tabungan Emas (gold_holdings)
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan berulang (idempotent).
-- Isi yang sama juga ada di server/schema.sql bagian 10.
-- ============================================================================

create table if not exists public.gold_holdings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  -- antam | ubs | galeri24 | digital | lainnya
  brand           text not null default 'antam',
  grams           numeric(12, 4) not null,
  -- Total harga beli dalam Rupiah (bilangan bulat)
  purchase_price  bigint not null,
  purchase_date   date not null default current_date,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint gold_holdings_grams_positive check (grams > 0 and grams <= 100000),
  constraint gold_holdings_price_valid check (purchase_price >= 0),
  constraint gold_holdings_brand_valid check (brand in ('antam', 'ubs', 'galeri24', 'digital', 'lainnya')),
  constraint gold_holdings_note_length check (note is null or char_length(note) <= 120)
);

create index if not exists gold_holdings_user_date_idx on public.gold_holdings (user_id, purchase_date desc);

drop trigger if exists update_gold_holdings_updated_at on public.gold_holdings;
create trigger update_gold_holdings_updated_at
  before update on public.gold_holdings
  for each row execute function public.update_updated_at();

alter table public.gold_holdings enable row level security;

drop policy if exists "gold_select_own" on public.gold_holdings;
drop policy if exists "gold_insert_own" on public.gold_holdings;
drop policy if exists "gold_update_own" on public.gold_holdings;
drop policy if exists "gold_delete_own" on public.gold_holdings;
create policy "gold_select_own" on public.gold_holdings for select to authenticated using ((select auth.uid()) = user_id);
create policy "gold_insert_own" on public.gold_holdings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "gold_update_own" on public.gold_holdings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "gold_delete_own" on public.gold_holdings for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.gold_holdings to authenticated;

-- Realtime: perubahan langsung muncul di semua perangkat
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gold_holdings'
  ) then
    alter publication supabase_realtime add table public.gold_holdings;
  end if;
end $$;
