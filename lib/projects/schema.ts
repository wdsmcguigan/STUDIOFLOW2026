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

// TODO: add updateProjectInput when the update operation is implemented (later phase)

export const project = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  title: z.string(),
  status: z.string(), // intentionally loose: DB column is text; read-side must not throw on unknown values
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof project>;
