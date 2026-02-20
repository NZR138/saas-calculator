create extension if not exists pgcrypto;

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
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz null
);

alter table public.written_requests
  add column if not exists guest_email text null,
  add column if not exists stripe_session_id text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists paid boolean not null default false,
  alter column created_at set default now(),
  alter column status set default 'awaiting_payment';

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

alter table public.written_requests enable row level security;
alter table public.payments enable row level security;

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
