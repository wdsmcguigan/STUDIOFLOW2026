import type { EighthsRollup } from "@/lib/schedule/schema";

/**
 * Minimal structural shape of a stripboard strip needed for the eighths
 * rollup. Kept inline (not the DB/Strip type) so the engine stays decoupled
 * and trivially testable with plain objects.
 */
interface StripLike {
  shoot_day_id: string;
  type: string;
  scene_segment_id: string | null;
}

/** Minimal structural shape of a scene segment needed for the rollup. */
interface SegmentLike {
  id: string;
  page_eighths: number;
}

/**
 * Pure: sum page-eighths per shoot day from scene strips.
 *
 * Only strips with `type === "scene"` and a non-null `scene_segment_id`
 * contribute. A strip whose segment id has no matching segment contributes 0.
 * Non-scene strips (day breaks, banners) contribute 0. A shoot day with no
 * scene strips is omitted entirely. Insertion order (first-seen shoot day)
 * is preserved for deterministic output.
 *
 * No DB, no Date, no I/O — deterministic given its inputs.
 */
export function computeEighthsRollup(
  strips: StripLike[],
  segments: SegmentLike[],
): EighthsRollup[] {
  const eighthsBySegment = new Map<string, number>();
  for (const segment of segments) {
    eighthsBySegment.set(segment.id, segment.page_eighths);
  }

  const totals = new Map<string, number>();
  for (const strip of strips) {
    if (strip.type !== "scene" || strip.scene_segment_id === null) continue;
    const eighths = eighthsBySegment.get(strip.scene_segment_id) ?? 0;
    totals.set(strip.shoot_day_id, (totals.get(strip.shoot_day_id) ?? 0) + eighths);
  }

  return Array.from(totals, ([shootDayId, eighths]) => ({ shootDayId, eighths }));
}
