alter table public.written_requests
  add column if not exists payment_intent_id text null,
  add column if not exists calculator_snapshot jsonb null,
  add column if not exists calculator_results jsonb null,
  add column if not exists paid_at timestamptz null,
  add column if not exists stripe_session_id text null,
  add column if not exists guest_email text null,
  add column if not exists question_1 text not null default '',
  add column if not exists question_2 text not null default '',
  add column if not exists question_3 text not null default '';

alter table public.written_requests
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
