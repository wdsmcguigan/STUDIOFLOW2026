// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input at the server boundary. Follows lib/breakdown/data.ts style.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  location,
  set_,
  sceneSegment,
  shootDay,
  strip,
  castDayStatus,
  createLocationInput,
  createSetInput,
  createShootDayInput,
  splitSegmentInput,
  setCastOverrideInput,
  type Location,
  type Set_,
  type SceneSegment,
  type ShootDay,
  type Strip,
  type CastDayStatus,
  type ScheduleGraph,
  type ScheduleConfig,
  type EighthsRollup,
  type Conflict,
  type DoodEntry,
  type CompanyMove,
} from "@/lib/schedule/schema";
import { computeEighthsRollup } from "@/lib/schedule/derive/eighths";
import { computeConflicts } from "@/lib/schedule/derive/conflicts";
import { computeDOOD } from "@/lib/schedule/derive/dood";
import { computeCompanyMoves } from "@/lib/schedule/derive/moves";

type DbClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function createLocation(client: DbClient, input: unknown): Promise<Location> {
  const p = createLocationInput.parse(input);
  const { data, error } = await client
    .from("locations")
    .insert({
      project_id: p.projectId,
      name: p.name,
      address: p.address,
      timezone: p.timezone,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return location.parse(data);
}

export async function listLocations(client: DbClient, projectId: string): Promise<Location[]> {
  const { data, error } = await client
    .from("locations")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => location.parse(r));
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

export async function createSet(client: DbClient, input: unknown): Promise<Set_> {
  const p = createSetInput.parse(input);
  const { data, error } = await client
    .from("sets")
    .insert({
      project_id: p.projectId,
      name: p.name,
      location_id: p.locationId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return set_.parse(data);
}

export async function listSets(client: DbClient, projectId: string): Promise<Set_[]> {
  const { data, error } = await client
    .from("sets")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => set_.parse(r));
}

// ---------------------------------------------------------------------------
// Scene segments — lazy default + split
// ---------------------------------------------------------------------------

/**
 * Return the first existing segment for the scene, or create a single default
 * segment carrying the scene's full page_eighths. Idempotent.
 */
export async function getOrCreateDefaultSegment(
  client: DbClient,
  args: { projectId: string; sceneId: string },
): Promise<SceneSegment> {
  const { data: existing, error: readErr } = await client
    .from("scene_segments")
    .select("*")
    .eq("scene_id", args.sceneId)
    .order("ordinal")
    .limit(1);
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if ((existing ?? []).length > 0) return sceneSegment.parse(existing![0]);

  // No segment yet — read the scene's page_eighths for the default
  const { data: sceneRow, error: sceneErr } = await client
    .from("scenes")
    .select("page_eighths")
    .eq("id", args.sceneId)
    .single();
  if (sceneErr) throw new Error(sceneErr.message, { cause: sceneErr });

  const pageEighths = sceneRow.page_eighths ?? 0;
  const { data: inserted, error: insErr } = await client
    .from("scene_segments")
    .insert({
      project_id: args.projectId,
      scene_id: args.sceneId,
      ordinal: 0,
      page_eighths: pageEighths,
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message, { cause: insErr });
  return sceneSegment.parse(inserted);
}

/**
 * Replace all segments for a scene with N new segments (one per entry in
 * `eighths`). The partition must sum exactly to the scene's page_eighths;
 * throws otherwise.
 *
 * NOTE (non-atomic): the sum-validation runs before any write, so the common
 * failure (bad partition) never mutates. The residual window is a mid-operation
 * insert failure after the delete — which would leave the scene segment-less.
 * Acceptable at single-user pre-pro scale; if this moves to a hot/multi-user
 * path, promote to an atomic Postgres RPC (cf. merge_characters). See the
 * Phase-3 carry-forward note.
 */
export async function splitSegment(
  client: DbClient,
  input: unknown,
): Promise<SceneSegment[]> {
  const p = splitSegmentInput.parse(input);

  const { data: sceneRow, error: sceneErr } = await client
    .from("scenes")
    .select("page_eighths")
    .eq("id", p.sceneId)
    .single();
  if (sceneErr) throw new Error(sceneErr.message, { cause: sceneErr });

  const total = p.eighths.reduce((sum, n) => sum + n, 0);
  const expected = sceneRow.page_eighths ?? 0;
  if (total !== expected) {
    throw new Error("segment split must sum to the scene's page_eighths");
  }

  // Delete existing segments for the scene
  const { error: delErr } = await client
    .from("scene_segments")
    .delete()
    .eq("scene_id", p.sceneId);
  if (delErr) throw new Error(delErr.message, { cause: delErr });

  // Insert new segments
  const rows = p.eighths.map((eighths, i) => ({
    project_id: p.projectId,
    scene_id: p.sceneId,
    ordinal: i,
    page_eighths: eighths,
  }));
  const { data: inserted, error: insErr } = await client
    .from("scene_segments")
    .insert(rows)
    .select("*");
  if (insErr) throw new Error(insErr.message, { cause: insErr });
  return (inserted ?? [])
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((r) => sceneSegment.parse(r));
}

// ---------------------------------------------------------------------------
// Set slug → Set auto-map (idempotent)
// ---------------------------------------------------------------------------

/**
 * Find or create a Set whose name matches `slug` in the project, then
 * update the scene's `set_id` to point at it. Idempotent.
 */
export async function ensureSetForSlug(
  client: DbClient,
  args: { projectId: string; sceneId: string; slug: string },
): Promise<Set_> {
  // Find an existing Set with this name in the project
  const { data: existing, error: findErr } = await client
    .from("sets")
    .select("*")
    .eq("project_id", args.projectId)
    .eq("name", args.slug)
    .limit(1);
  if (findErr) throw new Error(findErr.message, { cause: findErr });

  let theSet: Set_;
  if ((existing ?? []).length > 0) {
    theSet = set_.parse(existing![0]);
  } else {
    theSet = await createSet(client, {
      projectId: args.projectId,
      name: args.slug,
      locationId: null,
    });
  }

  // Assign the scene's set_id
  const { error: updErr } = await client
    .from("scenes")
    .update({ set_id: theSet.id })
    .eq("id", args.sceneId);
  if (updErr) throw new Error(updErr.message, { cause: updErr });

  return theSet;
}

// ---------------------------------------------------------------------------
// Shoot days
// ---------------------------------------------------------------------------

export async function createShootDay(client: DbClient, input: unknown): Promise<ShootDay> {
  const p = createShootDayInput.parse(input);
  const { data, error } = await client
    .from("shoot_days")
    .insert({
      project_id: p.projectId,
      day_type: p.dayType,
      unit: p.unit,
      date: p.date,
      ordinal: p.ordinal,
      name: p.name,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shootDay.parse(data);
}

export async function listShootDays(client: DbClient, projectId: string): Promise<ShootDay[]> {
  const { data, error } = await client
    .from("shoot_days")
    .select("*")
    .eq("project_id", projectId)
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => shootDay.parse(r));
}

export async function updateShootDay(
  client: DbClient,
  args: {
    id: string;
    date?: string | null;
    dayType?: string;
    unit?: string;
    ordinal?: number;
    name?: string | null;
  },
): Promise<ShootDay> {
  const patch: Database["public"]["Tables"]["shoot_days"]["Update"] = {};
  if (args.date !== undefined) patch.date = args.date;
  if (args.dayType !== undefined) patch.day_type = args.dayType;
  if (args.unit !== undefined) patch.unit = args.unit;
  if (args.ordinal !== undefined) patch.ordinal = args.ordinal;
  if (args.name !== undefined) patch.name = args.name;

  const { data, error } = await client
    .from("shoot_days")
    .update(patch)
    .eq("id", args.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shootDay.parse(data);
}

// ---------------------------------------------------------------------------
// Strips
// ---------------------------------------------------------------------------

export async function createStrip(
  client: DbClient,
  args: {
    projectId: string;
    shootDayId: string;
    type: string;
    sceneSegmentId?: string | null;
    bannerText?: string | null;
    ordinal?: number;
  },
): Promise<Strip> {
  const { data, error } = await client
    .from("strips")
    .insert({
      project_id: args.projectId,
      shoot_day_id: args.shootDayId,
      type: args.type,
      scene_segment_id: args.sceneSegmentId ?? null,
      banner_text: args.bannerText ?? null,
      ordinal: args.ordinal ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return strip.parse(data);
}

export async function listStrips(
  client: DbClient,
  filter: { projectId?: string; shootDayId?: string },
): Promise<Strip[]> {
  let query = client.from("strips").select("*");
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  if (filter.shootDayId) query = query.eq("shoot_day_id", filter.shootDayId);
  const { data, error } = await query.order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => strip.parse(r));
}

/** Reassign ordinal = index for each id in the provided ordered list. */
export async function reorderStrips(client: DbClient, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await client
      .from("strips")
      .update({ ordinal: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message, { cause: error });
  }
}

export async function deleteStrip(client: DbClient, id: string): Promise<void> {
  const { error } = await client.from("strips").delete().eq("id", id);
  if (error) throw new Error(error.message, { cause: error });
}

// ---------------------------------------------------------------------------
// Cast day overrides
// ---------------------------------------------------------------------------

export async function setCastOverride(
  client: DbClient,
  input: unknown,
): Promise<CastDayStatus> {
  const p = setCastOverrideInput.parse(input);
  const { data, error } = await client
    .from("cast_day_statuses")
    .upsert(
      {
        project_id: p.projectId,
        person_id: p.personId,
        date: p.date,
        status: p.status,
        note: p.note,
        source: "override",
      },
      { onConflict: "person_id,date" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return castDayStatus.parse(data);
}

export async function listCastOverrides(
  client: DbClient,
  projectId: string,
): Promise<CastDayStatus[]> {
  const { data, error } = await client
    .from("cast_day_statuses")
    .select("*")
    .eq("project_id", projectId)
    .order("date");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => castDayStatus.parse(r));
}

// ---------------------------------------------------------------------------
// Schedule graph loader — the seam between DB and the pure derivation engine
// ---------------------------------------------------------------------------

/**
 * Assemble the plain-data slice the derivation engine needs for one project.
 *
 * This is the ONLY place the engine's input is assembled. The engine itself
 * has no DB access — it receives this object and returns derived outputs
 * (conflicts, DOOD entries, eighths rollups, company moves) purely.
 *
 * Contract:
 * - sceneCharactersConfirmed / sceneElementsConfirmed contain ONLY rows where
 *   status = 'confirmed' — the Phase-2 breakdown gate.  schedule derives from
 *   confirmed breakdown only.
 * - All collections are filtered eq("project_id", projectId) as defense-in-depth;
 *   RLS also enforces this, so both guards must agree.
 */
export async function loadScheduleGraph(
  client: DbClient,
  projectId: string,
): Promise<ScheduleGraph> {
  // 1. Reuse existing list functions for project-scoped tables
  const [shootDays, strips, sets, locations, castOverrides] = await Promise.all([
    listShootDays(client, projectId),
    listStrips(client, { projectId }),
    listSets(client, projectId),
    listLocations(client, projectId),
    listCastOverrides(client, projectId),
  ]);

  // 2. Segments — scoped to project
  const { data: segRows, error: segErr } = await client
    .from("scene_segments")
    .select("*")
    .eq("project_id", projectId);
  if (segErr) throw new Error(segErr.message, { cause: segErr });
  const segments = (segRows ?? []).map((r) => sceneSegment.parse(r));

  // 3. Scenes — minimal shape (id, set_id, location_slug, page_eighths)
  const { data: sceneRows, error: sceneErr } = await client
    .from("scenes")
    .select("id, set_id, location_slug, page_eighths")
    .eq("project_id", projectId);
  if (sceneErr) throw new Error(sceneErr.message, { cause: sceneErr });
  const scenes = (sceneRows ?? []).map((r) => ({
    id: r.id,
    set_id: r.set_id ?? null,
    location_slug: r.location_slug ?? null,
    page_eighths: r.page_eighths ?? null,
  }));
  const sceneIds = scenes.map((s) => s.id);

  // 4. Characters — minimal shape (id, cast_person_id)
  const { data: charRows, error: charErr } = await client
    .from("characters")
    .select("id, cast_person_id")
    .eq("project_id", projectId);
  if (charErr) throw new Error(charErr.message, { cause: charErr });
  const characters = (charRows ?? []).map((r) => ({
    id: r.id,
    cast_person_id: r.cast_person_id ?? null,
  }));

  // 5. Confirmed breakdown — only status='confirmed'; scoped via scene_ids
  //    (scene_characters / scene_elements have no project_id column).
  //    Skip the .in() query entirely when there are no scenes — empty-IN
  //    is undefined behaviour in some Postgres drivers.
  let sceneCharactersConfirmed: { scene_id: string; character_id: string }[] = [];
  let sceneElementsConfirmed: { scene_id: string; element_id: string }[] = [];

  if (sceneIds.length > 0) {
    const [scResult, seResult] = await Promise.all([
      client
        .from("scene_characters")
        .select("scene_id, character_id")
        .in("scene_id", sceneIds)
        .eq("status", "confirmed"),
      client
        .from("scene_elements")
        .select("scene_id, element_id")
        .in("scene_id", sceneIds)
        .eq("status", "confirmed"),
    ]);

    if (scResult.error) throw new Error(scResult.error.message, { cause: scResult.error });
    if (seResult.error) throw new Error(seResult.error.message, { cause: seResult.error });

    sceneCharactersConfirmed = (scResult.data ?? []).map((r) => ({
      scene_id: r.scene_id,
      character_id: r.character_id,
    }));
    sceneElementsConfirmed = (seResult.data ?? []).map((r) => ({
      scene_id: r.scene_id,
      element_id: r.element_id,
    }));
  }

  return {
    shootDays,
    strips,
    segments,
    scenes,
    sets,
    locations,
    sceneCharactersConfirmed,
    characters,
    sceneElementsConfirmed,
    castOverrides,
  };
}

// ---------------------------------------------------------------------------
// Engine-wiring read functions (Task 12)
// ---------------------------------------------------------------------------

/** Shape returned by getStripboard. */
export interface Stripboard {
  /** Shoot days ordered by ordinal. */
  shootDays: ShootDay[];
  /** Strips grouped by shoot_day_id, each group sorted by ordinal. */
  stripsByDay: Record<string, Strip[]>;
  /** Page-eighths totals per shoot day (only days that have scene strips). */
  eighths: EighthsRollup[];
  /** Company moves in shooting order. */
  moves: CompanyMove[];
}

/**
 * Assemble the full stripboard view for a project.
 *
 * Loads the schedule graph once, builds the stripsByDay index, then calls
 * the pure derivation engines for eighths rollup and company moves.
 * Nothing is persisted — derived on every read.
 */
export async function getStripboard(client: DbClient, projectId: string): Promise<Stripboard> {
  const graph = await loadScheduleGraph(client, projectId);

  // Shoot days sorted by ordinal (listShootDays already returns them ordered,
  // but be explicit for the contract).
  const shootDays = [...graph.shootDays].sort((a, b) => a.ordinal - b.ordinal);

  // Group strips by shoot_day_id, each group sorted by ordinal.
  const stripsByDay: Record<string, Strip[]> = {};
  for (const s of graph.strips) {
    const bucket = stripsByDay[s.shoot_day_id] ?? (stripsByDay[s.shoot_day_id] = []);
    bucket.push(s);
  }
  for (const bucket of Object.values(stripsByDay)) {
    bucket.sort((a, b) => a.ordinal - b.ordinal);
  }

  // Eighths rollup — Strip and SceneSegment are structurally compatible with
  // StripLike / SegmentLike (both have the required fields).
  const eighths = computeEighthsRollup(graph.strips, graph.segments);

  // Company moves — MovesGraph.shootDays requires date: string (non-null).
  // Filter undated shoot days before passing to the engine; those days have no
  // calendar position so they cannot contribute to move detection.
  const datedShootDays = graph.shootDays
    .filter((d): d is ShootDay & { date: string } => d.date !== null);

  const moves = computeCompanyMoves({
    shootDays: datedShootDays.map((d) => ({
      id: d.id,
      ordinal: d.ordinal,
      date: d.date,
    })),
    strips: graph.strips.map((s) => ({
      shoot_day_id: s.shoot_day_id,
      ordinal: s.ordinal,
      type: s.type,
      scene_segment_id: s.scene_segment_id,
    })),
    segments: graph.segments.map((s) => ({
      id: s.id,
      scene_id: s.scene_id,
    })),
    scenes: graph.scenes.map((s) => ({
      id: s.id,
      set_id: s.set_id,
    })),
    sets: graph.sets.map((s) => ({
      id: s.id,
      location_id: s.location_id,
    })),
  });

  return { shootDays, stripsByDay, eighths, moves };
}

/**
 * Return all scheduling conflicts for a project.
 *
 * Loads the schedule graph and runs the pure conflict-detection engine.
 * The engine detects:
 * - `cast`: a confirmed cast person required by ≥2 scene strips on the same date.
 * - `element`: a confirmed element required by ≥2 scene strips on the same date.
 * - `cast_status`: an actor with a derived work day AND a blocking cast-override
 *   (hold / travel / drop / idle) on the same date.
 */
export async function getConflicts(client: DbClient, projectId: string): Promise<Conflict[]> {
  const graph = await loadScheduleGraph(client, projectId);

  // ConflictGraph is structurally compatible with ScheduleGraph — every field
  // the engine needs (id, date, unit on shoot days; scene_id on segments;
  // person_id / date / status on castOverrides) is present on the loaded rows.
  return computeConflicts({
    shootDays: graph.shootDays.map((d) => ({
      id: d.id,
      date: d.date,
      unit: d.unit,
    })),
    strips: graph.strips.map((s) => ({
      shoot_day_id: s.shoot_day_id,
      type: s.type,
      scene_segment_id: s.scene_segment_id,
    })),
    segments: graph.segments.map((s) => ({
      id: s.id,
      scene_id: s.scene_id,
    })),
    sceneCharactersConfirmed: graph.sceneCharactersConfirmed,
    characters: graph.characters,
    sceneElementsConfirmed: graph.sceneElementsConfirmed,
    castOverrides: graph.castOverrides.map((o) => ({
      person_id: o.person_id,
      date: o.date,
      status: o.status,
    })),
  });
}

/**
 * Return the Day-Out-of-Days grid entries for a project.
 *
 * Loads the schedule graph and runs the pure DOOD derivation engine.
 * Returns one DoodEntry per (person, date) cell that should appear in the
 * DOOD report.
 *
 * companyOffDays: Phase 3 has no company-off-days table; defaults to [].
 * When the settings surface ships, pass them via `config.companyOffDays`.
 *
 * v1 defaults: hold days on (gaps → H), drop/pickup off, min gap = 2 calendar days.
 */
export async function getDOOD(
  client: DbClient,
  projectId: string,
  config?: ScheduleConfig,
): Promise<DoodEntry[]> {
  const graph = await loadScheduleGraph(client, projectId);

  // DoodGraph.shootDays requires date: string (non-null). Filter undated days —
  // the DOOD engine anchors all derivation to real calendar dates; undated days
  // have no position in the shoot sequence.
  const datedShootDays = graph.shootDays
    .filter((d): d is ShootDay & { date: string } => d.date !== null);

  const doodGraph = {
    shootDays: datedShootDays.map((d) => ({
      id: d.id,
      date: d.date,
      unit: d.unit,
      day_type: d.day_type,
    })),
    strips: graph.strips.map((s) => ({
      shoot_day_id: s.shoot_day_id,
      type: s.type,
      scene_segment_id: s.scene_segment_id,
    })),
    segments: graph.segments.map((s) => ({
      id: s.id,
      scene_id: s.scene_id,
    })),
    sceneCharactersConfirmed: graph.sceneCharactersConfirmed,
    characters: graph.characters,
    castOverrides: graph.castOverrides.map((o) => ({
      person_id: o.person_id,
      date: o.date,
      status: o.status,
    })),
    // Phase 3: no company-off-days table. Pass empty array as v1 default.
    // When a settings surface ships, populate this from config or a DB read.
    companyOffDays: config?.companyOffDays ?? [],
  };

  const doodConfig = {
    allowHoldDays: config?.allowHoldDays ?? true,
    allowDropPickup: config?.allowDropPickup ?? false,
    minDropPickupCalendarDays: config?.minDropPickupCalendarDays ?? 2,
  };

  return computeDOOD(doodGraph, doodConfig);
}

/**
 * Return the dated shoot days for the calendar month grid.
 *
 * Only shoot days with a non-null date are returned — undated days exist on
 * the stripboard but have no position in the calendar. Ordered by ordinal.
 */
export async function getCalendar(client: DbClient, projectId: string): Promise<ShootDay[]> {
  const days = await listShootDays(client, projectId);
  return days.filter((d) => d.date !== null);
}
