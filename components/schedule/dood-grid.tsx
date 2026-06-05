import type { DoodEntry } from "@/lib/schedule/schema";
import { DoodCell } from "./dood-cell";

/**
 * Day-Out-of-Days grid — cast rows × dated-day columns (the EP / Movie Magic
 * convention). Read-only render of getDOOD() output; the ONLY write is setting
 * a cast override, which posts a tiny per-cell <form> to setCastOverrideAction
 * (see DoodCell).
 *
 * Thin client: derivation (S/W/F/H/…) runs server-side. This component lays the
 * derived (and override) cells out and exposes the override-set affordance.
 *
 * Override-aware: a cell whose source is "override" wins over the derived value
 * AND is visually marked — an accent ring + a small corner dot — so a planner
 * can tell at a glance which cells were hand-set vs. derived from the board.
 *
 * Columns: passed explicitly from the page (the dated shoot days) for stable
 * ordering; falls back to the distinct dates present in `entries`.
 */
interface DoodGridProps {
  entries: DoodEntry[];
  /** person_id → display name. Missing → short id fallback. */
  personLabels: Record<string, string>;
  /**
   * Stable column dates (ISO yyyy-MM-dd), in order. Usually the dated shoot
   * days. If omitted, derived from the distinct dates in `entries`.
   */
  dates?: string[];
  projectId: string;
  setCastOverrideAction: (formData: FormData) => Promise<void>;
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function DoodGrid({
  entries,
  personLabels,
  dates,
  projectId,
  setCastOverrideAction,
}: DoodGridProps) {
  // Columns: explicit list (stable) or distinct dates from the entries.
  const columnDates =
    dates && dates.length > 0
      ? [...dates].sort((a, b) => a.localeCompare(b))
      : [...new Set(entries.map((e) => e.date))].sort((a, b) =>
          a.localeCompare(b),
        );

  // Rows: distinct personIds, sorted by display label for a stable, readable order.
  const personIds = [...new Set(entries.map((e) => e.personId))].sort((a, b) =>
    (personLabels[a] ?? a).localeCompare(personLabels[b] ?? b),
  );

  // (personId, date) → entry, for O(1) cell lookup.
  const cellByKey = new Map<string, DoodEntry>();
  for (const e of entries) cellByKey.set(`${e.personId} ${e.date}`, e);

  const empty = personIds.length === 0 || columnDates.length === 0;

  return (
    <section
      aria-labelledby="dood-grid-heading"
      className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <header className="flex items-center justify-between gap-3">
        <h2
          id="dood-grid-heading"
          className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
        >
          Day Out of Days
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--tx-3)]">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--brand)]/30"
          />
          override
        </span>
      </header>

      {empty ? (
        <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-6 text-center text-sm text-[var(--tx-3)]">
          No cast days yet — schedule scenes with confirmed cast on dated shoot
          days and their DOOD codes appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]"
                >
                  Cast
                </th>
                {columnDates.map((d) => (
                  <th
                    key={d}
                    scope="col"
                    className="whitespace-nowrap px-2 py-2 text-center font-mono text-[11px] font-semibold text-[var(--tx-2)]"
                  >
                    {/* MM-DD — the year is implied by the shoot window. */}
                    {d.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personIds.map((personId) => (
                <tr key={personId} className="border-t border-[var(--line)]">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-[12rem] truncate bg-card px-3 py-1.5 text-left font-medium text-[var(--tx)]"
                    title={personLabels[personId] ?? personId}
                  >
                    {personLabels[personId] ?? shortId(personId)}
                  </th>
                  {columnDates.map((date) => {
                    const entry = cellByKey.get(`${personId} ${date}`);
                    return (
                      <DoodCell
                        key={date}
                        personId={personId}
                        date={date}
                        entry={entry}
                        projectId={projectId}
                        setCastOverrideAction={setCastOverrideAction}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
