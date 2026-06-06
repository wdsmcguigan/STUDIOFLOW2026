// ---------------------------------------------------------------------------
// assembleCallSheet — PURE call-sheet assembler
// No Date.now(), no DB, no IO, no side effects.
//
// Consumes the plain-data slice produced by loadCallSheetInputs (Task 6) and
// returns a fully assembled AssembledCallSheet conforming to the schema types
// (Task 4). Consumed by getCallSheet (Task 10), the PDF renderer (Task 11),
// and the view UI (Tasks 13–14).
//
// *Like inline types decouple this engine from DB row types and Zod schemas so:
//   - tests use plain objects with no schema imports
//   - column renames never ripple into pure logic
//   - the engine has zero runtime coupling to lib/callsheet/data.ts
//   (importing a *type* from data.ts would be safe at runtime but would couple
//   the engine's import graph to SupabaseClient, @supabase/supabase-js, etc.)
// ---------------------------------------------------------------------------

import type {
  AssembledCallSheet,
  CallSheetHeader,
  CallSheetScene,
  CastCallRow,
  CrewCallRow,
  CrewDepartmentBlock,
} from "@/lib/callsheet/schema";
import { resolveCrewCallTime, resolveCastCallTime } from "./calls";
import { computeSunTimes } from "./sun";

// ---------------------------------------------------------------------------
// Minimal structural input types ("*Like" pattern)
// Mirror the shapes of the DB row / data-layer types without importing them.
// ---------------------------------------------------------------------------

interface ShootDayLike {
  id: string;
  date: string | null;
  // Unused DB columns optional.
  project_id?: string;
  day_type?: string;
  unit?: string | null;
  ordinal?: number;
  studio_or_location?: string | null;
  name?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Each *Like type declares only the fields the engine reads, plus optional fields
// for the extra DB columns that real row objects (and test fixtures) carry.
// The optional extras mean test fixtures don't need `as` casts, and a column
// rename to an unused field won't produce a type error here.

interface CallSheetRowLike {
  general_call_time: string | null;
  weather_note: string | null;
  hospital_name: string | null;
  hospital_address: string | null;
  notes: string | null;
  revision: number;
  // Unused DB columns declared optional so full row shapes satisfy this type.
  id?: string;
  shoot_day_id?: string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CallSheetSceneEntryLike {
  sceneNumber: string | null;
  intExt: string | null;
  setOrLocation: string | null;
  timeOfDay: string | null;
  pageEighths: number | null;
  synopsis: string | null;
}

interface CastPersonEntryLike {
  personId: string;
  name: string;
  characterName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface CastDayCallLike {
  person_id: string;
  call_time: string | null;
  makeup_time: string | null;
  wardrobe_time: string | null;
  on_set_time: string | null;
  notes: string | null;
  // Unused DB columns optional.
  id?: string;
  shoot_day_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface CrewMemberLike {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string | null;
  phone: string | null;
  ordinal: number;
  // Unused DB columns optional.
  project_id?: string;
  person_id?: string | null;
  day_rate?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface CrewDayCallLike {
  crew_member_id: string;
  call_time: string | null;
  // Unused DB columns optional.
  id?: string;
  shoot_day_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface CrewDeptCallLike {
  department: string;
  call_time: string;
  // Unused DB columns optional.
  id?: string;
  shoot_day_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface LocationLike {
  geo_lat: number | null;
  geo_lng: number | null;
  // Unused DB columns optional.
  id?: string;
  project_id?: string;
  name?: string;
  address?: string | null;
  timezone?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * The complete plain-data slice the assembler consumes.
 * Shape mirrors CallSheetInputs from lib/callsheet/data.ts (Task 6).
 * Using an inline type here keeps the engine free of the data layer's imports.
 */
export interface CallSheetInputsLike {
  shootDay: ShootDayLike;
  /** Stable-id list of dated shoot days, sorted by ordinal. Used for Day X of Y. */
  orderedDatedDayIds: string[];
  scenes: CallSheetSceneEntryLike[];
  castPeople: CastPersonEntryLike[];
  crewMembers: CrewMemberLike[];
  crewDayCalls: CrewDayCallLike[];
  crewDeptCalls: CrewDeptCallLike[];
  castDayCalls: CastDayCallLike[];
  callSheet: CallSheetRowLike;
  location: LocationLike | null;
}

/** Optional assembler parameters. */
export interface AssembleCallSheetOpts {
  /**
   * Production / project name for the call sheet header.
   * SEAM: production name is not yet on the production graph (Phase 5).
   * Callers (getCallSheet, etc.) should pass it from the project row
   * once it's available. Defaults to "" when omitted.
   */
  productionName?: string;
}

// ---------------------------------------------------------------------------
// assembleCallSheet
// ---------------------------------------------------------------------------

/**
 * Assemble a complete call sheet from a pre-loaded data slice.
 *
 * Pure: given the same slice + opts, always returns the same result.
 * No DB access, no I/O, no Date.now().
 *
 * @param slice - The data slice returned by loadCallSheetInputs (Task 6).
 * @param opts  - Optional overrides; see AssembleCallSheetOpts.
 */
export function assembleCallSheet(
  slice: CallSheetInputsLike,
  opts?: AssembleCallSheetOpts,
): AssembledCallSheet {
  const generalCallTime = slice.callSheet.general_call_time ?? null;

  return {
    header: buildHeader(slice, generalCallTime, opts),
    scenes: buildScenes(slice.scenes),
    cast: buildCast(slice.castPeople, slice.castDayCalls, generalCallTime),
    crewByDepartment: buildCrewByDepartment(
      slice.crewMembers,
      slice.crewDayCalls,
      slice.crewDeptCalls,
      generalCallTime,
    ),
  };
}

// ---------------------------------------------------------------------------
// Internal builders (one per output section)
// ---------------------------------------------------------------------------

function buildHeader(
  slice: CallSheetInputsLike,
  generalCallTime: string | null,
  opts?: AssembleCallSheetOpts,
): CallSheetHeader {
  const { shootDay, orderedDatedDayIds, callSheet, location } = slice;

  // Day X of Y: 1-based index of this shoot day within the ordered dated-day list.
  // If the day id is not found (should not happen in normal operation, but guard it),
  // dayNumber falls back to 0 so callers can detect the anomaly rather than silently
  // returning 1 (which would be misleading if the day truly isn't in the list).
  const idx = orderedDatedDayIds.indexOf(shootDay.id);
  const dayNumber = idx === -1 ? 0 : idx + 1;
  const dayCount = orderedDatedDayIds.length;

  // Sun times: computed from location coords + shoot date.
  // Both are required; either being null/undefined yields null sun times.
  let sunrise: string | null = null;
  let sunset: string | null = null;
  if (shootDay.date && location != null) {
    const sun = computeSunTimes(location.geo_lat, location.geo_lng, shootDay.date);
    sunrise = sun?.sunrise ?? null;
    sunset = sun?.sunset ?? null;
  }

  return {
    // SEAM: production name is not on the graph yet. Accept via opts; default "".
    // Wire to project.name once that field is added in a later phase.
    production: opts?.productionName ?? "",
    dayNumber,
    dayCount,
    date: shootDay.date,
    generalCallTime,
    sunrise,
    sunset,
    weather: callSheet.weather_note ?? null,
    hospitalName: callSheet.hospital_name ?? null,
    hospitalAddress: callSheet.hospital_address ?? null,
    notes: callSheet.notes ?? null,
    revision: callSheet.revision,
  };
}

function buildScenes(scenes: CallSheetSceneEntryLike[]): CallSheetScene[] {
  // Scenes are already in strip order (loadCallSheetInputs preserves strip ordinal).
  // Map 1:1 — no reordering or filtering needed here.
  return scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    intExt: s.intExt,
    setOrLocation: s.setOrLocation,
    timeOfDay: s.timeOfDay,
    pageEighths: s.pageEighths,
    synopsis: s.synopsis,
  }));
}

function buildCast(
  castPeople: CastPersonEntryLike[],
  castDayCalls: CastDayCallLike[],
  generalCallTime: string | null,
): CastCallRow[] {
  // Index cast day calls by personId for O(1) lookup.
  const castDayCallByPerson = new Map<string, CastDayCallLike>();
  for (const cdc of castDayCalls) {
    castDayCallByPerson.set(cdc.person_id, cdc);
  }

  return castPeople.map((person): CastCallRow => {
    const dayCall = castDayCallByPerson.get(person.personId) ?? null;
    const times = resolveCastCallTime(dayCall, generalCallTime);
    return {
      personId: person.personId,
      name: person.name,
      characterName: person.characterName,
      callTime: times.callTime,
      makeup: times.makeup,
      wardrobe: times.wardrobe,
      onSet: times.onSet,
      contactPhone: person.contactPhone,
      contactEmail: person.contactEmail,
      notes: dayCall?.notes ?? null,
    };
  });
}

function buildCrewByDepartment(
  crewMembers: CrewMemberLike[],
  crewDayCalls: CrewDayCallLike[],
  crewDeptCalls: CrewDeptCallLike[],
  generalCallTime: string | null,
): CrewDepartmentBlock[] {
  // "Called today" = crew_members that have a crewDayCalls row for this day.
  // Members with no row are excluded — they are not on today's call sheet.
  const dayCallByMemberId = new Map<string, CrewDayCallLike>();
  for (const dc of crewDayCalls) {
    dayCallByMemberId.set(dc.crew_member_id, dc);
  }

  // Build department→call_time map for the cascade.
  const deptCallByDept: Record<string, string> = {};
  for (const ddc of crewDeptCalls) {
    deptCallByDept[ddc.department] = ddc.call_time;
  }

  // Collect called crew and resolve their call times.
  const crewMemberById = new Map<string, CrewMemberLike>();
  for (const m of crewMembers) {
    crewMemberById.set(m.id, m);
  }

  // Group resolved rows by department.
  // Department sort: alphabetical ascending. Empty string department sorts last
  // (empty string is lexicographically before everything, so we push it to end manually).
  const deptMap = new Map<string, CrewCallRow[]>();

  // Iterate crewDayCalls to preserve only members who are called today.
  for (const dc of crewDayCalls) {
    const member = crewMemberById.get(dc.crew_member_id);
    if (!member) continue; // orphan dayCall (member deleted) — skip

    const callTime = resolveCrewCallTime(member, dc, deptCallByDept, generalCallTime);

    const row: CrewCallRow = {
      crewMemberId: member.id,
      name: member.name,
      position: member.position,
      callTime,
      contactPhone: member.phone ?? null,
      contactEmail: member.email ?? null,
    };

    const bucket = deptMap.get(member.department) ?? [];
    bucket.push(row);
    deptMap.set(member.department, bucket);
  }

  // Sort departments alphabetically. Empty string department sorts last.
  const departments = Array.from(deptMap.keys()).sort((a, b) => {
    if (a === "" && b !== "") return 1; // empty last
    if (a !== "" && b === "") return -1;
    return a.localeCompare(b);
  });

  return departments.map((dept): CrewDepartmentBlock => {
    const members = deptMap.get(dept)!;

    // Sort members within dept by ordinal, then name for ties.
    // ordinal comes from crewMembers — look it up.
    const ordinalById = new Map<string, number>();
    for (const m of crewMembers) {
      ordinalById.set(m.id, m.ordinal);
    }
    members.sort((a, b) => {
      const ordA = ordinalById.get(a.crewMemberId) ?? 0;
      const ordB = ordinalById.get(b.crewMemberId) ?? 0;
      if (ordA !== ordB) return ordA - ordB;
      return a.name.localeCompare(b.name);
    });

    return { department: dept, members };
  });
}
