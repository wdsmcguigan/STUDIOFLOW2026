-- ============================================================================
-- Phase 2: jobs — the source of truth for the async queue panel. WDK mirrors
-- its run state into this row. Project-scoped, owner-RLS.
-- ============================================================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('breakdown','import')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  progress int not null default 0,
  total int,
  completed int,
  params jsonb not null default '{}',
  result jsonb,
  error text,
  workflow_run_id text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_project_id_idx on public.jobs(project_id);
create index jobs_status_idx on public.jobs(status);

alter table public.jobs enable row level security;
create policy "jobs - select" on public.jobs for select using (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
create policy "jobs - insert" on public.jobs for insert with check (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
create policy "jobs - update" on public.jobs for update using (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
create policy "jobs - delete" on public.jobs for delete using (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.jobs to authenticated;
create trigger jobs_set_updated_at before update on public.jobs for each row execute function extensions.moddatetime(updated_at);
