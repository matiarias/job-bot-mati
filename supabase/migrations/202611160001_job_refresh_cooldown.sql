create table public.job_refresh_gate (
  singleton boolean primary key default true check (singleton),
  next_allowed_at timestamptz not null
);

alter table public.job_refresh_gate enable row level security;
revoke all on table public.job_refresh_gate from public, anon, authenticated, service_role;
grant select, insert, update on table public.job_refresh_gate to service_role;

create function public.claim_job_refresh()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with claim as (
    insert into public.job_refresh_gate (singleton, next_allowed_at)
    values (true, statement_timestamp() + interval '2 minutes')
    on conflict (singleton) do update
      set next_allowed_at = excluded.next_allowed_at
      where public.job_refresh_gate.next_allowed_at <= statement_timestamp()
    returning 1
  )
  select exists (select 1 from claim);
$$;

revoke all on function public.claim_job_refresh() from public, anon, authenticated;
grant execute on function public.claim_job_refresh() to service_role;
