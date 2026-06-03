import type { SceneDiff } from "@/lib/scripts/schema";

/** Given the reconciliation diff and the set of scene ids that were edited
 *  in-app under the active revision set, upgrade any `modified` entry whose
 *  scene was also edited in-app to a `conflict`. Pure. */
export function markConflicts(
  diff: SceneDiff[],
  inAppEditedSceneIds: Set<string>,
): SceneDiff[] {
  return diff.map((entry) =>
    entry.classification === "modified" && entry.sceneId && inAppEditedSceneIds.has(entry.sceneId)
      ? { ...entry, classification: "conflict" as const }
      : entry,
  );
}
