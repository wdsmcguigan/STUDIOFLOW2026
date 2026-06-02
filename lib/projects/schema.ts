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

export const project = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof project>;
