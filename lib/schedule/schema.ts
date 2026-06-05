import { z } from "zod";

// ---- Enums (text + CHECK in DB; strict on write) --------------------------

export const dayType = z.enum(["prep", "prelight", "build", "shoot", "strike", "travel", "wrap"]);
export const unit = z.enum(["main", "second", "splinter"]);
export const stripType = z.enum(["scene", "day_break", "banner"]);
export const castStatus = z.enum(["work", "hold", "start", "finish", "travel", "drop", "pickup", "idle"]);
export const doodCode = z.enum(["S", "W", "F", "SW", "WF", "SWF", "H", "D", "P", "T", "O", "I"]);
export type DoodCode = z.infer<typeof doodCode>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) ------

export const location = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  address: z.string().nullable(),
  geo_lat: z.number().nullable(),
  geo_lng: z.number().nullable(),
  timezone: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const set_ = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  location_id: z.uuid().nullable(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const sceneSegment = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  scene_id: z.uuid(),
  ordinal: z.number().int(),
  page_eighths: z.number().int(),
  label: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const shootDay = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  date: z.string().nullable(),
  day_type: z.string(), // loose: DB column is text
  unit: z.string(), // loose: DB column is text
  studio_or_location: z.string().nullable(),
  ordinal: z.number().int(),
  name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const strip = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  shoot_day_id: z.uuid(),
  ordinal: z.number().int(),
  type: z.string(), // loose: DB column is text
  scene_segment_id: z.uuid().nullable(),
  banner_text: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const castDayStatus = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  person_id: z.uuid(),
  date: z.string(),
  status: z.string(), // loose: DB column is text
  source: z.string(), // loose: DB column is text
  note: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Location = z.infer<typeof location>;
export type Set_ = z.infer<typeof set_>;
export type SceneSegment = z.infer<typeof sceneSegment>;
export type ShootDay = z.infer<typeof shootDay>;
export type Strip = z.infer<typeof strip>;
export type CastDayStatus = z.infer<typeof castDayStatus>;

// ---- Write inputs (parse-at-boundary) -------------------------------------

export const createLocationInput = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).nullable().default(null),
  timezone: z.string().trim().max(64).nullable().default(null),
});

export const createSetInput = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  locationId: z.uuid().nullable().default(null),
});

export const createShootDayInput = z.object({
  projectId: z.uuid(),
  dayType: dayType.default("shoot"),
  unit: unit.default("main"),
  date: z.string().nullable().default(null),
  ordinal: z.number().int().default(0),
  name: z.string().trim().max(120).nullable().default(null),
});

// partition sums validated in data layer
export const splitSegmentInput = z.object({
  projectId: z.uuid(),
  sceneId: z.uuid(),
  eighths: z.array(z.number().int().positive()).min(2),
});

export const setCastOverrideInput = z.object({
  projectId: z.uuid(),
  personId: z.uuid(),
  date: z.string(),
  status: castStatus,
  note: z.string().trim().max(500).nullable().default(null),
});

export type CreateLocationInput = z.infer<typeof createLocationInput>;
export type CreateSetInput = z.infer<typeof createSetInput>;
export type CreateShootDayInput = z.infer<typeof createShootDayInput>;
export type SplitSegmentInput = z.infer<typeof splitSegmentInput>;
export type SetCastOverrideInput = z.infer<typeof setCastOverrideInput>;

// ---- Derived-result types (engine outputs — not persisted) ----------------

export interface EighthsRollup {
  shootDayId: string;
  eighths: number;
}

export type ConflictType = "cast" | "element" | "cast_status";

export interface Conflict {
  type: ConflictType;
  date: string;
  unit?: string | null;
  resourceId: string;
  resourceLabel?: string;
  segmentIds: string[];
  detail?: string;
}

export interface DoodEntry {
  personId: string;
  date: string;
  code: DoodCode;
  source: "derived" | "override";
}

export interface CompanyMove {
  date: string;
  fromSetId: string;
  toSetId: string;
}

// ---- ScheduleConfig — optional config for read wrappers (data.ts) ----------

/**
 * Optional configuration for getDOOD (and future read wrappers that may need it).
 * v1 defaults: hold days on, drop/pickup off, min gap = 2 days.
 * companyOffDays: deferred — no company-off-days table in Phase 3.
 * When the settings surface ships, pass them here.
 */
export interface ScheduleConfig {
  allowHoldDays?: boolean;
  allowDropPickup?: boolean;
  minDropPickupCalendarDays?: number;
  /** ISO yyyy-MM-dd dates the company is off (holidays, weekends if tracked). Deferred Phase 3 default: []. */
  companyOffDays?: string[];
}

// ---- ScheduleGraph — the plain-data input to the pure derivation engine ----
// Assembled once by loadScheduleGraph; the engine takes this and returns
// conflicts / DOOD / eighths / moves with no DB access.

/** Minimal scene shape the engine needs — not the full Breakdown scene. */
export interface ScheduleGraphScene {
  id: string;
  set_id: string | null;
  location_slug: string | null;
  page_eighths: number | null;
}

/** Minimal character shape: id + cast linkage for DOOD derivation. */
export interface ScheduleGraphCharacter {
  id: string;
  cast_person_id: string | null;
}

/** Confirmed scene-character link (status = 'confirmed' only). */
export interface ScheduleGraphSceneCharacter {
  scene_id: string;
  character_id: string;
}

/** Confirmed scene-element link (status = 'confirmed' only). */
export interface ScheduleGraphSceneElement {
  scene_id: string;
  element_id: string;
}

/**
 * The complete graph slice the derivation engine reads.
 *
 * Rules:
 * - sceneCharactersConfirmed / sceneElementsConfirmed contain ONLY rows
 *   where status = 'confirmed' — the Phase-2 breakdown gate.
 * - All collections are scoped to a single project; RLS also enforces this,
 *   but the loader applies the eq("project_id") filter as defense-in-depth.
 */
export interface ScheduleGraph {
  shootDays: ShootDay[];
  strips: Strip[];
  segments: SceneSegment[];
  scenes: ScheduleGraphScene[];
  sets: Set_[];
  locations: Location[];
  sceneCharactersConfirmed: ScheduleGraphSceneCharacter[];
  characters: ScheduleGraphCharacter[];
  sceneElementsConfirmed: ScheduleGraphSceneElement[];
  castOverrides: CastDayStatus[];
}
