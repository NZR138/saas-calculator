create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  request_id text,
  payment_intent_id text,
  session_id text,
  error text
);

create index if not exists stripe_webhook_events_request_id_idx
  on public.stripe_webhook_events (request_id);

alter table public.stripe_webhook_events enable row level security;
