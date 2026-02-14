create extension if not exists "uuid-ossp";

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
