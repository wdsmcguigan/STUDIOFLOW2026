"use client";

/**
 * FringesEditor — list existing fringes and add new ones.
 *
 * Fringes are percentage add-ons applied per-line (e.g. payroll taxes, union
 * benefits). Stored as decimals (0.15 = 15%); the action boundary converts
 * the human-percent input (0–100) to decimal before writing.
 *
 * Pattern: "use client", actions as props, <form action={…}>.
 */

import { Button } from "@/components/ui/button";
import type { Fringe } from "@/lib/budget/schema";

interface FringesEditorProps {
  projectId: string;
  budgetId: string;
  fringes: Fringe[];
  createFringeAction: (formData: FormData) => Promise<void>;
}

export function FringesEditor({
  projectId,
  budgetId,
  fringes,
  createFringeAction,
}: FringesEditorProps) {
  return (
    <div className="space-y-4">
      {/* Existing fringes list */}
      {fringes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-4 text-center text-xs text-[var(--tx-3)]">
          No fringes yet — add one below.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--s1)]">
          {fringes.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="truncate text-xs font-medium text-[var(--tx)]">
                {f.name}
              </span>
              <span className="shrink-0 font-mono text-xs font-semibold text-[var(--tx-2)]">
                {(f.percent * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Add fringe form */}
      {/* percent input accepts human value (e.g. 15 for 15%); action converts to decimal */}
      <form
        action={createFringeAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--line)] bg-[var(--s1)] px-3 py-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="budgetId" value={budgetId} />

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]">
            Name
          </label>
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            placeholder="e.g. Payroll Tax"
            aria-label="Fringe name"
            className="h-7 w-36 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]">
            % (e.g. 15 for 15%)
          </label>
          <input
            type="number"
            name="percent"
            required
            step="0.1"
            min="0"
            max="1000"
            placeholder="15"
            aria-label="Fringe percent"
            className="h-7 w-20 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-right text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>

        <Button type="submit" variant="ember" size="xs">
          Add fringe
        </Button>
      </form>
    </div>
  );
}
