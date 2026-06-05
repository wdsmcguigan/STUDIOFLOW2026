-- ============================================================================
-- Phase 3: ShootDay (per-unit, optional date) + Strip (scene/day_break/banner).
-- ============================================================================
create table public.shoot_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date,
  day_type text not null default 'shoot' check (day_type in ('prep','prelight','build','shoot','strike','travel','wrap')),
  unit text not null default 'main' check (unit in ('main','second','splinter')),
  studio_or_location text check (studio_or_location in ('studio','location')),
  ordinal int not null default 0,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.strips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  ordinal int not null default 0,
  type text not null default 'scene' check (type in ('scene','day_break','banner')),
  scene_segment_id uuid references public.scene_segments(id) on delete cascade,
  banner_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shoot_days_project_id_idx on public.shoot_days(project_id);
create index shoot_days_date_idx on public.shoot_days(date);
create index strips_project_id_idx on public.strips(project_id);
create index strips_shoot_day_id_idx on public.strips(shoot_day_id);
create index strips_scene_segment_id_idx on public.strips(scene_segment_id);

alter table public.shoot_days enable row level security;
alter table public.strips enable row level security;

-- shoot_days: project-scoped 4 policies
create policy "shoot_days - select" on public.shoot_days for select using (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
create policy "shoot_days - insert" on public.shoot_days for insert with check (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
create policy "shoot_days - update" on public.shoot_days for update using (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
create policy "shoot_days - delete" on public.shoot_days for delete using (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));

-- strips: BOTH shoot_day_id and scene_segment_id (when present) must belong to the caller.
create policy "strips - select" on public.strips for select using (exists (select 1 from public.projects p where p.id = strips.project_id and p.owner_id = auth.uid()));
create policy "strips - insert" on public.strips for insert with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = strips.shoot_day_id and p.owner_id = auth.uid())
  and (scene_segment_id is null or exists (select 1 from public.scene_segments sg join public.projects p2 on p2.id = sg.project_id where sg.id = strips.scene_segment_id and p2.owner_id = auth.uid())));
create policy "strips - update" on public.strips for update using (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = strips.shoot_day_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = strips.shoot_day_id and p.owner_id = auth.uid())
  and (scene_segment_id is null or exists (select 1 from public.scene_segments sg join public.projects p2 on p2.id = sg.project_id where sg.id = strips.scene_segment_id and p2.owner_id = auth.uid())));
create policy "strips - delete" on public.strips for delete using (exists (select 1 from public.projects p where p.id = strips.project_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.shoot_days to authenticated;
grant select, insert, update, delete on public.strips to authenticated;

create trigger shoot_days_set_updated_at before update on public.shoot_days for each row execute function extensions.moddatetime(updated_at);
create trigger strips_set_updated_at before update on public.strips for each row execute function extensions.moddatetime(updated_at);
