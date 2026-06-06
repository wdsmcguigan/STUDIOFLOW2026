import { z } from "zod";

// ---- Read-side row schemas (loose where DB columns are text/nullable) -------
// Convention (mirrors budget/schedule/breakdown):
//   - nullable DB columns → .nullable()
//   - text columns → z.string() (loose; DB is source of truth)
//   - numeric DB columns → z.number() (Supabase returns JS numbers)
//   - uuid columns → z.uuid() (still strict; UUIDs are validated at DB level)
//   - time-of-day columns are stored as text ("HH:mm") → z.string().nullable()

export const crewMember = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  person_id: z.uuid().nullable(),
  name: z.string(),
  department: z.string(),
  position: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  // day_rate is display-only; NO engine reads this (spec D2 / plan §0017 comment)
  day_rate: z.number().nullable(),
  ordinal: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const callSheet = z.object({
  id: z.uuid(),
  shoot_day_id: z.uuid(),
  general_call_time: z.string().nullable(),
  weather_note: z.string().nullable(),
  hospital_name: z.string().nullable(),
  hospital_address: z.string().nullable(),
  notes: z.string().nullable(),
  revision: z.number().int(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const crewDeptCall = z.object({
  id: z.uuid(),
  shoot_day_id: z.uuid(),
  department: z.string(),
  // call_time is NOT NULL in DB — still text
  call_time: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const crewDayCall = z.object({
  id: z.uuid(),
  shoot_day_id: z.uuid(),
  crew_member_id: z.uuid(),
  call_time: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const castDayCall = z.object({
  id: z.uuid(),
  shoot_day_id: z.uuid(),
  person_id: z.uuid(),
  call_time: z.string().nullable(),
  makeup_time: z.string().nullable(),
  wardrobe_time: z.string().nullable(),
  on_set_time: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CrewMember = z.infer<typeof crewMember>;
export type CallSheet = z.infer<typeof callSheet>;
export type CrewDeptCall = z.infer<typeof crewDeptCall>;
export type CrewDayCall = z.infer<typeof crewDayCall>;
export type CastDayCall = z.infer<typeof castDayCall>;

// ---- Write inputs (strict: z.uuid(), .trim().min(1), exact enums) ----------

export const createCrewMemberInput = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  department: z.string().trim().max(200).default(""),
  position: z.string().trim().max(200).default(""),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  // day_rate is display-only; stored as-is, not read by the engine
  dayRate: z.number().nullable().optional(),
  personId: z.uuid().nullable().optional(),
  ordinal: z.number().int().default(0),
});

export const updateCrewMemberInput = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  department: z.string().trim().max(200).optional(),
  position: z.string().trim().max(200).optional(),
  email: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  dayRate: z.number().nullable().optional(),
  personId: z.uuid().nullable().optional(),
  ordinal: z.number().int().optional(),
});

export const setCrewDeptCallInput = z.object({
  shootDayId: z.uuid(),
  department: z.string().trim().min(1).max(200),
  callTime: z.string().trim().min(1),
});

export const setCrewDayCallInput = z.object({
  shootDayId: z.uuid(),
  crewMemberId: z.uuid(),
  // null = clear the individual override (cascade falls back to dept or general)
  callTime: z.string().nullable(),
});

export const removeCrewDayCallInput = z.object({
  shootDayId: z.uuid(),
  crewMemberId: z.uuid(),
});

export const setCastDayCallInput = z.object({
  shootDayId: z.uuid(),
  personId: z.uuid(),
  // All time overrides are optional/nullable — null clears an existing value
  callTime: z.string().nullable().optional(),
  makeupTime: z.string().nullable().optional(),
  wardrobeTime: z.string().nullable().optional(),
  onSetTime: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const upsertCallSheetHeaderInput = z.object({
  shootDayId: z.uuid(),
  // All header fields are optional — omitting a field leaves it unchanged
  generalCallTime: z.string().nullable().optional(),
  weatherNote: z.string().trim().max(500).nullable().optional(),
  hospitalName: z.string().trim().max(200).nullable().optional(),
  hospitalAddress: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const bumpRevisionInput = z.object({
  shootDayId: z.uuid(),
});

export type CreateCrewMemberInput = z.infer<typeof createCrewMemberInput>;
export type UpdateCrewMemberInput = z.infer<typeof updateCrewMemberInput>;
export type SetCrewDeptCallInput = z.infer<typeof setCrewDeptCallInput>;
export type SetCrewDayCallInput = z.infer<typeof setCrewDayCallInput>;
export type RemoveCrewDayCallInput = z.infer<typeof removeCrewDayCallInput>;
export type SetCastDayCallInput = z.infer<typeof setCastDayCallInput>;
export type UpsertCallSheetHeaderInput = z.infer<typeof upsertCallSheetHeaderInput>;
export type BumpRevisionInput = z.infer<typeof bumpRevisionInput>;

// ---- Derived-result types (engine outputs — not persisted) -----------------
// Produced by lib/callsheet/derive/assemble.ts (Task 9) and consumed by the
// PDF renderer (Task 11) and the call-sheet view UI (Tasks 13–14).
// Defined as plain TS interfaces (not Zod schemas) so they can be refined
// in later tasks without migrating parse logic.

/**
 * The call sheet header — static + authored fields resolved together.
 *
 * - production, dayNumber, dayCount, date: from the shoot day + project graph
 * - generalCallTime, sunrise, sunset, weather: informational
 * - hospital*: nearest emergency care for the location
 * - revision: incremented by `bumpRevision`; displayed prominently
 */
export interface CallSheetHeader {
  production: string;
  dayNumber: number; // 1-based index within dated shoot days
  dayCount: number; // total dated shoot days in the project
  date: string | null; // ISO date string "yyyy-MM-dd", null if not yet dated
  generalCallTime: string | null; // "HH:mm" text
  sunrise: string | null; // "HH:mm" text from suncalc
  sunset: string | null; // "HH:mm" text from suncalc
  weather: string | null; // manual weather note
  hospitalName: string | null;
  hospitalAddress: string | null;
  notes: string | null;
  revision: number;
}

/**
 * A scene appearing on the call sheet — read from the stripboard for this day.
 *
 * - sceneNumber: human-facing display value (mutable, not the stable scene_id)
 * - pageEighths: number of eighths of a page (null if not set)
 */
export interface CallSheetScene {
  sceneNumber: string | null;
  intExt: string | null;
  setOrLocation: string | null;
  timeOfDay: string | null;
  pageEighths: number | null;
  synopsis: string | null;
}

/**
 * A single cast member's call row — resolved from DOOD + cast_day_calls.
 * All time fields are "HH:mm" text (null = not set / not applicable).
 */
export interface CastCallRow {
  personId: string;
  name: string;
  characterName: string | null;
  callTime: string | null;
  makeup: string | null; // makeup_time
  wardrobe: string | null; // wardrobe_time
  onSet: string | null; // on_set_time
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
}

/**
 * A single crew member's call row — resolved via the cascade:
 * individual call_time → department call → general call → null.
 */
export interface CrewCallRow {
  crewMemberId: string;
  name: string;
  position: string;
  callTime: string | null; // resolved through the cascade
  contactPhone: string | null;
  contactEmail: string | null;
}

/**
 * All crew in a single department, sorted by ordinal.
 */
export interface CrewDepartmentBlock {
  department: string;
  members: CrewCallRow[];
}

/**
 * The complete assembled call sheet — the primary shape produced by
 * `assembleCallSheet` and consumed by the PDF renderer and the view UI.
 */
export interface AssembledCallSheet {
  header: CallSheetHeader;
  scenes: CallSheetScene[];
  cast: CastCallRow[];
  crewByDepartment: CrewDepartmentBlock[];
}
