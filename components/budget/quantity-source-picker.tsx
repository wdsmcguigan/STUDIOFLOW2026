"use client";

/**
 * QuantitySourcePicker — per-line control for binding a line to the
 * production graph or managing it manually.
 *
 * Combines three concerns in one panel:
 *   1. Quantity source: kind selector + params (element_count / shoot_day_count /
 *      dood_cast_days / manual). Client state switches which param inputs render.
 *   2. Rate: manual number input OR a budget global selector.
 *   3. Fringe bindings: checkbox list of the budget's fringes.
 *
 * Pattern: "use client", actions as props typed `(formData: FormData) => Promise<void>`.
 * The picker submits each concern via its own <form action={…}> to keep FormData clean.
 *
 * Percent convention: fringes display percent × 100 (human-readable). All
 * conversion happens at the action boundary — no math here.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BudgetGlobal, Fringe } from "@/lib/budget/schema";
import type { ElementCategory, Department, Person } from "@/lib/breakdown/schema";

// The 7 shoot-day types from lib/schedule/schema dayType enum
const DAY_TYPES = ["prep", "prelight", "build", "shoot", "strike", "travel", "wrap"] as const;
type DayType = (typeof DAY_TYPES)[number];

type QuantityKind = "manual" | "element_count" | "shoot_day_count" | "dood_cast_days";

interface QuantitySourcePickerProps {
  projectId: string;
  lineId: string;
  /** Current quantity (manual) */
  currentQuantity: number | null;
  /** Current quantity source kind, null = manual */
  currentSourceKind: QuantityKind | null;
  /** Current rate global id, null = manual rate */
  currentRateGlobalId: string | null;
  /** Current manual rate */
  currentRate: number | null;
  /** Fringe ids currently attached to this line */
  currentFringeIds: string[];
  /** Budget globals available for rate binding */
  globals: BudgetGlobal[];
  /** Budget fringes available for binding */
  fringes: Fringe[];
  /** Breakdown element categories for element_count params */
  categories: ElementCategory[];
  /** Breakdown departments for element_count params */
  departments: Department[];
  /** Breakdown people for dood_cast_days params */
  people: Person[];
  // Actions
  setLineQuantitySourceAction: (formData: FormData) => Promise<void>;
  updateLineAction: (formData: FormData) => Promise<void>;
  setLineRateGlobalAction: (formData: FormData) => Promise<void>;
  setLineFringesAction: (formData: FormData) => Promise<void>;
}

export function QuantitySourcePicker({
  projectId,
  lineId,
  currentQuantity,
  currentSourceKind,
  currentRateGlobalId,
  currentRate,
  currentFringeIds,
  globals,
  fringes,
  categories,
  departments,
  people,
  setLineQuantitySourceAction,
  updateLineAction,
  setLineRateGlobalAction,
  setLineFringesAction,
}: QuantitySourcePickerProps) {
  const [kind, setKind] = useState<QuantityKind>(currentSourceKind ?? "manual");
  const [useGlobalRate, setUseGlobalRate] = useState<boolean>(currentRateGlobalId !== null);

  const inputCls =
    "h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  return (
    <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--s1)] p-3">
      {/* ── 1. Quantity source ── */}
      <section aria-labelledby={`qs-heading-${lineId}`}>
        <h4
          id={`qs-heading-${lineId}`}
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]"
        >
          Quantity source
        </h4>

        <form action={setLineQuantitySourceAction} className="space-y-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="lineId" value={lineId} />

          {/* Kind selector */}
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as QuantityKind)}
            aria-label="Quantity source kind"
            className={inputCls + " w-full"}
          >
            <option value="manual">Manual</option>
            <option value="element_count">Element count</option>
            <option value="shoot_day_count">Shoot day count</option>
            <option value="dood_cast_days">DOOD cast days</option>
          </select>

          {/* Param inputs — only the relevant one is rendered */}
          {kind === "element_count" && (
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                <label className="text-[10px] text-[var(--tx-3)]">Category</label>
                <select name="categoryId" aria-label="Element category" className={inputCls + " w-full"}>
                  <option value="">Any category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                <label className="text-[10px] text-[var(--tx-3)]">Department</label>
                <select name="department" aria-label="Department" className={inputCls + " w-full"}>
                  <option value="">Any department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {kind === "shoot_day_count" && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--tx-3)]">Day type filter</label>
              <select name="dayType" aria-label="Day type" className={inputCls + " w-full"}>
                <option value="">All day types</option>
                {DAY_TYPES.map((dt: DayType) => (
                  <option key={dt} value={dt}>
                    {dt.charAt(0).toUpperCase() + dt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === "dood_cast_days" && (
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--tx-3)]">Cast person (required)</label>
              <select name="personId" required={kind === "dood_cast_days"} aria-label="Cast person" className={inputCls + " w-full"}>
                <option value="">Select person…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" variant="secondary" size="xs">
            Apply source
          </Button>
        </form>

        {/* Manual quantity — only when kind is manual */}
        {kind === "manual" && (
          <form action={updateLineAction} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="id" value={lineId} />
            <label className="text-[10px] text-[var(--tx-3)]" htmlFor={`qty-${lineId}`}>
              Quantity
            </label>
            <input
              id={`qty-${lineId}`}
              type="number"
              name="quantity"
              defaultValue={currentQuantity ?? ""}
              step="any"
              min="0"
              aria-label="Manual quantity"
              className={inputCls + " w-24 text-right"}
            />
            <Button type="submit" variant="ghost" size="xs">
              Set
            </Button>
          </form>
        )}
      </section>

      {/* ── 2. Rate ── */}
      <section aria-labelledby={`rate-heading-${lineId}`}>
        <h4
          id={`rate-heading-${lineId}`}
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]"
        >
          Rate
        </h4>

        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--tx-2)] cursor-pointer">
            <input
              type="checkbox"
              checked={useGlobalRate}
              onChange={(e) => setUseGlobalRate(e.target.checked)}
              className="rounded border-[var(--line-2)]"
            />
            Use global rate
          </label>
        </div>

        {useGlobalRate ? (
          // Global rate picker
          <form action={setLineRateGlobalAction} className="flex items-center gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="lineId" value={lineId} />
            <select
              name="rateGlobalId"
              defaultValue={currentRateGlobalId ?? ""}
              aria-label="Rate global"
              className={inputCls + " flex-1"}
            >
              <option value="">— Manual rate —</option>
              {globals
                .filter((g) => g.kind === "rate")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (${g.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </option>
                ))}
            </select>
            <Button type="submit" variant="secondary" size="xs">
              Apply
            </Button>
          </form>
        ) : (
          // Manual rate input.
          // When the user sets a manual rate we must also clear any previously stored
          // rate_global_id — otherwise the engine keeps using the global even though
          // the UI shows the manual field. We do this by calling setLineRateGlobalAction
          // with an empty rateGlobalId (empty string → undefined → null in the action)
          // alongside updateLineAction.
          <form
            action={async (fd: FormData) => {
              // 1. Clear the global rate binding (empty rateGlobalId → null in DB).
              const clearFd = new FormData();
              clearFd.set("projectId", projectId);
              clearFd.set("lineId", lineId);
              // rateGlobalId intentionally omitted → action treats as undefined → null
              await setLineRateGlobalAction(clearFd);
              // 2. Persist the manual rate.
              await updateLineAction(fd);
            }}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="id" value={lineId} />
            <input
              type="number"
              name="rate"
              defaultValue={currentRate ?? ""}
              step="any"
              min="0"
              placeholder="0.00"
              aria-label="Manual rate"
              className={inputCls + " w-24 text-right"}
            />
            <Button type="submit" variant="ghost" size="xs">
              Set rate
            </Button>
          </form>
        )}
      </section>

      {/* ── 3. Fringe bindings ── */}
      {fringes.length > 0 && (
        <section aria-labelledby={`fringes-heading-${lineId}`}>
          <h4
            id={`fringes-heading-${lineId}`}
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]"
          >
            Applied fringes
          </h4>

          <form action={setLineFringesAction} className="space-y-1">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="lineId" value={lineId} />

            {fringes.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 cursor-pointer text-xs text-[var(--tx)]"
              >
                <input
                  type="checkbox"
                  name="fringeIds"
                  value={f.id}
                  defaultChecked={currentFringeIds.includes(f.id)}
                  className="rounded border-[var(--line-2)]"
                />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="shrink-0 font-mono text-[var(--tx-3)]">
                  {(f.percent * 100).toFixed(1)}%
                </span>
              </label>
            ))}

            <div className="pt-1">
              <Button type="submit" variant="secondary" size="xs">
                Save fringes
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
