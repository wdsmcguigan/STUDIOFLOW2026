import { z } from "zod";

// ---- Enums (text + CHECK in DB; strict on write) --------------------------
export const provenance = z.enum(["manual", "auto"]);
export const tagStatus = z.enum(["suggested", "confirmed", "rejected"]);
export const anchorState = z.enum(["anchored", "needs_review", "orphaned"]);
export const presenceType = z.enum(["speaking", "silent_featured", "background", "voice_only"]);
export const orgType = z.enum(["production_company", "agency", "vendor", "payroll", "insurer", "other"]);
export const jobType = z.enum(["breakdown", "import"]);
export const jobStatus = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);

// ---- text_anchor: robust quote + context ----------------------------------
export const textAnchor = z.object({
  quote: z.string(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  hintOffset: z.number().int().nullable().default(null),
});
export type TextAnchor = z.infer<typeof textAnchor>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) ------
export const department = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  code: z.string().nullable(),
  ordinal: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const elementCategory = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  code: z.string().nullable(),
  department_id: z.uuid().nullable(),
  ordinal: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const organization = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  type: z.string(), // loose: DB column is text
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const person = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  org_id: z.uuid().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const character = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  primary_name: z.string(),
  aliases: z.array(z.string()),
  description: z.string().nullable(),
  cast_person_id: z.uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const element = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  category_id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  vendor_org_id: z.uuid().nullable(),
  estimated_cost: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const linkBase = {
  id: z.uuid(),
  scene_id: z.uuid(),
  provenance: z.string(), // loose: DB column is text
  confidence: z.number().nullable(),
  status: z.string(), // loose: DB column is text
  text_anchor: textAnchor.nullable(),
  anchor_state: z.string(), // loose: DB column is text
  segment_id: z.uuid().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
};

export const sceneElement = z.object({
  ...linkBase,
  element_id: z.uuid(),
  quantity: z.number().int().nullable(),
});

export const sceneCharacter = z.object({
  ...linkBase,
  character_id: z.uuid(),
  presence_type: z.string(), // loose: DB column is text
});

export type Department = z.infer<typeof department>;
export type ElementCategory = z.infer<typeof elementCategory>;
export type Organization = z.infer<typeof organization>;
export type Person = z.infer<typeof person>;
export type Character = z.infer<typeof character>;
export type Element = z.infer<typeof element>;
export type SceneElement = z.infer<typeof sceneElement>;
export type SceneCharacter = z.infer<typeof sceneCharacter>;

// ---- Write inputs (parse-at-boundary) -------------------------------------
export const createElementInput = z.object({
  projectId: z.uuid(),
  categoryId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().default(null),
  vendorOrgId: z.uuid().nullable().default(null),
});

export const createCharacterInput = z.object({
  projectId: z.uuid(),
  primaryName: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().min(1)).default([]),
  description: z.string().trim().max(2000).nullable().default(null),
});

export const createOrganizationInput = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  type: orgType.default("vendor"),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export const createPersonInput = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  contactEmail: z.email().nullable().default(null),
  contactPhone: z.string().trim().max(50).nullable().default(null),
  orgId: z.uuid().nullable().default(null),
});

export const tagSceneElementInput = z.object({
  projectId: z.uuid(),
  sceneId: z.uuid(),
  elementId: z.uuid(),
  provenance: provenance.default("manual"),
  status: tagStatus.default("confirmed"),
  confidence: z.number().min(0).max(1).nullable().default(null),
  textAnchor: textAnchor.nullable().default(null),
  anchorState: anchorState.default("anchored"),
  quantity: z.number().int().positive().nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export const tagSceneCharacterInput = z.object({
  projectId: z.uuid(),
  sceneId: z.uuid(),
  characterId: z.uuid(),
  presenceType,
  provenance: provenance.default("manual"),
  status: tagStatus.default("confirmed"),
  confidence: z.number().min(0).max(1).nullable().default(null),
  textAnchor: textAnchor.nullable().default(null),
  anchorState: anchorState.default("anchored"),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export const mergeCharactersInput = z
  .object({
    projectId: z.uuid(),
    survivorId: z.uuid(),
    absorbedId: z.uuid(),
  })
  .refine((v) => v.survivorId !== v.absorbedId, "cannot merge a character into itself");

export type CreateElementInput = z.infer<typeof createElementInput>;
export type CreateCharacterInput = z.infer<typeof createCharacterInput>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationInput>;
export type CreatePersonInput = z.infer<typeof createPersonInput>;
export type TagSceneElementInput = z.infer<typeof tagSceneElementInput>;
export type TagSceneCharacterInput = z.infer<typeof tagSceneCharacterInput>;
export type MergeCharactersInput = z.infer<typeof mergeCharactersInput>;

// ---- AI structured output (F2: discriminated + versioned) ------------------
const aiAnchor = z.object({
  quote: z.string(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
});

export const aiBreakdownItem = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("element"),
      category: z.string(),
      name: z.string(),
      description: z.string().nullable().default(null),
      confidence: z.number().min(0).max(1),
    })
    .extend(aiAnchor.shape),
  z
    .object({
      kind: z.literal("character"),
      name: z.string(),
      presenceType,
      description: z.string().nullable().default(null),
      aliasOf: z.string().nullable().default(null),
      confidence: z.number().min(0).max(1),
    })
    .extend(aiAnchor.shape),
]);

export const aiBreakdownOutput = z.object({
  schemaVersion: z.literal(1),
  items: z.array(aiBreakdownItem),
});

export type AiBreakdownItem = z.infer<typeof aiBreakdownItem>;
export type AiBreakdownOutput = z.infer<typeof aiBreakdownOutput>;

// ---- Job row schema (source of truth for async queue panel) ---------------
export const job = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  type: z.string(),
  status: z.string(),
  progress: z.number().int(),
  total: z.number().int().nullable(),
  completed: z.number().int().nullable(),
  params: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  workflow_run_id: z.string().nullable(),
  created_by: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Job = z.infer<typeof job>;
