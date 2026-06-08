// Convention: parse-on-read; writes parse their input at the server boundary.
// Every fn takes a DbClient so RLS is enforced by the caller's session and the
// layer stays unit-testable with two users (matches lib/breakdown, lib/schedule, …).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  createProjectInput,
  updateProjectInput,
  project,
  type CreateProjectInput,
  type UpdateProjectInput,
  type Project,
  type ProjectScope,
} from "@/lib/projects/schema";

type DbClient = SupabaseClient<Database>;

/**
 * List the caller's projects in one lifecycle bucket (RLS already scopes to owner).
 *   active   → not archived, not trashed (the default dashboard list)
 *   archived → archived, not trashed
 *   trashed  → soft-deleted (in Trash)
 */
export async function listProjects(
  client: DbClient,
  scope: ProjectScope = "active",
): Promise<Project[]> {
  let query = client.from("projects").select("*");

  if (scope === "trashed") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
    query =
      scope === "archived"
        ? query.not("archived_at", "is", null)
        : query.is("archived_at", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message, { cause: error });
  return data.map((row) => project.parse(row));
}

export async function getProject(client: DbClient, id: string): Promise<Project | null> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? project.parse(data) : null;
}

export async function createProject(
  client: DbClient,
  input: CreateProjectInput,
): Promise<Project> {
  const parsed = createProjectInput.parse(input);
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("projects")
    .insert({ title: parsed.title, status: parsed.status, owner_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return project.parse(data);
}

/** Rename a project (the only mutable presentation value exposed for now). */
export async function updateProject(
  client: DbClient,
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const parsed = updateProjectInput.parse(input);
  const { data, error } = await client
    .from("projects")
    .update({ title: parsed.title })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return project.parse(data);
}

/** Shelve a project — drops out of the main list; workflow `status` is untouched. */
export async function archiveProject(client: DbClient, id: string): Promise<void> {
  const { error } = await client
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message, { cause: error });
}

export async function unarchiveProject(client: DbClient, id: string): Promise<void> {
  const { error } = await client
    .from("projects")
    .update({ archived_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message, { cause: error });
}

/** Soft-delete → Trash. Reversible via restoreProject; never cascades. */
export async function softDeleteProject(client: DbClient, id: string): Promise<void> {
  const { error } = await client
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message, { cause: error });
}

export async function restoreProject(client: DbClient, id: string): Promise<void> {
  const { error } = await client
    .from("projects")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message, { cause: error });
}

/**
 * Permanently delete a project and every dependent row (~30 tables CASCADE off
 * project_id). Irreversible — gated behind a type-to-confirm dialog in the UI.
 */
export async function purgeProject(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message, { cause: error });
}
