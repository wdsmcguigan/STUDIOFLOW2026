import type { CompanyMove } from "@/lib/schedule/schema";

/**
 * Minimal structural input the company-move detector needs. Kept inline (not
 * the DB/ScheduleGraph types) so the engine stays decoupled and is trivially
 * testable with plain objects — mirroring eighths.ts / conflicts.ts / dood.ts.
 */
export interface MovesGraph {
  shootDays: { id: string; ordinal: number; date: string }[];
  strips: {
    shoot_day_id: string;
    ordinal: number;
    type: string;
    scene_segment_id: string | null;
  }[];
  segments: { id: string; scene_id: string }[];
  scenes: { id: string; set_id: string | null }[];
  sets: { id: string; location_id: string | null }[];
}

/**
 * Pure: detect company moves in shooting order.
 *
 * A *company move* is the production physically relocating between consecutive
 * scenes whose Sets belong to DIFFERENT parent Locations. Strips are walked in
 * board order — (shoot day ordinal, then strip ordinal) — NOT array order. For
 * each `type === "scene"` strip we resolve segment → scene → set_id →
 * location_id. When the location_id changes between two consecutive *resolvable*
 * scene strips, a move is emitted with `date` = the date of the shoot day the
 * later strip belongs to.
 *
 * Non-scene strips (day breaks, banners) are skipped: they neither trigger nor
 * reset move detection.
 *
 * Null policy: a scene with a null set_id, an unknown set, or a set with a null
 * location_id is *unresolvable*. Unresolvable scene strips are skipped entirely
 * — they are treated as gaps. We never compare against an unresolvable location,
 * so a null↔non-null transition is never a move; the next resolvable scene is
 * compared against the previous resolvable one. This keeps spurious "moves" out
 * of partially-set-dressed boards.
 *
 * `date` is typed `string` on CompanyMove; shoot days are expected to be dated
 * in the realistic case, so we use the resolved day date as-is.
 *
 * No DB, no Date, no I/O — deterministic given its inputs.
 */
export function computeCompanyMoves(graph: MovesGraph): CompanyMove[] {
  const dayById = new Map(graph.shootDays.map((d) => [d.id, d]));
  const sceneById = new Map(graph.scenes.map((s) => [s.id, s]));
  const segmentById = new Map(graph.segments.map((g) => [g.id, g]));
  const setById = new Map(graph.sets.map((s) => [s.id, s]));

  // Board order: shoot day ordinal, then strip ordinal. Days missing from the
  // index sort last (Infinity) so unresolved-day strips don't jump the queue.
  const ordered = [...graph.strips].sort((a, b) => {
    const da = dayById.get(a.shoot_day_id)?.ordinal ?? Number.POSITIVE_INFINITY;
    const db = dayById.get(b.shoot_day_id)?.ordinal ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.ordinal - b.ordinal;
  });

  const moves: CompanyMove[] = [];
  let prev: { setId: string; locationId: string } | null = null;

  for (const strip of ordered) {
    if (strip.type !== "scene" || strip.scene_segment_id === null) continue;

    const segment = segmentById.get(strip.scene_segment_id);
    if (!segment) continue;
    const scene = sceneById.get(segment.scene_id);
    if (!scene || scene.set_id === null) continue;
    const set = setById.get(scene.set_id);
    if (!set || set.location_id === null) continue;

    const cur = { setId: set.id, locationId: set.location_id };

    if (prev !== null && prev.locationId !== cur.locationId) {
      const day = dayById.get(strip.shoot_day_id);
      moves.push({
        date: day?.date ?? "",
        fromSetId: prev.setId,
        toSetId: cur.setId,
      });
    }

    prev = cur;
  }

  return moves;
}
