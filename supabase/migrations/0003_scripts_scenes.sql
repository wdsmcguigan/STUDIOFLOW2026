-- ============================================================================
-- Phase 1: Script import & Scene model.
-- Everything project-scoped under RLS, mirroring Phase 0's owner-based access
-- (a row is visible/writable when its owning project's owner_id = auth.uid()).
-- ============================================================================

-- updated_at auto-bump (resolves the 0001 NOTE / Phase 0 carry-forward #2).
create extension if not exists moddatetime schema extensions;

-- revisions: the FDX-style revision-set model (White -> ... -> Tan), one active set.
create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color text not null,
  ordinal int not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- scripts: one per screenplay in a project (a project may have several, e.g. episodes).
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- script_versions: immutable snapshot of an imported draft (raw source preserved).
create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  label text not null,
  source_format text not null default 'fountain'
    check (source_format in ('fountain')), -- 'fdx' added in Phase 1.5
  raw_source text not null,
  revision_id uuid references public.revisions(id) on delete set null,
  locked boolean not null default false,
  imported_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

-- scenes: stable, project-scoped, immutable id decoupled from mutable scene_number.
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  ordinal int not null,
  scene_number text,
  number_locked boolean not null default false,
  int_ext text check (int_ext in ('INT', 'EXT', 'INT/EXT')),
  location_slug text,
  time_of_day text,
  synopsis text,
  page_eighths int,
  script_day text,
  status text not null default 'active' check (status in ('active', 'omitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- scene_sources: links a Scene to the version(s) it appeared in + where (for reconciliation).
create table public.scene_sources (
  scene_id uuid not null references public.scenes(id) on delete cascade,
  script_version_id uuid not null references public.script_versions(id) on delete cascade,
  content_hash text not null,
  text_anchor_start int not null,
  text_anchor_end int not null,
  primary key (scene_id, script_version_id)
);

-- scene_revision_changes: per-scene "changed in revision set X" tracking.
create table public.scene_revision_changes (
  scene_id uuid not null references public.scenes(id) on delete cascade,
  revision_id uuid not null references public.revisions(id) on delete cascade,
  change_kind text not null check (change_kind in ('added', 'modified', 'omitted')),
  created_at timestamptz not null default now(),
  primary key (scene_id, revision_id)
);

-- Indexes on FKs + ordinal hot paths.
create index revisions_project_id_idx on public.revisions(project_id);
create index scripts_project_id_idx on public.scripts(project_id);
create index script_versions_script_id_idx on public.script_versions(script_id);
create index scenes_project_id_idx on public.scenes(project_id);
create index scenes_script_id_idx on public.scenes(script_id);
create index scenes_script_id_ordinal_idx on public.scenes(script_id, ordinal);
create index scene_sources_script_version_id_idx on public.scene_sources(script_version_id);
create index scene_revision_changes_revision_id_idx on public.scene_revision_changes(revision_id);

-- Fold-in #1: index projects.owner_id so policy subqueries don't seq-scan.
create index projects_owner_id_idx on public.projects(owner_id);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.revisions enable row level security;
alter table public.scripts enable row level security;
alter table public.script_versions enable row level security;
alter table public.scenes enable row level security;
alter table public.scene_sources enable row level security;
alter table public.scene_revision_changes enable row level security;

-- revisions: project-scoped.
create policy "revisions - select" on public.revisions
  for select using (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );
create policy "revisions - insert" on public.revisions
  for insert with check (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );
create policy "revisions - update" on public.revisions
  for update using (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );
create policy "revisions - delete" on public.revisions
  for delete using (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );

-- scripts: project-scoped.
create policy "scripts - select" on public.scripts
  for select using (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );
create policy "scripts - insert" on public.scripts
  for insert with check (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );
create policy "scripts - update" on public.scripts
  for update using (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );
create policy "scripts - delete" on public.scripts
  for delete using (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );

-- script_versions: scoped via the owning script's project.
create policy "script_versions - select" on public.script_versions
  for select using (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );
create policy "script_versions - insert" on public.script_versions
  for insert with check (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );
create policy "script_versions - update" on public.script_versions
  for update using (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );
create policy "script_versions - delete" on public.script_versions
  for delete using (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );

-- scenes: project-scoped.
create policy "scenes - select" on public.scenes
  for select using (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );
create policy "scenes - insert" on public.scenes
  for insert with check (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );
create policy "scenes - update" on public.scenes
  for update using (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );
create policy "scenes - delete" on public.scenes
  for delete using (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );

-- scene_sources: scoped via the owning scene's project.
create policy "scene_sources - select" on public.scene_sources
  for select using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_sources - insert" on public.scene_sources
  for insert with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_sources - update" on public.scene_sources
  for update using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_sources - delete" on public.scene_sources
  for delete using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );

-- scene_revision_changes: scoped via the owning scene's project.
create policy "scene_revision_changes - select" on public.scene_revision_changes
  for select using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_revision_changes - insert" on public.scene_revision_changes
  for insert with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_revision_changes - update" on public.scene_revision_changes
  for update using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_revision_changes - delete" on public.scene_revision_changes
  for delete using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Grants: signed-in users only; RLS policies above gate every row.
-- ============================================================================
grant select, insert, update, delete on public.revisions to authenticated;
grant select, insert, update, delete on public.scripts to authenticated;
grant select, insert, update, delete on public.script_versions to authenticated;
grant select, insert, update, delete on public.scenes to authenticated;
grant select, insert, update, delete on public.scene_sources to authenticated;
grant select, insert, update, delete on public.scene_revision_changes to authenticated;

-- ============================================================================
-- Fold-in #2: updated_at auto-bump triggers via moddatetime.
-- Covers scenes (first UPDATE-heavy table in Phase 1) and resolves the 0001
-- NOTE by also covering projects.
-- ============================================================================
create trigger scenes_set_updated_at
  before update on public.scenes
  for each row execute function extensions.moddatetime(updated_at);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function extensions.moddatetime(updated_at);
