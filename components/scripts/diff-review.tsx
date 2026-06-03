"use client";
import { Button } from "@/components/ui/button";
import type { SceneDiff } from "@/lib/scripts/schema";

const LABEL: Record<SceneDiff["classification"], string> = {
  unchanged: "Unchanged",
  modified: "Modified",
  new: "New",
  removed: "Removed → OMITTED",
  conflict: "Conflict",
};

export function DiffReview({
  scriptVersionId,
  diff,
  inAppByScene,
  confirmAction,
}: {
  scriptVersionId: string;
  diff: SceneDiff[];
  inAppByScene: Record<string, string>;
  confirmAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    // Single form so the staged version id AND every per-conflict resolution
    // choice travel together to the confirm (apply) action.
    <form action={confirmAction} className="space-y-4">
      <input type="hidden" name="scriptVersionId" value={scriptVersionId} />
      <ul className="space-y-2">
        {diff.map((entry, i) => (
          <li key={`${entry.sceneId ?? "new"}-${i}`} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {LABEL[entry.classification]}
                {entry.parsed?.locationSlug ? ` · ${entry.parsed.locationSlug}` : ""}
              </span>
              {entry.classification === "modified" || entry.classification === "conflict" ? (
                <span className="text-xs text-muted-foreground">
                  confidence {(entry.confidence * 100).toFixed(0)}%
                </span>
              ) : null}
            </div>

            {entry.classification === "conflict" && entry.sceneId ? (
              <fieldset className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded border p-2">
                  <input
                    type="radio"
                    name={`resolve-${entry.sceneId}`}
                    value="final-draft"
                    defaultChecked
                    aria-label="Final Draft (incoming)"
                  />
                  <span>
                    <span className="block text-xs font-semibold">Final Draft (incoming)</span>
                    <span className="block text-sm">{entry.parsed?.bodyText}</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded border p-2">
                  <input
                    type="radio"
                    name={`resolve-${entry.sceneId}`}
                    value="in-app"
                    aria-label="In-app edit (retained in history)"
                  />
                  <span>
                    <span className="block text-xs font-semibold">In-app edit (retained)</span>
                    <span className="block text-sm">{inAppByScene[entry.sceneId] ?? "(no recorded prose)"}</span>
                  </span>
                </label>
              </fieldset>
            ) : null}
          </li>
        ))}
      </ul>
      <Button type="submit">Confirm import</Button>
    </form>
  );
}
