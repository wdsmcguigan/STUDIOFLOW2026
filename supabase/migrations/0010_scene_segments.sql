-- ============================================================================
-- Phase 3: SceneSegment — the schedulable unit (eighths). Default = full scene.
-- ============================================================================
create table public.scene_segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  ordinal int not null default 0,
  page_eighths int not null default 0,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scene_segments_project_id_idx on public.scene_segments(project_id);
create index scene_segments_scene_id_idx on public.scene_segments(scene_id);

alter table public.scene_segments enable row level security;
create policy "scene_segments - select" on public.scene_segments for select using (exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid()));
create policy "scene_segments - insert" on public.scene_segments for insert with check (
  exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.scenes sc join public.projects p2 on p2.id = sc.project_id where sc.id = scene_segments.scene_id and p2.owner_id = auth.uid()));
create policy "scene_segments - update" on public.scene_segments for update using (
  exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.scenes sc join public.projects p2 on p2.id = sc.project_id where sc.id = scene_segments.scene_id and p2.owner_id = auth.uid()));
create policy "scene_segments - delete" on public.scene_segments for delete using (exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.scene_segments to authenticated;
create trigger scene_segments_set_updated_at before update on public.scene_segments for each row execute function extensions.moddatetime(updated_at);
