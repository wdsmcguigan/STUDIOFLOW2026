import { contentHash } from "@/lib/scripts/hash";
import type { ParsedScene, SceneDiff } from "@/lib/scripts/schema";

/** The existing-scene view the matcher needs (assembled by the data layer
 *  from `scenes` + their latest `scene_sources.content_hash`). */
export interface ExistingScene {
  sceneId: string;
  sceneNumber: string | null;
  numberLocked: boolean;
  contentHash: string;
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
  bodyText: string;
  ordinal: number;
}

function slugKey(s: {
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
}): string {
  return [s.intExt ?? "", s.locationSlug ?? "", s.timeOfDay ?? ""].join("|").toUpperCase();
}

/** Tier 3 is supplied by Task 10; until then this returns no fuzzy matches. */
export type FuzzyMatcher = (
  remainingExisting: ExistingScene[],
  remainingParsed: ParsedScene[],
) => Array<{ sceneId: string; parsedOrdinal: number; confidence: number }>;

const noFuzzy: FuzzyMatcher = () => [];

export function reconcile(
  existing: ExistingScene[],
  parsed: ParsedScene[],
  fuzzy: FuzzyMatcher = noFuzzy,
): SceneDiff[] {
  const diff: SceneDiff[] = [];
  const usedExisting = new Set<string>();
  const usedParsed = new Set<number>();

  // ---- Tier 1: locked-number key join (both sides locked & numbered). ----
  const existingByLockedNumber = new Map<string, ExistingScene>();
  for (const e of existing) {
    if (e.numberLocked && e.sceneNumber) existingByLockedNumber.set(e.sceneNumber, e);
  }
  for (const p of parsed) {
    if (!p.sceneNumber) continue;
    const e = existingByLockedNumber.get(p.sceneNumber);
    if (!e || usedExisting.has(e.sceneId)) continue;
    usedExisting.add(e.sceneId);
    usedParsed.add(p.ordinal);
    diff.push({
      classification: e.contentHash === contentHash(p) ? "unchanged" : "modified",
      sceneId: e.sceneId,
      confidence: 1,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }

  // ---- Tier 2: slugline + content hash. ----
  // 2a: exact content-hash match (unchanged).
  const remainingExisting = existing.filter((e) => !usedExisting.has(e.sceneId));
  const existingByHash = new Map<string, ExistingScene[]>();
  for (const e of remainingExisting) {
    const list = existingByHash.get(e.contentHash) ?? [];
    list.push(e);
    existingByHash.set(e.contentHash, list);
  }
  for (const p of parsed) {
    if (usedParsed.has(p.ordinal)) continue;
    const bucket = existingByHash.get(contentHash(p));
    const e = bucket?.find((c) => !usedExisting.has(c.sceneId));
    if (!e) continue;
    usedExisting.add(e.sceneId);
    usedParsed.add(p.ordinal);
    diff.push({
      classification: "unchanged",
      sceneId: e.sceneId,
      confidence: 1,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }

  // 2b: same slugline, different body (modified).
  const existingBySlug = new Map<string, ExistingScene[]>();
  for (const e of existing) {
    if (usedExisting.has(e.sceneId)) continue;
    const list = existingBySlug.get(slugKey(e)) ?? [];
    list.push(e);
    existingBySlug.set(slugKey(e), list);
  }
  for (const p of parsed) {
    if (usedParsed.has(p.ordinal)) continue;
    const bucket = existingBySlug.get(slugKey(p));
    const e = bucket?.find((c) => !usedExisting.has(c.sceneId));
    if (!e) continue;
    usedExisting.add(e.sceneId);
    usedParsed.add(p.ordinal);
    diff.push({
      classification: "modified",
      sceneId: e.sceneId,
      confidence: 1,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }

  // ---- Tier 3: fuzzy similarity (Task 10). ----
  const tier3 = fuzzy(
    existing.filter((e) => !usedExisting.has(e.sceneId)),
    parsed.filter((p) => !usedParsed.has(p.ordinal)),
  );
  for (const m of tier3) {
    if (usedExisting.has(m.sceneId) || usedParsed.has(m.parsedOrdinal)) continue;
    const p = parsed.find((x) => x.ordinal === m.parsedOrdinal)!;
    usedExisting.add(m.sceneId);
    usedParsed.add(m.parsedOrdinal);
    diff.push({
      classification: "modified",
      sceneId: m.sceneId,
      confidence: m.confidence,
      parsedOrdinal: m.parsedOrdinal,
      parsed: p,
    });
  }

  // ---- Leftovers: unmatched parsed = new; unmatched existing = removed. ----
  for (const p of parsed) {
    if (usedParsed.has(p.ordinal)) continue;
    diff.push({
      classification: "new",
      sceneId: null,
      confidence: 0,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }
  for (const e of existing) {
    if (usedExisting.has(e.sceneId)) continue;
    diff.push({
      classification: "removed",
      sceneId: e.sceneId,
      confidence: 0,
      parsedOrdinal: null,
      parsed: null,
    });
  }

  return diff;
}
