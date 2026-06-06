-- ============================================================================
-- 0020: Storyboard — shots + shot_frames tables
-- scene_owned_by / shot_owned_by helpers for two-FK RLS with-checks.
-- scene_owned_by is defined first (only depends on public.scenes).
-- shot_owned_by is defined after public.shots is created (it references it).
-- ============================================================================

create or replace function public.scene_owned_by(p_scene_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.scenes s join public.projects p on p.id = s.project_id
    where s.id = p_scene_id and p.owner_id = p_user_id);
$$;
grant execute on function public.scene_owned_by(uuid, uuid) to authenticated;

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  ordinal int not null,
  shot_number text,
  size text check (size in ('EWS','WS','MW','MS','MCU','CU','ECU')),
  angle text check (angle in ('eye','low','high','overhead','aerial','dutch')),
  movement text check (movement in ('static','pan','tilt','push_in','pull_out','zoom','arc','dolly','crane','handheld')),
  lens text,
  action text,
  status text not null default 'suggested' check (status in ('suggested','confirmed','rejected')),
  provenance text not null default 'ai' check (provenance in ('ai','manual')),
  text_anchor jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shots_scene_ordinal_idx on public.shots(scene_id, ordinal);
create index shots_project_id_idx on public.shots(project_id);
alter table public.shots enable row level security;
create policy "shots - select" on public.shots for select using (exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid()));
create policy "shots - insert" on public.shots for insert with check (
  exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid())
  and public.scene_owned_by(scene_id, auth.uid()));
create policy "shots - update" on public.shots for update using (exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid())) with check (
  exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid())
  and public.scene_owned_by(scene_id, auth.uid()));
create policy "shots - delete" on public.shots for delete using (exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.shots to authenticated;
create trigger shots_set_updated_at before update on public.shots for each row execute function extensions.moddatetime(updated_at);

-- shot_owned_by is defined after public.shots exists (it references that table).
create or replace function public.shot_owned_by(p_shot_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.shots s join public.projects p on p.id = s.project_id
    where s.id = p_shot_id and p.owner_id = p_user_id);
$$;
grant execute on function public.shot_owned_by(uuid, uuid) to authenticated;

create table public.shot_frames (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shot_id uuid not null references public.shots(id) on delete cascade,
  image_path text not null,
  source text not null default 'ai' check (source in ('ai','upload')),
  status text not null default 'suggested' check (status in ('suggested','selected','rejected')),
  is_selected boolean not null default false,
  ordinal int not null default 0,
  prompt_used text,
  generation_metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shot_frames_shot_ordinal_idx on public.shot_frames(shot_id, ordinal);
create unique index shot_frames_one_selected on public.shot_frames(shot_id) where is_selected;
alter table public.shot_frames enable row level security;
create policy "frames - select" on public.shot_frames for select using (exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid()));
create policy "frames - insert" on public.shot_frames for insert with check (
  exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid())
  and public.shot_owned_by(shot_id, auth.uid()));
create policy "frames - update" on public.shot_frames for update using (exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid())) with check (
  exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid())
  and public.shot_owned_by(shot_id, auth.uid()));
create policy "frames - delete" on public.shot_frames for delete using (exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.shot_frames to authenticated;
create trigger frames_set_updated_at before update on public.shot_frames for each row execute function extensions.moddatetime(updated_at);
