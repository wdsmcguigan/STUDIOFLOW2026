-- ============================================================================
-- Phase 3: Location -> Set hierarchy; scenes resolve to a Set.
-- ============================================================================
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  address text,
  geo_lat numeric,
  geo_lng numeric,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scenes add column set_id uuid references public.sets(id) on delete set null;

create index locations_project_id_idx on public.locations(project_id);
create index sets_project_id_idx on public.sets(project_id);
create index sets_location_id_idx on public.sets(location_id);
create index scenes_set_id_idx on public.scenes(set_id);

alter table public.locations enable row level security;
alter table public.sets enable row level security;

-- locations: project-scoped (4 policies)
create policy "locations - select" on public.locations for select using (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
create policy "locations - insert" on public.locations for insert with check (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
create policy "locations - update" on public.locations for update using (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
create policy "locations - delete" on public.locations for delete using (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
-- sets: project-scoped (4 policies)
create policy "sets - select" on public.sets for select using (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));
create policy "sets - insert" on public.sets for insert with check (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));
create policy "sets - update" on public.sets for update using (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));
create policy "sets - delete" on public.sets for delete using (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.sets to authenticated;
create trigger locations_set_updated_at before update on public.locations for each row execute function extensions.moddatetime(updated_at);
create trigger sets_set_updated_at before update on public.sets for each row execute function extensions.moddatetime(updated_at);

-- Harden the scenes UPDATE policy so set_id must also belong to the caller's project
-- (the 0004 two-FK lesson: scenes.set_id is a new cross-entity FK).
drop policy "scenes - update" on public.scenes;
create policy "scenes - update" on public.scenes for update using (
  exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  and (set_id is null or exists (select 1 from public.sets s join public.projects p2 on p2.id = s.project_id where s.id = scenes.set_id and p2.owner_id = auth.uid()))
);
