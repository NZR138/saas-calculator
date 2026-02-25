alter table public.written_requests
  drop column if exists stripe_payment_intent_id;
