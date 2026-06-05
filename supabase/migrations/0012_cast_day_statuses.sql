-- ============================================================================
-- Phase 3: CastDayStatus — persisted DOOD OVERRIDES only (derived merged on read).
-- ============================================================================
create table public.cast_day_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  date date not null,
  status text not null check (status in ('work','hold','start','finish','travel','drop','pickup','idle')),
  source text not null default 'override' check (source in ('override')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, date)
);
create index cast_day_statuses_project_id_idx on public.cast_day_statuses(project_id);
create index cast_day_statuses_person_id_idx on public.cast_day_statuses(person_id);
alter table public.cast_day_statuses enable row level security;
create policy "cast_day_statuses - select" on public.cast_day_statuses for select using (exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid()));
create policy "cast_day_statuses - insert" on public.cast_day_statuses for insert with check (
  exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_statuses.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_statuses - update" on public.cast_day_statuses for update using (
  exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_statuses.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_statuses - delete" on public.cast_day_statuses for delete using (exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.cast_day_statuses to authenticated;
create trigger cast_day_statuses_set_updated_at before update on public.cast_day_statuses for each row execute function extensions.moddatetime(updated_at);
