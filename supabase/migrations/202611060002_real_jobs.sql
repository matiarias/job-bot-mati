begin;

alter table public.jobs
  alter column published_on drop not null,
  add column url text,
  add column source text;

grant select, insert, update on public.jobs to service_role;

commit;
