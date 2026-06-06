-- ============================================================================
-- 0019: Visual Development — project visual settings + visual references
-- (the Moodboard seed) + private storyboards Storage bucket. Owner-only RLS.
-- Also widens jobs.type for the new storyboard job kinds.
-- ============================================================================

-- One reusable same-project helper for cross-entity FK with-checks this phase.
create or replace function public.character_owned_by(p_character_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.characters c join public.projects p on p.id = c.project_id
    where c.id = p_character_id and p.owner_id = p_user_id);
$$;
create or replace function public.location_owned_by(p_location_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.locations l join public.projects p on p.id = l.project_id
    where l.id = p_location_id and p.owner_id = p_user_id);
$$;
grant execute on function public.character_owned_by(uuid, uuid) to authenticated;
grant execute on function public.location_owned_by(uuid, uuid) to authenticated;

-- project_visual_settings: one row per project (lazy get-or-create).
create table public.project_visual_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  style_preset text not null default 'storyboard_sketch'
    check (style_preset in ('storyboard_sketch','graphic_novel_ink','photoreal_cinematic','rough_pencil')),
  custom_style_prompt text,
  aspect_ratio text not null default '16:9' check (aspect_ratio in ('16:9','2.39:1','4:3','1:1')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_visual_settings enable row level security;
create policy "pvs - select" on public.project_visual_settings for select using (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
create policy "pvs - insert" on public.project_visual_settings for insert with check (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
create policy "pvs - update" on public.project_visual_settings for update using (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
create policy "pvs - delete" on public.project_visual_settings for delete using (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.project_visual_settings to authenticated;
create trigger pvs_set_updated_at before update on public.project_visual_settings for each row execute function extensions.moddatetime(updated_at);

-- visual_references: lockable character sheet / location plate.
create table public.visual_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_type text not null check (subject_type in ('character','location')),
  character_id uuid references public.characters(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  image_path text,
  source text not null default 'ai' check (source in ('ai','upload')),
  status text not null default 'suggested' check (status in ('suggested','locked','rejected')),
  is_primary boolean not null default false,
  prompt_used text,
  generation_metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vr_one_subject check (
    (subject_type = 'character' and character_id is not null and location_id is null) or
    (subject_type = 'location'  and location_id  is not null and character_id is null)
  )
);
create index visual_references_project_id_idx on public.visual_references(project_id);
create index visual_references_character_id_idx on public.visual_references(character_id);
create index visual_references_location_id_idx on public.visual_references(location_id);
create unique index vr_one_primary_character on public.visual_references(character_id) where is_primary and character_id is not null;
create unique index vr_one_primary_location  on public.visual_references(location_id)  where is_primary and location_id  is not null;

alter table public.visual_references enable row level security;
create policy "vr - select" on public.visual_references for select using (exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid()));
create policy "vr - insert" on public.visual_references for insert with check (
  exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid())
  and (character_id is null or public.character_owned_by(character_id, auth.uid()))
  and (location_id  is null or public.location_owned_by(location_id,  auth.uid()))
);
create policy "vr - update" on public.visual_references for update using (exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid())) with check (
  exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid())
  and (character_id is null or public.character_owned_by(character_id, auth.uid()))
  and (location_id  is null or public.location_owned_by(location_id,  auth.uid()))
);
create policy "vr - delete" on public.visual_references for delete using (exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.visual_references to authenticated;
create trigger vr_set_updated_at before update on public.visual_references for each row execute function extensions.moddatetime(updated_at);

-- Private Storage bucket; paths are <project_id>/... so owner-scoping = first folder.
insert into storage.buckets (id, name, public) values ('storyboards', 'storyboards', false)
  on conflict (id) do nothing;
create policy "storyboards - select" on storage.objects for select to authenticated using (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));
create policy "storyboards - insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));
create policy "storyboards - update" on storage.objects for update to authenticated using (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()))
  with check (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));
create policy "storyboards - delete" on storage.objects for delete to authenticated using (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));

-- Widen jobs.type for storyboard kinds (column already exists; replace the CHECK).
alter table public.jobs drop constraint jobs_type_check;
alter table public.jobs add constraint jobs_type_check
  check (type in ('breakdown','import','storyboard_render','storyboard_reference'));
