alter table public.written_requests
  add column if not exists ai_response text null,
  add column if not exists ai_sent_at timestamptz null;
