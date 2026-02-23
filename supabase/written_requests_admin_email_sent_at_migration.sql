alter table public.written_requests
  add column if not exists admin_email_sent_at timestamptz null;
