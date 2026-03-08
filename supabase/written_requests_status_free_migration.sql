do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'written_requests_status_check'
  ) then
    alter table public.written_requests
      drop constraint written_requests_status_check;
  end if;

  alter table public.written_requests
    add constraint written_requests_status_check
    check (status in ('draft', 'free', 'awaiting_payment', 'paid'));
end $$;
