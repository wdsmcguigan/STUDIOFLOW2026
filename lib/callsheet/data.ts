// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input at the server boundary. Follows lib/budget/data.ts style.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  crewMember,
  callSheet,
  crewDeptCall,
  crewDayCall,
  castDayCall,
  createCrewMemberInput,
  updateCrewMemberInput,
  setCrewDeptCallInput,
  setCrewDayCallInput,
  removeCrewDayCallInput,
  setCastDayCallInput,
  upsertCallSheetHeaderInput,
  type CrewMember,
  type CallSheet,
  type CrewDeptCall,
  type CrewDayCall,
  type CastDayCall,
} from "@/lib/callsheet/schema";
import {
  loadScheduleGraph,
  getDOOD,
} from "@/lib/schedule/data";
import type { Location, ShootDay } from "@/lib/schedule/schema";
import { listPeople, listCharacters } from "@/lib/breakdown/data";
import { assembleCallSheet } from "@/lib/callsheet/derive/assemble";
import type { AssembleCallSheetOpts } from "@/lib/callsheet/derive/assemble";
import type { AssembledCallSheet } from "@/lib/callsheet/schema";

type DbClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Crew members
// ---------------------------------------------------------------------------

export async function createCrewMember(client: DbClient, input: unknown): Promise<CrewMember> {
  const p = createCrewMemberInput.parse(input);
  const { data, error } = await client
    .from("crew_members")
    .insert({
      project_id: p.projectId,
      name: p.name,
      department: p.department,
      position: p.position,
      email: p.email ?? null,
      phone: p.phone ?? null,
      day_rate: p.dayRate ?? null,
      person_id: p.personId ?? null,
      ordinal: p.ordinal,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return crewMember.parse(data);
}

/** List crew members ordered by ordinal then name (stable for display). */
export async function listCrewMembers(client: DbClient, projectId: string): Promise<CrewMember[]> {
  const { data, error } = await client
    .from("crew_members")
    .select("*")
    .eq("project_id", projectId)
    .order("ordinal")
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => crewMember.parse(r));
}

/**
 * Partial update for a crew member.
 * Only provided fields are patched; all others remain unchanged.
 */
export async function updateCrewMember(client: DbClient, input: unknown): Promise<CrewMember> {
  const p = updateCrewMemberInput.parse(input);
  const patch: Database["public"]["Tables"]["crew_members"]["Update"] = {};
  if (p.name !== undefined) patch.name = p.name;
  if (p.department !== undefined) patch.department = p.department;
  if (p.position !== undefined) patch.position = p.position;
  if (p.email !== undefined) patch.email = p.email;
  if (p.phone !== undefined) patch.phone = p.phone;
  if (p.dayRate !== undefined) patch.day_rate = p.dayRate;
  if (p.personId !== undefined) patch.person_id = p.personId;
  if (p.ordinal !== undefined) patch.ordinal = p.ordinal;

  const { data, error } = await client
    .from("crew_members")
    .update(patch)
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return crewMember.parse(data);
}

export async function deleteCrewMember(client: DbClient, crewMemberId: string): Promise<void> {
  const { error } = await client.from("crew_members").delete().eq("id", crewMemberId);
  if (error) throw new Error(error.message, { cause: error });
}

// ---------------------------------------------------------------------------
// Call sheet — get-or-create (race-safe via 23505 re-read)
// call_sheets has a UNIQUE constraint on shoot_day_id (isOneToOne: true in DB types).
// Concurrent inserts for the same shoot_day_id will fail with 23505; we re-read
// the winner exactly as getOrCreateDefaultBudget does in lib/budget/data.ts.
// ---------------------------------------------------------------------------

/**
 * Return the call_sheets row for a shoot day.
 * If none exists, inserts one with default values and returns it.
 * Idempotent — two concurrent calls return the same id.
 */
export async function getOrCreateCallSheet(
  client: DbClient,
  shootDayId: string,
): Promise<CallSheet> {
  const { data: existing, error: readErr } = await client
    .from("call_sheets")
    .select("*")
    .eq("shoot_day_id", shootDayId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if (existing) return callSheet.parse(existing);

  const { data, error } = await client
    .from("call_sheets")
    .insert({ shoot_day_id: shootDayId })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      // Lost the create race — a concurrent caller inserted first.
      // Re-read the winner (the UNIQUE constraint guarantees exactly one row).
      const { data: winner, error: reErr } = await client
        .from("call_sheets")
        .select("*")
        .eq("shoot_day_id", shootDayId)
        .single();
      if (reErr) throw new Error(reErr.message, { cause: reErr });
      return callSheet.parse(winner);
    }
    throw new Error(error.message, { cause: error });
  }
  return callSheet.parse(data);
}

// ---------------------------------------------------------------------------
// Call sheet header
// ---------------------------------------------------------------------------

/**
 * Upsert the header fields for a shoot day's call sheet.
 * get-or-creates the call_sheets row first, then updates header columns.
 * Returns the updated call_sheets row (parse-on-read).
 */
export async function upsertCallSheetHeader(
  client: DbClient,
  input: unknown,
): Promise<CallSheet> {
  const p = upsertCallSheetHeaderInput.parse(input);
  // Ensure the call sheet row exists
  const sheet = await getOrCreateCallSheet(client, p.shootDayId);

  const patch: Database["public"]["Tables"]["call_sheets"]["Update"] = {};
  if (p.generalCallTime !== undefined) patch.general_call_time = p.generalCallTime;
  if (p.weatherNote !== undefined) patch.weather_note = p.weatherNote;
  if (p.hospitalName !== undefined) patch.hospital_name = p.hospitalName;
  if (p.hospitalAddress !== undefined) patch.hospital_address = p.hospitalAddress;
  if (p.notes !== undefined) patch.notes = p.notes;

  const { data, error } = await client
    .from("call_sheets")
    .update(patch)
    .eq("id", sheet.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return callSheet.parse(data);
}

// ---------------------------------------------------------------------------
// Revision
// ---------------------------------------------------------------------------

/**
 * Increment the revision number on the call sheet for a shoot day.
 * get-or-creates the call_sheets row first, then increments revision.
 * Returns the updated call_sheets row (parse-on-read).
 */
export async function bumpRevision(
  client: DbClient,
  shootDayId: string,
): Promise<CallSheet> {
  const sheet = await getOrCreateCallSheet(client, shootDayId);

  const { data, error } = await client
    .from("call_sheets")
    .update({ revision: sheet.revision + 1 })
    .eq("id", sheet.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return callSheet.parse(data);
}

// ---------------------------------------------------------------------------
// Crew department calls — upsert on (shoot_day_id, department)
// ---------------------------------------------------------------------------

/**
 * Upsert a department-level call time for a shoot day.
 * Conflict target: (shoot_day_id, department).
 */
export async function setCrewDeptCall(
  client: DbClient,
  input: unknown,
): Promise<CrewDeptCall> {
  const p = setCrewDeptCallInput.parse(input);
  const { data, error } = await client
    .from("crew_dept_calls")
    .upsert(
      {
        shoot_day_id: p.shootDayId,
        department: p.department,
        call_time: p.callTime,
      },
      { onConflict: "shoot_day_id,department" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return crewDeptCall.parse(data);
}

/** List all department call times for a shoot day. */
export async function listCrewDeptCalls(
  client: DbClient,
  shootDayId: string,
): Promise<CrewDeptCall[]> {
  const { data, error } = await client
    .from("crew_dept_calls")
    .select("*")
    .eq("shoot_day_id", shootDayId)
    .order("department");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => crewDeptCall.parse(r));
}

// ---------------------------------------------------------------------------
// Crew day calls — upsert on (shoot_day_id, crew_member_id)
// ---------------------------------------------------------------------------

/**
 * Upsert an individual crew member's call time for a shoot day.
 * Conflict target: (shoot_day_id, crew_member_id).
 * Pass callTime: null to clear the individual override.
 */
export async function setCrewDayCall(
  client: DbClient,
  input: unknown,
): Promise<CrewDayCall> {
  const p = setCrewDayCallInput.parse(input);
  const { data, error } = await client
    .from("crew_day_calls")
    .upsert(
      {
        shoot_day_id: p.shootDayId,
        crew_member_id: p.crewMemberId,
        call_time: p.callTime,
      },
      { onConflict: "shoot_day_id,crew_member_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return crewDayCall.parse(data);
}

/** List all crew day calls for a shoot day. */
export async function listCrewDayCalls(
  client: DbClient,
  shootDayId: string,
): Promise<CrewDayCall[]> {
  const { data, error } = await client
    .from("crew_day_calls")
    .select("*")
    .eq("shoot_day_id", shootDayId)
    .order("crew_member_id");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => crewDayCall.parse(r));
}

/**
 * Remove the individual call-time override for a crew member on a shoot day.
 * No-ops if no row exists (idempotent).
 */
export async function removeCrewDayCall(
  client: DbClient,
  input: unknown,
): Promise<void> {
  const p = removeCrewDayCallInput.parse(input);
  const { error } = await client
    .from("crew_day_calls")
    .delete()
    .eq("shoot_day_id", p.shootDayId)
    .eq("crew_member_id", p.crewMemberId);
  if (error) throw new Error(error.message, { cause: error });
}

// ---------------------------------------------------------------------------
// Cast day calls — upsert on (shoot_day_id, person_id)
// ---------------------------------------------------------------------------

/**
 * Upsert a cast member's call-sheet row for a shoot day.
 * Conflict target: (shoot_day_id, person_id).
 * All time fields are optional; omitting them sets them to null on insert
 * but the upsert will overwrite any existing values with the provided ones.
 */
export async function setCastDayCall(
  client: DbClient,
  input: unknown,
): Promise<CastDayCall> {
  const p = setCastDayCallInput.parse(input);
  const { data, error } = await client
    .from("cast_day_calls")
    .upsert(
      {
        shoot_day_id: p.shootDayId,
        person_id: p.personId,
        call_time: p.callTime ?? null,
        makeup_time: p.makeupTime ?? null,
        wardrobe_time: p.wardrobeTime ?? null,
        on_set_time: p.onSetTime ?? null,
        notes: p.notes ?? null,
      },
      { onConflict: "shoot_day_id,person_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return castDayCall.parse(data);
}

/** List all cast day calls for a shoot day. */
export async function listCastDayCalls(
  client: DbClient,
  shootDayId: string,
): Promise<CastDayCall[]> {
  const { data, error } = await client
    .from("cast_day_calls")
    .select("*")
    .eq("shoot_day_id", shootDayId)
    .order("person_id");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => castDayCall.parse(r));
}

// ---------------------------------------------------------------------------
// Call sheet inputs — the graph-slice loader (Task 6)
// ---------------------------------------------------------------------------

/**
 * A cast member working this day, assembled from DOOD + people + characters.
 */
export interface CastPersonEntry {
  personId: string;
  name: string;
  characterName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

/**
 * A scene on this day's stripboard, with display fields projected from the
 * schedule graph. Strip order is preserved.
 */
export interface CallSheetSceneEntry {
  sceneNumber: string | null;
  intExt: string | null;
  setOrLocation: string | null;
  timeOfDay: string | null;
  pageEighths: number | null;
  synopsis: string | null;
}

/**
 * The complete plain-data slice the call-sheet engine (Task 9) consumes.
 *
 * Assembled once by loadCallSheetInputs; the engine has no DB access — it
 * receives this slice and returns a fully assembled call sheet.
 *
 * REUSE contract: every collection here comes from upstream read fns
 * (loadScheduleGraph, getDOOD, listPeople, listCharacters, listCrewMembers,
 * listCrewDayCalls, listCrewDeptCalls, listCastDayCalls, getOrCreateCallSheet).
 * No tables are queried directly for data already owned by those fns.
 */
export interface CallSheetInputs {
  /** The shoot_days row for this day (date, day_type, unit, ordinal, project_id). */
  shootDay: ShootDay;
  /** Stable-id list of dated shoot days in this project, sorted by ordinal.
   *  Used by the engine to compute "Day X of Y". */
  orderedDatedDayIds: string[];
  /** This day's scenes in strip order with display fields. */
  scenes: CallSheetSceneEntry[];
  /** People cast-working this day (DOOD on-call codes: SW, W, WF, SWF, S, F).
   *  Includes character name + contact details for the call sheet rows. */
  castPeople: CastPersonEntry[];
  /** All crew members for this project (for call-time cascade in the engine). */
  crewMembers: CrewMember[];
  /** Individual crew call-time overrides for this shoot day. */
  crewDayCalls: CrewDayCall[];
  /** Department-level call times for this shoot day. */
  crewDeptCalls: CrewDeptCall[];
  /** Cast individual call-time overrides for this shoot day. */
  castDayCalls: CastDayCall[];
  /** The call_sheets header row (get-or-created). */
  callSheet: CallSheet;
  /**
   * The day's primary location (for sun-time calculation: geo_lat, geo_lng).
   * Resolved as: first scene on the day → set → location. Null if no location
   * is attached to any scene on the day. The engine tolerates null (sunrise/sunset
   * fields become null).
   */
  location: Location | null;
}

/**
 * Cast working-day DOOD codes — these are the codes that mean the actor
 * appears on set and must appear on the call sheet.
 *
 * Hold (H) and Travel (T) mean the actor is being paid but not on set;
 * Drop (D), Pickup (P), Idle (I), and Off (O) mean the actor is not
 * contracted that day. All are excluded from the call sheet for v1.
 * Freely revisable: adjust this Set to change the gate for any future rule.
 */
const ON_CALL_DOOD_CODES = new Set(["S", "W", "F", "SW", "WF", "SWF"]);

/**
 * Assemble the plain-data slice the call-sheet engine needs for one shoot day.
 *
 * This is the ONLY place the engine's input is assembled. Call-sheet derivation
 * (Task 9) consumes this slice with no DB access.
 *
 * Strategy:
 * 1. Read the shoot day to resolve project_id.
 * 2. Load the schedule graph once (reuses loadScheduleGraph — no re-querying
 *    strips/segments/scenes/sets/locations already owned by lib/schedule).
 * 3. Filter this day's strips → resolve scene display fields from the graph.
 * 4. getDOOD → filter by date + ON_CALL_DOOD_CODES → join people + characters
 *    from lib/breakdown.
 * 5. Assemble crew, per-day calls, cast calls, and the call-sheet header row.
 * 6. Resolve location via: first scene's set → location row (with geo coords).
 */
export async function loadCallSheetInputs(
  client: DbClient,
  shootDayId: string,
): Promise<CallSheetInputs> {
  // 1. Read the shoot day row to get project_id (and validate the day exists)
  const { data: shootDayRow, error: sdErr } = await client
    .from("shoot_days")
    .select("*")
    .eq("id", shootDayId)
    .single();
  if (sdErr) throw new Error(sdErr.message, { cause: sdErr });
  const shootDay = shootDayRow as ShootDay;
  const projectId = shootDay.project_id;

  // 2. Fan out all project-scoped reads in parallel.
  //    loadScheduleGraph is reused (do NOT re-query strips/segments/scenes/sets/locations).
  //    getDOOD is reused (do NOT re-query cast_day_statuses / derive DOOD inline).
  const [
    graph,
    doodEntries,
    people,
    characters,
    crewMembersList,
    crewDayCallsList,
    crewDeptCallsList,
    castDayCallsList,
    callSheetRow,
  ] = await Promise.all([
    loadScheduleGraph(client, projectId),
    getDOOD(client, projectId),
    listPeople(client, projectId),
    listCharacters(client, projectId),
    listCrewMembers(client, projectId),
    listCrewDayCalls(client, shootDayId),
    listCrewDeptCalls(client, shootDayId),
    listCastDayCalls(client, shootDayId),
    getOrCreateCallSheet(client, shootDayId),
  ]);

  // 3. orderedDatedDayIds — dated shoot days sorted by ordinal. Reuse
  //    graph.shootDays (loadScheduleGraph already loaded them — no extra query).
  const orderedDatedDayIds = graph.shootDays
    .filter((d) => d.date !== null)
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((d) => d.id);

  // 4. Scenes for this day — from the schedule graph.
  //    Strips on this shoot day, in strip ordinal order, each referencing a
  //    scene_segment → scene. scene fields projected from the graph's scene rows.

  // Build lookup maps from the schedule graph
  const segmentById = new Map(graph.segments.map((s) => [s.id, s]));
  const setById = new Map(graph.sets.map((s) => [s.id, s]));
  const locationById = new Map(graph.locations.map((l) => [l.id, l]));

  // Direct query: we need full scene display fields (scene_number, int_ext,
  // time_of_day, synopsis, location_slug) that loadScheduleGraph omits from its
  // minimal ScheduleGraphScene shape. Fetch only for scenes on this day.
  const dayStrips = graph.strips
    .filter((s) => s.shoot_day_id === shootDayId && s.type === "scene" && s.scene_segment_id != null)
    .sort((a, b) => a.ordinal - b.ordinal);

  const daySceneIds = Array.from(
    new Set(
      dayStrips
        .map((s) => segmentById.get(s.scene_segment_id!)?.scene_id)
        .filter((id): id is string => id != null),
    ),
  );

  // Fetch full scene display fields for the day's scenes.
  // These fields (scene_number, int_ext, time_of_day, synopsis) are not in the
  // loadScheduleGraph projection (which carries only id/set_id/location_slug/page_eighths).
  // This targeted direct read avoids duplicating the graph logic while still
  // getting what we need.
  let fullSceneRows: Array<{
    id: string;
    scene_number: string | null;
    int_ext: string | null;
    time_of_day: string | null;
    synopsis: string | null;
    set_id: string | null;
    location_slug: string | null;
    page_eighths: number | null;
  }> = [];
  if (daySceneIds.length > 0) {
    const { data: scRows, error: scErr } = await client
      .from("scenes")
      .select("id, scene_number, int_ext, time_of_day, synopsis, set_id, location_slug, page_eighths")
      .in("id", daySceneIds);
    if (scErr) throw new Error(scErr.message, { cause: scErr });
    fullSceneRows = scRows ?? [];
  }
  const fullSceneById = new Map(fullSceneRows.map((r) => [r.id, r]));

  // Build scenes in strip order (preserving strip ordinal)
  const scenes: CallSheetSceneEntry[] = [];
  const seenSceneIds = new Set<string>();
  for (const strip of dayStrips) {
    const seg = segmentById.get(strip.scene_segment_id!);
    if (!seg) continue;
    const sceneId = seg.scene_id;
    if (seenSceneIds.has(sceneId)) continue; // deduplicate split segments
    seenSceneIds.add(sceneId);
    const sc = fullSceneById.get(sceneId);
    if (!sc) continue;
    const set = sc.set_id ? setById.get(sc.set_id) : null;
    const setOrLocation = set?.name ?? sc.location_slug ?? null;
    scenes.push({
      sceneNumber: sc.scene_number,
      intExt: sc.int_ext,
      setOrLocation,
      timeOfDay: sc.time_of_day,
      pageEighths: sc.page_eighths,
      synopsis: sc.synopsis,
    });
  }

  // 5. castPeople — DOOD gate.
  //    getDOOD returns DoodEntry[] { personId, date, code, source }
  //    Filter to entries for this day's date with an on-call code.
  const shootDate = shootDay.date;
  const workingPersonIds = new Set<string>();
  if (shootDate) {
    for (const entry of doodEntries) {
      if (entry.date === shootDate && ON_CALL_DOOD_CODES.has(entry.code)) {
        workingPersonIds.add(entry.personId);
      }
    }
  }

  // Build person and character lookups from breakdown
  const personById = new Map(people.map((p) => [p.id, p]));
  // Map personId → first character whose cast_person_id matches
  const characterByPersonId = new Map<string, (typeof characters)[number]>();
  for (const ch of characters) {
    if (ch.cast_person_id && !characterByPersonId.has(ch.cast_person_id)) {
      characterByPersonId.set(ch.cast_person_id, ch);
    }
  }

  const castPeople: CastPersonEntry[] = [];
  for (const personId of workingPersonIds) {
    const person = personById.get(personId);
    if (!person) continue;
    const character = characterByPersonId.get(personId);
    castPeople.push({
      personId,
      name: person.name,
      characterName: character?.primary_name ?? null,
      contactEmail: person.contact_email,
      contactPhone: person.contact_phone,
    });
  }

  // 6. Location resolution:
  //    First scene on the day → set → location (with geo_lat / geo_lng).
  //    If no scene has a set with a linked location, returns null.
  //    The engine uses geo coords for sun-time computation (Task 8);
  //    null is tolerated (sunrise/sunset become null).
  let location: Location | null = null;
  for (const strip of dayStrips) {
    const seg = segmentById.get(strip.scene_segment_id!);
    if (!seg) continue;
    const sceneId = seg.scene_id;
    const sc = fullSceneById.get(sceneId);
    if (!sc?.set_id) continue;
    const set = setById.get(sc.set_id);
    if (!set?.location_id) continue;
    location = locationById.get(set.location_id) ?? null;
    if (location) break; // found — stop at first scene that has one
  }

  return {
    shootDay,
    orderedDatedDayIds,
    scenes,
    castPeople,
    crewMembers: crewMembersList,
    crewDayCalls: crewDayCallsList,
    crewDeptCalls: crewDeptCallsList,
    castDayCalls: castDayCallsList,
    callSheet: callSheetRow,
    location,
  };
}

// ---------------------------------------------------------------------------
// getCallSheet — derived-on-read entry point (Task 10)
// ---------------------------------------------------------------------------

/**
 * Load the graph slice for a shoot day and run the pure call-sheet assembler.
 *
 * Nothing derived is persisted — the AssembledCallSheet is computed fresh
 * from the authored + graph data on every call. Consumed by the PDF route
 * (Task 11) and the call-sheet view UI (Task 13).
 *
 * @param client    - Authenticated Supabase client (user session — RLS enforced).
 * @param shootDayId - The shoot_days.id to assemble a call sheet for.
 * @param opts      - Optional assembler params (e.g. productionName once the
 *                    project row carries that field).
 */
export async function getCallSheet(
  client: DbClient,
  shootDayId: string,
  opts?: AssembleCallSheetOpts,
): Promise<AssembledCallSheet> {
  const slice = await loadCallSheetInputs(client, shootDayId);
  return assembleCallSheet(slice, opts);
}
