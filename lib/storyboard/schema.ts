import { z } from "zod";

// ---- Write-input schemas (parsed at the server boundary) --------------------

export const updateVisualSettingsInput = z.object({
  projectId: z.string().uuid(),
  stylePreset: z
    .enum(["storyboard_sketch", "graphic_novel_ink", "photoreal_cinematic", "rough_pencil"])
    .optional(),
  aspectRatio: z.enum(["16:9", "2.39:1", "4:3", "1:1"]).optional(),
  customStylePrompt: z.string().nullable().optional(),
});
export type UpdateVisualSettingsInput = z.infer<typeof updateVisualSettingsInput>;

export const createVisualReferenceInput = z.object({
  projectId: z.string().uuid(),
  subjectType: z.enum(["character", "location"]),
  characterId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  source: z.enum(["ai", "upload"]).optional(),
  status: z.enum(["suggested", "locked", "rejected"]).optional(),
  isPrimary: z.boolean().optional(),
  imagePath: z.string().nullable().optional(),
  promptUsed: z.string().nullable().optional(),
});
export type CreateVisualReferenceInput = z.infer<typeof createVisualReferenceInput>;

export const lockReferenceInput = z.object({
  id: z.string().uuid(),
});
export type LockReferenceInput = z.infer<typeof lockReferenceInput>;

export const setReferenceStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["suggested", "locked", "rejected"]),
});
export type SetReferenceStatusInput = z.infer<typeof setReferenceStatusInput>;

// ---- Camera taxonomy enums (strict on AI output + write inputs) -------------

export const SHOT_SIZES = ["EWS", "WS", "MW", "MS", "MCU", "CU", "ECU"] as const;
export const SHOT_ANGLES = ["eye", "low", "high", "overhead", "aerial", "dutch"] as const;
export const SHOT_MOVEMENTS = [
  "static",
  "pan",
  "tilt",
  "push_in",
  "pull_out",
  "zoom",
  "arc",
  "dolly",
  "crane",
  "handheld",
] as const;

// ---- AI structured output (shot-list) --------------------------------------

export const shotListItem = z.object({
  size: z.enum(SHOT_SIZES),
  angle: z.enum(SHOT_ANGLES),
  movement: z.enum(SHOT_MOVEMENTS),
  lens: z.string().nullable().optional(),
  action: z.string().min(1), // free-text — taxonomy is camera-only
});
export const shotListOutput = z.object({
  schemaVersion: z.literal(1),
  shots: z.array(shotListItem).max(20),
});
export type ShotListItem = z.infer<typeof shotListItem>;
export type ShotListOutput = z.infer<typeof shotListOutput>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) -------
// Convention (mirrors breakdown/budget):
//   - enum-constrained DB columns → z.string() on read (loose; DB is source of truth)
//   - nullable DB columns → .nullable()
//   - jsonb columns with unknown shape → z.unknown().nullable()

export const projectVisualSettings = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  style_preset: z.string(), // loose: text column (DB holds enum constraint)
  aspect_ratio: z.string(), // loose: text column
  custom_style_prompt: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProjectVisualSettings = z.infer<typeof projectVisualSettings>;

export const visualReference = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  subject_type: z.string(), // loose: text column (character, location, prop, …)
  source: z.string(), // loose: text column (upload, ai, …)
  status: z.string(), // loose: text column (pending, approved, rejected, …)
  is_primary: z.boolean(),
  image_path: z.string().nullable(),
  character_id: z.uuid().nullable(),
  location_id: z.uuid().nullable(),
  prompt_used: z.string().nullable(),
  generation_metadata: z.unknown().nullable(), // jsonb — shape owned by generation service
  created_by: z.uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type VisualReference = z.infer<typeof visualReference>;

// ---- Write-input schemas — shots -----------------------------------------------

export const createShotInput = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  size: z.enum(SHOT_SIZES).optional(),
  angle: z.enum(SHOT_ANGLES).optional(),
  movement: z.enum(SHOT_MOVEMENTS).optional(),
  lens: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  shotNumber: z.string().nullable().optional(),
  provenance: z.enum(["ai", "manual"]).optional(),
  status: z.enum(["suggested", "confirmed", "rejected"]).optional(),
});
export type CreateShotInput = z.infer<typeof createShotInput>;

export const updateShotInput = z.object({
  id: z.string().uuid(),
  size: z.enum(SHOT_SIZES).optional(),
  angle: z.enum(SHOT_ANGLES).optional(),
  movement: z.enum(SHOT_MOVEMENTS).optional(),
  lens: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  shotNumber: z.string().nullable().optional(),
});
export type UpdateShotInput = z.infer<typeof updateShotInput>;

export const reorderShotsInput = z.object({
  sceneId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()),
});
export type ReorderShotsInput = z.infer<typeof reorderShotsInput>;

export const setShotStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["suggested", "confirmed", "rejected"]),
});
export type SetShotStatusInput = z.infer<typeof setShotStatusInput>;

export const deleteShotInput = z.object({
  id: z.string().uuid(),
});
export type DeleteShotInput = z.infer<typeof deleteShotInput>;

// ---- Write-input schemas — shot_frames -----------------------------------------

export const createShotFrameInput = z.object({
  projectId: z.string().uuid(),
  shotId: z.string().uuid(),
  imagePath: z.string(),
  source: z.enum(["ai", "upload"]).optional(),
  promptUsed: z.string().nullable().optional(),
  ordinal: z.number().int().nonnegative().optional(),
});
export type CreateShotFrameInput = z.infer<typeof createShotFrameInput>;

export const selectFrameInput = z.object({
  shotId: z.string().uuid(),
  frameId: z.string().uuid(),
});
export type SelectFrameInput = z.infer<typeof selectFrameInput>;

export const setFrameStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["suggested", "selected", "rejected"]),
});
export type SetFrameStatusInput = z.infer<typeof setFrameStatusInput>;

export const deleteFrameInput = z.object({
  id: z.string().uuid(),
});
export type DeleteFrameInput = z.infer<typeof deleteFrameInput>;

// ---- Read-row schemas — shots + shot_frames ------------------------------------
// Convention: loose on enum-constrained text columns (DB is source of truth),
// nullable where the DB column is nullable, jsonb → z.unknown().nullable().

export const shot = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  scene_id: z.uuid(),
  ordinal: z.number(),
  size: z.string().nullable(),
  angle: z.string().nullable(),
  movement: z.string().nullable(),
  lens: z.string().nullable(),
  action: z.string().nullable(),
  shot_number: z.string().nullable(),
  status: z.string(),
  provenance: z.string(),
  text_anchor: z.unknown().nullable(),
  created_by: z.uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Shot = z.infer<typeof shot>;

export const shotFrame = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  shot_id: z.uuid(),
  ordinal: z.number(),
  image_path: z.string(),
  source: z.string(),
  status: z.string(),
  is_selected: z.boolean(),
  prompt_used: z.string().nullable(),
  generation_metadata: z.unknown().nullable(),
  created_by: z.uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ShotFrame = z.infer<typeof shotFrame>;

// ---- Write-input schemas — image_generations (append-only ledger) -------------

export const recordImageGenerationInput = z.object({
  projectId: z.string().uuid(),
  jobId: z.string().uuid().nullable().optional(),
  kind: z.enum(["decompose", "render", "reference"]),
  model: z.string().min(1),
  imageCount: z.number().int().nonnegative(),
  estCost: z.number().nonnegative(),
});
export type RecordImageGenerationInput = z.infer<typeof recordImageGenerationInput>;

// ---- Read-row schema — image_generations ----------------------------------------

export const imageGeneration = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  job_id: z.uuid().nullable(),
  kind: z.string(),    // loose: text column (DB holds enum constraint)
  model: z.string(),
  image_count: z.number(),
  est_cost: z.coerce.number(),
  created_by: z.uuid().nullable(),
  created_at: z.string(),
});
export type ImageGeneration = z.infer<typeof imageGeneration>;

// ---- Result type — generation totals (aggregated, not a DB row) -----------------

export interface GenerationTotals {
  imageCount: number;
  estCost: number;
}

// ---- Render inputs — the graph slice needed to render a scene's panels ---------
// Assembled by loadRenderInputs (lib/storyboard/data.ts) from breakdown reads +
// locked references. Consumed by the render workflow (workflows/storyboard.ts).

/** A storage-path reference (pre-signing) for a character or location. */
export interface RenderRef {
  /** Human label (character/location name) — echoed into the engine prompt refs. */
  label: string;
  /** Storage path (visual_references.image_path). Signed at render time. */
  path: string;
  /** IANA media type; defaults to "image/png" when not stored. */
  mediaType: string;
}

/**
 * Everything the render step needs for one scene, loaded once per render job.
 * sceneMeta / style feed buildPanelPrompt; the refs feed selectConditioningRefs
 * after signing.
 */
export interface RenderInputs {
  projectId: string;
  sceneMeta: import("@/lib/storyboard/ai/prompt").SceneMeta;
  style: import("@/lib/storyboard/ai/prompt").StyleMeta;
  /** Locked primary refs for the characters PRESENT (confirmed) in the scene. */
  characterRefs: RenderRef[];
  /** Locked primary ref for the scene's resolved location, or null. */
  locationRef: RenderRef | null;
}

// ---- Result / helper types (consumed by later tasks; defined minimally here) -
// These are plain TS interfaces — not Zod schemas — so later tasks can refine
// them without migrating parse schemas. Marked with TODO comments where the
// shape is expected to grow once shots/shot_frames/image_generations tables exist.

/**
 * A signed URL + media type for a reference image, used by the AI engine
 * (Task 9) when passing ref images to the vision model.
 * Exported from here so the engine imports a single canonical location.
 */
export interface RefImage {
  signedUrl: string;
  mediaType: string;
  label?: string;
}

/**
 * A single frame with its resolved signed URL, as consumed by the board UI.
 * Distinct from the DB row type `ShotFrame` (which is the parse-on-read schema
 * for the shot_frames table). Renamed from the Task-3 placeholder `ShotFrame`.
 */
export interface ShotFrameResolved {
  id: string;
  signedUrl: string;
  isSelected: boolean;
  status: string; // e.g. "generating" | "ready" | "failed"
  ordinal: number;
}

/**
 * A shot with its associated frames, as consumed by the storyboard board UI.
 * `selectedUrl` is the signed URL of the selected frame (or null if none selected).
 * Core shot fields sourced from the `Shot` DB row type; nullable columns are
 * nullable here to match the DB schema (size/angle/movement/action are all
 * nullable in the shots table — reconciled in Task 11).
 */
export interface ShotWithFrames {
  // Core shot fields (nullability matches Shot DB row)
  id: string;
  scene_id: string;
  ordinal: number;
  size: string | null;
  angle: string | null;
  movement: string | null;
  lens: string | null;
  action: string | null;
  shot_number: string | null;
  /** Shot workflow status: "suggested" | "confirmed" | "rejected" */
  status: string;
  /** How the shot was created: "ai" | "manual" */
  provenance: string;
  // Resolved frame data
  frames: ShotFrameResolved[];
  selectedUrl: string | null;
}

/**
 * The full storyboard for a single scene: ordered shots with frames.
 * Primary shape consumed by the SceneBoard UI component (Task 5).
 */
export interface SceneBoard {
  sceneId: string;
  shots: ShotWithFrames[];
}
