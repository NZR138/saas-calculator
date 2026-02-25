-- v1 stable baseline schema snapshot
-- Generated: 2026-02-25
-- Source: repository SQL files (SUPABASE_SETUP.sql, supabase/*.sql)
-- Purpose: recovery reference before V2 architecture changes

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =====================================================
-- TABLE: public.snapshots
-- =====================================================
create table if not exists public.snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  revenue numeric,
  total_costs numeric,
  vat numeric,
  net_profit numeric,
  margin numeric,
  roas numeric,
  created_at timestamptz default now()
);

create index if not exists idx_snapshots_user_id on public.snapshots(user_id);
create index if not exists idx_snapshots_created_at on public.snapshots(created_at desc);

alter table public.snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'snapshots'
      and policyname = 'Snapshots insert own'
  ) then
    create policy "Snapshots insert own"
      on public.snapshots
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'snapshots'
      and policyname = 'Snapshots select own'
  ) then
    create policy "Snapshots select own"
      on public.snapshots
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- =====================================================
-- TABLE: public.written_requests
-- =====================================================
create table if not exists public.written_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text not null,
  guest_email text null,
  question_1 text not null,
  question_2 text not null,
  question_3 text not null,
  status text not null default 'awaiting_payment',
  stripe_session_id text null,
  stripe_payment_intent_id text null,
  payment_intent_id text null,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz null,
  calculator_snapshot jsonb null,
  calculator_results jsonb null
);

alter table public.written_requests
  add column if not exists guest_email text null,
  add column if not exists stripe_session_id text null,
  add column if not exists payment_intent_id text null,
  add column if not exists paid boolean not null default false,
  add column if not exists paid_at timestamptz null,
  add column if not exists calculator_snapshot jsonb null,
  add column if not exists calculator_results jsonb null,
  add column if not exists question_1 text not null default '',
  add column if not exists question_2 text not null default '',
  add column if not exists question_3 text not null default '';

alter table public.written_requests
  alter column created_at set default now(),
  alter column status set default 'draft';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'written_requests_status_check'
  ) then
    alter table public.written_requests
      add constraint written_requests_status_check
      check (status in ('draft', 'awaiting_payment', 'paid'));
  end if;
end $$;

-- Optional cleanup script present in repo:
-- alter table public.written_requests drop column if exists stripe_payment_intent_id;
-- alter table public.written_requests drop column if exists admin_email_sent_at;

alter table public.written_requests enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'written_requests'
      and policyname = 'Written requests select own'
  ) then
    create policy "Written requests select own"
      on public.written_requests
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'written_requests'
      and policyname = 'Written requests insert own'
  ) then
    create policy "Written requests insert own"
      on public.written_requests
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

-- =====================================================
-- TABLE: public.payments
-- =====================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  written_request_id uuid not null references public.written_requests(id) on delete cascade,
  stripe_payment_intent_id text not null,
  amount numeric not null,
  currency text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_stripe_payment_intent_id_key
  on public.payments (stripe_payment_intent_id);

alter table public.payments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'Payments select own'
  ) then
    create policy "Payments select own"
      on public.payments
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'Payments insert own'
  ) then
    create policy "Payments insert own"
      on public.payments
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;
