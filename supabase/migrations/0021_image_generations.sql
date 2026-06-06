-- ============================================================================
-- 0021: Storyboard — image_generations ledger (append-only; no UPDATE policy).
-- Tracks AI image generation events for cost accounting and usage display.
-- Owner-only RLS (project-scoped select + insert; NO update/delete policy).
-- ============================================================================

create table public.image_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  kind text not null check (kind in ('decompose','render','reference')),
  model text not null,
  image_count int not null default 0,
  est_cost numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index image_generations_project_created_idx on public.image_generations(project_id, created_at);
alter table public.image_generations enable row level security;
create policy "imggen - select" on public.image_generations for select using (exists (select 1 from public.projects p where p.id = image_generations.project_id and p.owner_id = auth.uid()));
create policy "imggen - insert" on public.image_generations for insert with check (exists (select 1 from public.projects p where p.id = image_generations.project_id and p.owner_id = auth.uid()));
-- NO "imggen - update" policy: append-only ledger (like cost_entries).
-- NO "imggen - delete" policy: records are immutable once written.
grant select, insert on public.image_generations to authenticated;  -- NOT update, NOT delete
