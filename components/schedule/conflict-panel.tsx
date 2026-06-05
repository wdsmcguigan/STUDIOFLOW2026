import type { Conflict, ConflictType } from "@/lib/schedule/schema";

/**
 * Conflict panel — read-only render of getConflicts() output.
 *
 * Thin client: the pure engine detects conflicts server-side; this component
 * just groups + labels them. Grouped by date, then by type (cast / element /
 * cast_status). resourceId / segmentIds are UUIDs — human labels come from the
 * `labels` maps assembled in the page (personId→name, elementId→name); a short
 * id is the fallback when a label is missing.
 *
 * Severity is conveyed with design-system destructive / amber tokens — no
 * hardcoded colors so the panel stays on-theme in both Umber (dark) and Kraft
 * (light) modes.
 */

interface ConflictPanelLabels {
  /** person_id → display name (cast + cast_status conflicts). */
  person: Record<string, string>;
  /** element_id → display name (element conflicts). */
  element: Record<string, string>;
}

interface ConflictPanelProps {
  conflicts: Conflict[];
  labels: ConflictPanelLabels;
}

/** Short id fallback when no human label is available. */
function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/** Human copy + token treatment per conflict type. */
const TYPE_META: Record<
  ConflictType,
  { label: string; badge: string }
> = {
  // Double-booked actor — hard scheduling break → destructive token.
  cast: {
    label: "Cast double-booked",
    badge:
      "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]",
  },
  // Double-booked element — hard break → destructive token.
  element: {
    label: "Element double-booked",
    badge:
      "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]",
  },
  // Override vs. derived work day — a planning warning → amber action token.
  cast_status: {
    label: "Availability clash",
    badge:
      "border-[var(--brand-line)] bg-[var(--brand-soft)] text-[var(--brand-on)]",
  },
};

function resourceLabel(c: Conflict, labels: ConflictPanelLabels): string {
  if (c.resourceLabel) return c.resourceLabel;
  if (c.type === "element") return labels.element[c.resourceId] ?? shortId(c.resourceId);
  return labels.person[c.resourceId] ?? shortId(c.resourceId);
}

export function ConflictPanel({ conflicts, labels }: ConflictPanelProps) {
  // Group by date (ascending — the engine already sorts, but be explicit).
  const byDate = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    const bucket = byDate.get(c.date);
    if (bucket) bucket.push(c);
    else byDate.set(c.date, [c]);
  }
  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <section
      aria-labelledby="conflict-panel-heading"
      className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="conflict-panel-heading"
          className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
        >
          Conflicts
        </h2>
        <span className="text-xs font-medium text-[var(--tx-3)]">
          {conflicts.length === 0
            ? "All clear"
            : `${conflicts.length} flagged`}
        </span>
      </header>

      {conflicts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-6 text-center text-sm text-[var(--tx-3)]">
          No conflicts — cast and elements are free on every scheduled date.
        </p>
      ) : (
        <ul className="space-y-4">
          {dates.map((date) => (
            <li key={date} className="space-y-2">
              <h3 className="font-mono text-xs font-semibold text-[var(--tx-2)]">
                {date}
              </h3>
              <ul className="space-y-1.5">
                {byDate.get(date)!.map((c, i) => (
                  <ConflictRow
                    key={`${c.type}:${c.resourceId}:${i}`}
                    conflict={c}
                    label={resourceLabel(c, labels)}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConflictRow({ conflict, label }: { conflict: Conflict; label: string }) {
  const meta = TYPE_META[conflict.type];
  const segCount = conflict.segmentIds.length;
  const unitText =
    conflict.type === "cast_status"
      ? null
      : conflict.unit
        ? conflict.unit
        : "cross-unit";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[var(--line)] bg-[var(--s2)] px-3 py-2 text-sm">
      <span
        className={`inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-[0.5px] ${meta.badge}`}
      >
        {meta.label}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-[var(--tx)]">
        {label}
      </span>
      {conflict.type === "cast_status" && conflict.detail ? (
        <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--brand-on)]">
          {conflict.detail}
        </span>
      ) : null}
      {unitText ? (
        <span className="shrink-0 text-[11px] font-medium text-[var(--tx-3)]">
          {unitText}
        </span>
      ) : null}
      <span
        className="shrink-0 font-mono text-[11px] text-[var(--tx-3)]"
        title={conflict.segmentIds.join(", ")}
      >
        {segCount} {segCount === 1 ? "segment" : "segments"}
      </span>
    </li>
  );
}
