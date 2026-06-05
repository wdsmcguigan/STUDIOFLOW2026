"use client";

/**
 * GlobalsEditor — list existing budget globals and add/edit them.
 *
 * Globals are named constants (kind: rate | percent) referenced by lines
 * to keep rates centralised. Rate globals store a dollar amount; percent
 * globals store a decimal multiplier.
 *
 * Pattern: "use client", actions received as props typed
 * `(formData: FormData) => Promise<void>`, invoked via <form action={…}>.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BudgetGlobal } from "@/lib/budget/schema";

interface GlobalsEditorProps {
  projectId: string;
  budgetId: string;
  globals: BudgetGlobal[];
  createGlobalAction: (formData: FormData) => Promise<void>;
  updateGlobalAction: (formData: FormData) => Promise<void>;
}

/** Format a global value for display: rate → currency-style, percent → "×100%" */
function formatGlobalValue(g: BudgetGlobal): string {
  if (g.kind === "percent") {
    return `${(g.value * 100).toFixed(1)}%`;
  }
  return `$${g.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function GlobalsEditor({
  projectId,
  budgetId,
  globals,
  createGlobalAction,
  updateGlobalAction,
}: GlobalsEditorProps) {
  // Track which row is being edited (by id)
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Existing globals list */}
      {globals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-4 text-center text-xs text-[var(--tx-3)]">
          No globals yet — add one below.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--s1)]">
          {globals.map((g) =>
            editingId === g.id ? (
              // Inline edit row
              <li key={g.id} className="px-3 py-2">
                <form
                  action={async (fd) => {
                    await updateGlobalAction(fd);
                    setEditingId(null);
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="id" value={g.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={g.name}
                    required
                    maxLength={200}
                    aria-label="Global name"
                    className="h-7 w-36 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                  <select
                    name="kind"
                    defaultValue={g.kind}
                    aria-label="Kind"
                    className="h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <option value="rate">Rate ($)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                  <input
                    type="number"
                    name="value"
                    // percent globals are stored as decimal; show human percent for editing
                    defaultValue={g.kind === "percent" ? g.value * 100 : g.value}
                    step="any"
                    required
                    aria-label="Value"
                    className="h-7 w-24 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-right text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                  <Button type="submit" variant="ember" size="xs">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </form>
              </li>
            ) : (
              // Read-only row
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-xs font-medium text-[var(--tx)]">
                    {g.name}
                  </span>
                  <span className="shrink-0 rounded border border-[var(--line)] bg-[var(--s2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    {g.kind}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-[var(--tx-2)]">
                    {formatGlobalValue(g)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditingId(g.id)}
                  >
                    Edit
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {/* Add global form */}
      <form
        action={createGlobalAction}
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
            placeholder="e.g. Day Rate"
            aria-label="Global name"
            className="h-7 w-36 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]">
            Kind
          </label>
          <select
            name="kind"
            defaultValue="rate"
            aria-label="Kind"
            className="h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <option value="rate">Rate ($)</option>
            <option value="percent">Percent (%)</option>
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]">
            Value
          </label>
          <input
            type="number"
            name="value"
            required
            step="any"
            min="0"
            placeholder="0.00"
            aria-label="Value"
            className="h-7 w-24 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-right text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <span className="text-[10px] text-[var(--tx-3)]">
            % globals: enter 15 for 15%
          </span>
        </div>

        <Button type="submit" variant="ember" size="xs">
          Add global
        </Button>
      </form>
    </div>
  );
}
