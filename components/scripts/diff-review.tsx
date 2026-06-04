"use client";
import { Button } from "@/components/ui/button";
import { AIDot, AISurface } from "@/components/ui/ai-surface";
import type { SceneDiff } from "@/lib/scripts/schema";

// Classification labels — text is always paired with the status marker (never color alone)
const LABEL: Record<SceneDiff["classification"], string> = {
  unchanged: "Unchanged",
  modified: "Modified",
  new: "New",
  removed: "Removed → OMITTED",
  conflict: "Conflict",
};

// Left-border marker color per classification (status token → never used as sole indicator)
const MARKER_COLOR: Record<SceneDiff["classification"], string> = {
  new: "var(--ok)",
  removed: "var(--tx-3)",
  modified: "var(--brand)",
  unchanged: "var(--line-2)",
  conflict: "transparent", // conflict rows use the AI gradient spine instead
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
    <form action={confirmAction} className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1">
        <h2
          className="font-display text-[22px] font-extrabold tracking-[-0.3px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Review re-import
        </h2>
        <p className="text-[13px] leading-snug" style={{ color: "var(--tx-2)" }}>
          Nothing has been applied yet.{" "}
          <span style={{ color: "var(--tx-3)" }}>
            Review each change below, resolve any contested scenes, then confirm to apply.
          </span>
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hidden version id — travels with every conflict resolution choice  */}
      {/* ------------------------------------------------------------------ */}
      <input type="hidden" name="scriptVersionId" value={scriptVersionId} />

      {/* ------------------------------------------------------------------ */}
      {/* Classification rows                                                 */}
      {/* ------------------------------------------------------------------ */}
      <ul className="space-y-2">
        {diff.map((entry, i) => {
          const isConflict = entry.classification === "conflict";

          if (isConflict && entry.sceneId) {
            // Conflict rows render inside an AISurface (frosted glass + gradient trim + glow).
            // The gradient appears only as the 1px border trim and the 3px left spine.
            return (
              <li key={`${entry.sceneId ?? "new"}-${i}`}>
                <AISurface className="space-y-3 p-4">
                  {/* Row header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* AI dot marks this as the AI/suggestion surface */}
                      <AIDot />
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: "var(--ai-ink)" }}
                      >
                        {LABEL[entry.classification]}
                        {entry.parsed?.locationSlug
                          ? ` · ${entry.parsed.locationSlug}`
                          : ""}
                      </span>
                    </div>
                    {/* Confidence — mono percentage */}
                    <span
                      className="font-mono text-[11px] tabular-nums"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--tx-3)",
                      }}
                    >
                      {(entry.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>

                  {/* Side-by-side resolution panels */}
                  <fieldset className="grid gap-2 sm:grid-cols-2">
                    <legend className="sr-only">
                      Resolve: {entry.parsed?.locationSlug ?? "scene"}
                    </legend>

                    {/* Final Draft panel — pre-checked */}
                    <label
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors"
                      style={{
                        background: "var(--s2)",
                        borderColor: "var(--line-2)",
                      }}
                    >
                      <input
                        type="radio"
                        name={`resolve-${entry.sceneId}`}
                        value="final-draft"
                        defaultChecked
                        aria-label="Final Draft (incoming)"
                        className="mt-0.5 accent-[var(--brand)]"
                      />
                      <span className="min-w-0">
                        <span
                          className="block text-[11px] font-bold uppercase tracking-wide"
                          style={{ color: "var(--brand-on, var(--brand))" }}
                        >
                          Final Draft
                        </span>
                        <span
                          className="block text-[10px] font-medium"
                          style={{ color: "var(--tx-3)" }}
                        >
                          incoming
                        </span>
                        <span
                          className="mt-1.5 block text-[12.5px] leading-snug"
                          style={{ color: "var(--tx)" }}
                        >
                          {entry.parsed?.bodyText}
                        </span>
                      </span>
                    </label>

                    {/* In-app edit panel */}
                    <label
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors"
                      style={{
                        background: "var(--s2)",
                        borderColor: "var(--line-2)",
                      }}
                    >
                      <input
                        type="radio"
                        name={`resolve-${entry.sceneId}`}
                        value="in-app"
                        aria-label="In-app edit (retained in history)"
                        className="mt-0.5 accent-[var(--brand)]"
                      />
                      <span className="min-w-0">
                        <span
                          className="block text-[11px] font-bold uppercase tracking-wide"
                          style={{ color: "var(--tx-2)" }}
                        >
                          In-app edit
                        </span>
                        <span
                          className="block text-[10px] font-medium"
                          style={{ color: "var(--tx-3)" }}
                        >
                          retained in history
                        </span>
                        <span
                          className="mt-1.5 block text-[12.5px] leading-snug"
                          style={{ color: "var(--tx-2)" }}
                        >
                          {inAppByScene[entry.sceneId] ?? "(no recorded prose)"}
                        </span>
                      </span>
                    </label>
                  </fieldset>
                </AISurface>
              </li>
            );
          }

          // Standard classification rows — --s2 surface with status-tinted left marker
          return (
            <li
              key={`${entry.sceneId ?? "new"}-${i}`}
              className="row-pad flex items-center gap-3 rounded-[9px] border"
              style={{
                background: "var(--s2)",
                borderColor: "var(--line)",
                borderLeftWidth: "3px",
                borderLeftColor: MARKER_COLOR[entry.classification],
                paddingLeft: "11px",
                paddingRight: "11px",
              }}
            >
              {/* Status label — always text + color marker (never color alone) */}
              <span
                className="text-[12px] font-semibold"
                style={{ color: "var(--tx)" }}
              >
                {LABEL[entry.classification]}
                {entry.parsed?.locationSlug
                  ? (
                    <>
                      {" "}
                      <span style={{ color: "var(--tx-3)" }}>
                        · {entry.parsed.locationSlug}
                      </span>
                    </>
                  )
                  : null}
              </span>

              {/* Confidence for modified — mono percentage */}
              {entry.classification === "modified" ? (
                <span
                  className="ml-auto font-mono text-[11px] tabular-nums"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--tx-3)",
                  }}
                >
                  {(entry.confidence * 100).toFixed(0)}% confidence
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* ------------------------------------------------------------------ */}
      {/* Confirm — ember button (amber = action, not AI)                    */}
      {/* ------------------------------------------------------------------ */}
      <Button type="submit" variant="ember">
        Confirm import
      </Button>
    </form>
  );
}
