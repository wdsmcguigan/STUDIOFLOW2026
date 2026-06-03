-- ============================================================================
-- Harden RLS on the two composite-FK junction tables (scene_sources,
-- scene_revision_changes) against a cross-project escape.
--
-- 0003's insert/update policies validated ownership only through ONE of each
-- table's two FKs (the scene). A user could therefore link one of their own
-- scenes to a *foreign* script_version_id / revision_id (a UUID belonging to
-- another owner's project) on insert or update. RLS still blocked reading the
-- foreign row, so this was an integrity gap rather than a disclosure — but the
-- write path (apply) uses INSERT, so both insert and update must check both FKs.
--
-- This migration drops and recreates only those four policies with a predicate
-- that requires the *other* FK target to also belong to the caller's project.
-- Policy count per table stays at 4 (select/insert/update/delete unchanged in #).
-- ============================================================================

-- ---- scene_sources: scene_id AND script_version_id must both be owned --------
drop policy "scene_sources - insert" on public.scene_sources;
drop policy "scene_sources - update" on public.scene_sources;

create policy "scene_sources - insert" on public.scene_sources
  for insert with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.script_versions sv
        join public.scripts s on s.id = sv.script_id
        join public.projects p2 on p2.id = s.project_id
      where sv.id = scene_sources.script_version_id and p2.owner_id = auth.uid()
    )
  );

create policy "scene_sources - update" on public.scene_sources
  for update using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.script_versions sv
        join public.scripts s on s.id = sv.script_id
        join public.projects p2 on p2.id = s.project_id
      where sv.id = scene_sources.script_version_id and p2.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.script_versions sv
        join public.scripts s on s.id = sv.script_id
        join public.projects p2 on p2.id = s.project_id
      where sv.id = scene_sources.script_version_id and p2.owner_id = auth.uid()
    )
  );

-- ---- scene_revision_changes: scene_id AND revision_id must both be owned -----
drop policy "scene_revision_changes - insert" on public.scene_revision_changes;
drop policy "scene_revision_changes - update" on public.scene_revision_changes;

create policy "scene_revision_changes - insert" on public.scene_revision_changes
  for insert with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.revisions r join public.projects p2 on p2.id = r.project_id
      where r.id = scene_revision_changes.revision_id and p2.owner_id = auth.uid()
    )
  );

create policy "scene_revision_changes - update" on public.scene_revision_changes
  for update using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.revisions r join public.projects p2 on p2.id = r.project_id
      where r.id = scene_revision_changes.revision_id and p2.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.revisions r join public.projects p2 on p2.id = r.project_id
      where r.id = scene_revision_changes.revision_id and p2.owner_id = auth.uid()
    )
  );
