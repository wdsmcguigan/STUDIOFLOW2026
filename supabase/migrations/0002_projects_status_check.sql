-- Constrain projects.status to the app's ProjectStatus enum (see lib/projects/schema.ts).
-- Keeps the DB in sync with the Zod contract; protects against bad writes via
-- service-role/direct SQL that bypass app-layer validation.
alter table public.projects
  add constraint projects_status_check
  check (status in ('development', 'pre-production', 'production', 'post', 'archived'));
