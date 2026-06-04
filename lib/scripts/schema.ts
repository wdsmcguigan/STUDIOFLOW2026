import { z } from "zod";

// ---- Enums (write-side, strict) -------------------------------------------
export const intExt = z.enum(["INT", "EXT", "INT/EXT"]);
export type IntExt = z.infer<typeof intExt>;

export const sceneStatus = z.enum(["active", "omitted"]);
export type SceneStatus = z.infer<typeof sceneStatus>;

export const sourceFormat = z.enum(["fountain"]); // 'fdx' added in Phase 1.5
export type SourceFormat = z.infer<typeof sourceFormat>;

// ---- Write inputs ---------------------------------------------------------
export const createScriptInput = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
});
export type CreateScriptInput = z.infer<typeof createScriptInput>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) ------
export const script = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  title: z.string(),
  created_at: z.string(),
});
export type Script = z.infer<typeof script>;

export const scriptVersion = z.object({
  id: z.uuid(),
  script_id: z.uuid(),
  label: z.string(),
  source_format: z.string(), // loose: DB column is text
  raw_source: z.string(),
  revision_id: z.uuid().nullable(),
  locked: z.boolean(),
  imported_at: z.string(),
  created_by: z.uuid(),
});
export type ScriptVersion = z.infer<typeof scriptVersion>;

export const scene = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  script_id: z.uuid(),
  ordinal: z.number().int(),
  scene_number: z.string().nullable(),
  number_locked: z.boolean(),
  int_ext: z.string().nullable(), // loose: DB column is text
  location_slug: z.string().nullable(),
  time_of_day: z.string().nullable(),
  synopsis: z.string().nullable(),
  page_eighths: z.number().int().nullable(),
  script_day: z.string().nullable(),
  status: z.string(), // loose: DB column is text
  created_at: z.string(),
  updated_at: z.string(),
});
export type Scene = z.infer<typeof scene>;

export const revision = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  color: z.string(),
  ordinal: z.number().int(),
  active: z.boolean(),
  created_at: z.string(),
});
export type Revision = z.infer<typeof revision>;

// ---- Adapter output (normalized parsed scene) -----------------------------
export const parsedScene = z.object({
  sceneNumber: z.string().nullable(),
  intExt: z.string().nullable(),
  locationSlug: z.string().nullable(),
  timeOfDay: z.string().nullable(),
  bodyText: z.string(),
  synopsis: z.string(),
  pageEighths: z.number().int(),
  textAnchorStart: z.number().int(),
  textAnchorEnd: z.number().int(),
  ordinal: z.number().int(),
});
export type ParsedScene = z.infer<typeof parsedScene>;

// ---- Phase 1 action input schemas (parse-at-boundary; fold-in #1) ----------
const emptyToNull = z.string().trim().transform((s) => (s.length ? s : null)).nullable();

export const editSceneInput = z.object({
  int_ext: z.preprocess((v) => (v === "" || v == null ? null : v), intExt.nullable()).default(null),
  location_slug: emptyToNull.default(null),
  time_of_day: emptyToNull.default(null),
  synopsis: emptyToNull.default(null),
  script_day: emptyToNull.default(null),
});
export type EditSceneInput = z.infer<typeof editSceneInput>;

export const stageReimportInput = z.object({
  source: z.string().min(1).refine((s) => s.trim().length > 0, "source is required"),
});
export type StageReimportInput = z.infer<typeof stageReimportInput>;

export const confirmReimportInput = z.object({
  scriptVersionId: z.uuid(),
});
export type ConfirmReimportInput = z.infer<typeof confirmReimportInput>;

// ---- Reconciliation diff --------------------------------------------------
export const sceneClassification = z.enum([
  "unchanged",
  "modified",
  "new",
  "removed",
  "conflict",
]);
export type SceneClassification = z.infer<typeof sceneClassification>;

export const sceneDiffEntry = z.object({
  classification: sceneClassification,
  // The matched existing scene id (null for "new").
  sceneId: z.uuid().nullable().default(null),
  // 1.0 for exact (tier 1/2) matches; < 1.0 for fuzzy (tier 3); 0 for new/removed.
  confidence: z.number().min(0).max(1).default(0),
  // Ordinal of the parsed scene driving this entry (null for "removed").
  parsedOrdinal: z.number().int().nullable().default(null),
  // The incoming parsed scene (null for "removed").
  parsed: parsedScene.nullable().default(null),
});
export type SceneDiff = z.infer<typeof sceneDiffEntry>;
