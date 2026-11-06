begin;

create table public.jobs (
  id text primary key check (length(id) > 0),
  company text not null,
  title text not null,
  location text not null,
  contract text not null,
  salary text not null,
  skills text[] not null default '{}',
  published_on date not null,
  description text not null,
  matches text[] not null default '{}',
  questions text[] not null default '{}'
);

alter table public.jobs enable row level security;
revoke all on table public.jobs from public, anon, authenticated;
grant select on table public.jobs to anon, authenticated;

create policy "Anyone can read the jobs catalog"
on public.jobs for select to anon, authenticated
using (true);

commit;
