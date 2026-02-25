alter table public.written_requests
  drop column if exists admin_email_sent_at;
