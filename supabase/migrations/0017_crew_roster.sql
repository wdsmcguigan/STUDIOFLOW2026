-- ============================================================================
-- Phase 5: Crew roster (authored).
-- Note: SunCalc reuses the EXISTING locations.geo_lat / geo_lng columns (added
-- in 0009) — no new coordinate columns are introduced (avoid a duplicate source).
-- ============================================================================
create table public.crew_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,   -- optional contact link
  name text not null,
  department text not null default '',
  position text not null default '',
  email text,
  phone text,
  day_rate numeric,                       -- display-only; NO engine reads this
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crew_members_project_id_idx on public.crew_members(project_id);
create index crew_members_person_id_idx on public.crew_members(person_id);

alter table public.crew_members enable row level security;

create policy "crew_members - select" on public.crew_members for select using (exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid()));
create policy "crew_members - insert" on public.crew_members for insert with check (
  exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid())
  and (person_id is null or exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = crew_members.person_id and p2.owner_id = auth.uid())));
create policy "crew_members - update" on public.crew_members for update using (
  exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid())
  and (person_id is null or exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = crew_members.person_id and p2.owner_id = auth.uid())));
create policy "crew_members - delete" on public.crew_members for delete using (exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.crew_members to authenticated;
create trigger crew_members_set_updated_at before update on public.crew_members for each row execute function extensions.moddatetime(updated_at);
