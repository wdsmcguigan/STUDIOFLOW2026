-- ============================================================================
-- Phase 2: Scene↔Element and Scene↔Character link (junction) tables.
-- Both FKs validated in insert/update with-check (the 0004 lesson).
-- ============================================================================
create table public.scene_elements (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  element_id uuid not null references public.elements(id) on delete cascade,
  provenance text not null default 'manual' check (provenance in ('manual','auto')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'confirmed' check (status in ('suggested','confirmed','rejected')),
  text_anchor jsonb,
  anchor_state text not null default 'anchored' check (anchor_state in ('anchored','needs_review','orphaned')),
  segment_id uuid, -- null until Phase 3 (SceneSegment)
  quantity int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scene_id, element_id)
);

create table public.scene_characters (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  presence_type text not null check (presence_type in ('speaking','silent_featured','background','voice_only')),
  provenance text not null default 'manual' check (provenance in ('manual','auto')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'confirmed' check (status in ('suggested','confirmed','rejected')),
  text_anchor jsonb,
  anchor_state text not null default 'anchored' check (anchor_state in ('anchored','needs_review','orphaned')),
  segment_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scene_id, character_id)
);

create index scene_elements_scene_id_idx on public.scene_elements(scene_id);
create index scene_elements_element_id_idx on public.scene_elements(element_id);
create index scene_elements_status_idx on public.scene_elements(status);
create index scene_characters_scene_id_idx on public.scene_characters(scene_id);
create index scene_characters_character_id_idx on public.scene_characters(character_id);
create index scene_characters_status_idx on public.scene_characters(status);

alter table public.scene_elements enable row level security;
alter table public.scene_characters enable row level security;

-- scene_elements: BOTH scene_id and element_id must belong to the caller's project.
create policy "scene_elements - select" on public.scene_elements for select using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid()));
create policy "scene_elements - insert" on public.scene_elements for insert with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.elements e join public.projects p2 on p2.id = e.project_id where e.id = scene_elements.element_id and p2.owner_id = auth.uid()));
create policy "scene_elements - update" on public.scene_elements for update using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.elements e join public.projects p2 on p2.id = e.project_id where e.id = scene_elements.element_id and p2.owner_id = auth.uid()));
create policy "scene_elements - delete" on public.scene_elements for delete using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid()));

-- scene_characters: BOTH scene_id and character_id must belong to the caller's project.
create policy "scene_characters - select" on public.scene_characters for select using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid()));
create policy "scene_characters - insert" on public.scene_characters for insert with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.characters ch join public.projects p2 on p2.id = ch.project_id where ch.id = scene_characters.character_id and p2.owner_id = auth.uid()));
create policy "scene_characters - update" on public.scene_characters for update using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.characters ch join public.projects p2 on p2.id = ch.project_id where ch.id = scene_characters.character_id and p2.owner_id = auth.uid()));
create policy "scene_characters - delete" on public.scene_characters for delete using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.scene_elements to authenticated;
grant select, insert, update, delete on public.scene_characters to authenticated;

create trigger scene_elements_set_updated_at before update on public.scene_elements for each row execute function extensions.moddatetime(updated_at);
create trigger scene_characters_set_updated_at before update on public.scene_characters for each row execute function extensions.moddatetime(updated_at);
