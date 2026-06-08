-- Project lifecycle: Archive + Trash.
--
-- Two orthogonal, nullable timestamps on projects:
--   archived_at — project is shelved (drops out of the main list; workflow `status` is preserved)
--   deleted_at  — project is in Trash (soft-deleted; restorable; purge is a separate hard DELETE)
--
-- Both are set/cleared via UPDATE and hard-purged via DELETE, all of which the existing
-- owner RLS policies (0001_profiles_projects.sql) already authorize. No RLS changes.
-- The updated_at moddatetime trigger already exists (0003_scripts_scenes.sql).

alter table public.projects
  add column archived_at timestamptz,
  add column deleted_at  timestamptz;

-- The dashboard's main ("active") list is owner_id scoped to rows that are neither
-- archived nor trashed — the overwhelmingly common read. Partial index keeps it tight.
create index projects_owner_active_idx
  on public.projects (owner_id)
  where archived_at is null and deleted_at is null;
