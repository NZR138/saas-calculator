alter table public.written_requests
  add column if not exists expected_amount_cents integer;

update public.written_requests
set expected_amount_cents = 3900
where expected_amount_cents is null
  and status in ('draft', 'awaiting_payment');
