import { z } from "zod";

export const projectStatus = z.enum([
  "development",
  "pre-production",
  "production",
  "post",
  "archived",
]);
export type ProjectStatus = z.infer<typeof projectStatus>;

export const createProjectInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  status: projectStatus.default("development"),
});
export type CreateProjectInput = z.infer<typeof createProjectInput>;

// Rename is the only mutable presentation value exposed for now. Status edits and
// other fields stay out of scope until a project-settings surface exists.
export const updateProjectInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
});
export type UpdateProjectInput = z.infer<typeof updateProjectInput>;

// Which lifecycle bucket a project listing wants. archived_at / deleted_at are
// orthogonal nullable timestamps on the row (see migration 0022):
//   active   → neither set       (the default dashboard list)
//   archived → archived_at set, deleted_at null
//   trashed  → deleted_at set    (soft-deleted; awaiting restore or purge)
export const projectScope = z.enum(["active", "archived", "trashed"]);
export type ProjectScope = z.infer<typeof projectScope>;

export const project = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  title: z.string(),
  status: z.string(), // intentionally loose: DB column is text; read-side must not throw on unknown values
  archived_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof project>;
