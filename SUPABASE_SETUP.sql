-- ===============================================
-- Supabase SQL for UK Profit Calculator
-- ===============================================
-- This file creates the snapshots table with RLS policies
-- to store authenticated user calculation snapshots.
--
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create snapshots table
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

-- 3. Enable Row Level Security
alter table public.snapshots enable row level security;

-- 4. Create RLS policies
do $$
begin
  -- Policy: Users can insert only their own snapshots
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

  -- Policy: Users can select only their own snapshots
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

-- 5. Optional: Add index for faster queries by user_id
create index if not exists idx_snapshots_user_id on public.snapshots(user_id);

-- 6. Optional: Add index for sorting by created_at
create index if not exists idx_snapshots_created_at on public.snapshots(created_at desc);
