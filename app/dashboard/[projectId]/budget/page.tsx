import { createClient } from "@/lib/supabase/server";
import {
  getBudgetPageData,
} from "@/lib/budget/data";
import {
  listElementCategories,
  listDepartments,
  listPeople,
} from "@/lib/breakdown/data";
import { Button } from "@/components/ui/button";
import { TopSheet } from "@/components/budget/top-sheet";
import { AccountDetail } from "@/components/budget/account-detail";
import { GlobalsEditor } from "@/components/budget/globals-editor";
import { FringesEditor } from "@/components/budget/fringes-editor";
import { QuantitySourcePicker } from "@/components/budget/quantity-source-picker";
import { ActualsLedger } from "@/components/budget/actuals-ledger";
import {
  seedDefaultChartAction,
  createGlobalAction,
  updateGlobalAction,
  createFringeAction,
  setContingencyAction,
  setLineQuantitySourceAction,
  updateLineAction,
  setLineRateGlobalAction,
  setLineFringesAction,
  addCostEntryAction,
} from "./actions";
import type { QuantitySource } from "@/lib/budget/schema";

/**
 * Budget page — server component.
 *
 * Loads derived-on-read engine output (TopSheet + AccountRollup[]) plus the raw
 * budget bundle for fringe metadata and the derived-line id set. Also loads
 * breakdown taxonomy (categories, departments, people) for the quantity-source
 * picker and mounts the globals/fringes editors + contingency control.
 *
 * Thin client / smart server: all derivation happens server-side. The components
 * below render engine output and capture form input → server actions.
 *
 * Empty-chart affordance: if the budget has no accounts, we render a "Seed default
 * chart" form that posts to seedDefaultChartAction (idempotent).
 */
export default async function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Single-pass load: resolves the default budget + runs the engine exactly once.
  // Loads breakdown taxonomy in parallel (independent of the budget slice).
  const [pageData, categories, departments, people] = await Promise.all([
    getBudgetPageData(supabase as never, projectId),
    listElementCategories(supabase as never, projectId),
    listDepartments(supabase as never, projectId),
    listPeople(supabase as never, projectId),
  ]);

  const { budget: budgetRow, bundle, topSheet, accountRollups, variance: varianceReport, costEntries: costEntryList } = pageData;
  const budgetId = budgetRow.id;
  const { fringes, lines, globals, lineFringeIds } = bundle;

  // Empty-chart guard: if no accounts, render seed affordance.
  const hasAccounts = accountRollups.length > 0;

  // derivedLineIds: lines whose quantity_source is non-null → graph-derived quantity.
  const derivedLineIds = new Set<string>(
    lines.filter((l) => l.quantity_source !== null).map((l) => l.id),
  );

  // Build a raw-line lookup for the quantity-source picker (keyed by lineId).
  const lineById = new Map(lines.map((l) => [l.id, l]));

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-extrabold tracking-[-0.3px] text-[var(--tx)]">
            Budget
          </h1>
          <p className="text-sm text-[var(--tx-3)]">
            Estimates derived from the production graph — script, breakdown, and
            schedule drive quantities automatically.
          </p>
        </div>
      </header>

      {/* Empty-chart affordance */}
      {!hasAccounts && (
        <section
          aria-labelledby="empty-chart-heading"
          className="rounded-xl border border-dashed border-[var(--line-2)] bg-card p-8 text-center"
        >
          <h2
            id="empty-chart-heading"
            className="mb-2 text-sm font-semibold text-foreground"
          >
            No chart of accounts yet
          </h2>
          <p className="mb-5 text-sm text-[var(--tx-3)]">
            Seed the default chart to get a standard film-production account
            structure (ATL, BTL, Post, Other). You can edit and extend it
            afterwards.
          </p>
          <form action={seedDefaultChartAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <Button type="submit" variant="ember" size="sm">
              Seed default chart
            </Button>
          </form>
        </section>
      )}

      {/* ── Budget settings sidebar (globals, fringes, contingency) ── */}
      {hasAccounts && (
        <section aria-labelledby="budget-settings-heading">
          <div className="mb-3 space-y-0.5">
            <h2
              id="budget-settings-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Budget Settings
            </h2>
            <p className="text-xs text-[var(--tx-3)]">
              Globals, fringes, and contingency — shared across all lines in this budget.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Globals */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
              <h3 className="font-display text-xs font-extrabold uppercase tracking-[0.5px] text-[var(--tx)]">
                Globals
              </h3>
              <p className="text-[11px] text-[var(--tx-3)]">
                Named rate / percent constants you can reference on any line.
              </p>
              <GlobalsEditor
                projectId={projectId}
                budgetId={budgetId}
                globals={globals}
                createGlobalAction={createGlobalAction}
                updateGlobalAction={updateGlobalAction}
              />
            </div>

            {/* Fringes */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
              <h3 className="font-display text-xs font-extrabold uppercase tracking-[0.5px] text-[var(--tx)]">
                Fringes
              </h3>
              <p className="text-[11px] text-[var(--tx-3)]">
                Percentage add-ons (payroll taxes, benefits, etc.) applied per line.
              </p>
              <FringesEditor
                projectId={projectId}
                budgetId={budgetId}
                fringes={fringes}
                createFringeAction={createFringeAction}
              />
            </div>

            {/* Contingency */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3">
              <h3 className="font-display text-xs font-extrabold uppercase tracking-[0.5px] text-[var(--tx)]">
                Contingency
              </h3>
              <p className="text-[11px] text-[var(--tx-3)]">
                A percentage reserve applied to below-the-line or total budget.
                Enter a human percent (e.g. 10 for 10%).
              </p>
              {/* setContingencyAction accepts human percent (0–100); converts to decimal */}
              <form action={setContingencyAction} className="space-y-2">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="budgetId" value={budgetId} />

                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor={`contingency-percent-${budgetId}`}
                    className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
                  >
                    % (e.g. 10 for 10%)
                  </label>
                  <input
                    id={`contingency-percent-${budgetId}`}
                    type="number"
                    name="percent"
                    defaultValue={
                      budgetRow.contingency_percent
                        ? (budgetRow.contingency_percent * 100).toFixed(1)
                        : ""
                    }
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="10"
                    aria-label="Contingency percent"
                    className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-right text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor={`contingency-basis-${budgetId}`}
                    className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
                  >
                    Basis
                  </label>
                  <select
                    id={`contingency-basis-${budgetId}`}
                    name="basis"
                    defaultValue={budgetRow.contingency_basis ?? "none"}
                    aria-label="Contingency basis"
                    className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <option value="none">None</option>
                    <option value="btl">Below the Line</option>
                    <option value="total">Total</option>
                  </select>
                </div>

                <Button type="submit" variant="ember" size="xs" className="w-full">
                  Set contingency
                </Button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Top Sheet — summary view */}
      {hasAccounts && (
        <section aria-labelledby="top-sheet-heading">
          <div className="mb-3 space-y-0.5">
            <h2
              id="top-sheet-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Top Sheet
            </h2>
            <p className="text-xs text-[var(--tx-3)]">
              Section subtotals, fringes, contingency, and grand total.
            </p>
          </div>
          <TopSheet topSheet={topSheet} fringes={fringes} />
        </section>
      )}

      {/* Account detail — per-account line breakdown */}
      {hasAccounts && (
        <section aria-labelledby="account-detail-heading">
          <div className="mb-3 space-y-0.5">
            <h2
              id="account-detail-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Account Detail
            </h2>
            <p className="text-xs text-[var(--tx-3)]">
              Line-by-line breakdown grouped by section and account. Graph badge
              indicates a quantity driven by script, breakdown, or schedule data.
              Expand a line to bind its quantity source, rate, and fringes.
            </p>
          </div>
          <AccountDetail
            accounts={accountRollups}
            derivedLineIds={derivedLineIds}
            fringes={fringes}
            lineFringeIds={lineFringeIds}
          />
        </section>
      )}

      {/* Line binding editors — quantity source + rate + fringe per line */}
      {hasAccounts && lines.length > 0 && (
        <section aria-labelledby="line-binding-heading">
          <div className="mb-3 space-y-0.5">
            <h2
              id="line-binding-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Line Binding
            </h2>
            <p className="text-xs text-[var(--tx-3)]">
              Bind each line&apos;s quantity to the production graph (breakdown
              element counts, shoot day counts, or DOOD cast days) or manage it
              manually. Also configure rate globals and fringe add-ons per line.
            </p>
          </div>

          <div className="space-y-3">
            {lines.map((line) => {
              const rawLine = lineById.get(line.id);
              if (!rawLine) return null;

              // Parse the quantity_source from the raw line (loose json column)
              let sourceKind: "manual" | "element_count" | "shoot_day_count" | "dood_cast_days" | null = null;
              const sourceRateGlobalId: string | null = rawLine.rate_global_id;
              if (rawLine.quantity_source !== null) {
                const qs = rawLine.quantity_source as QuantitySource;
                sourceKind = qs.kind === "manual" ? null : qs.kind;
              }

              return (
                <details
                  key={line.id}
                  className="group rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors list-none">
                    <span className="flex-1 text-sm font-medium text-[var(--tx)] truncate">
                      {line.description}
                    </span>
                    {derivedLineIds.has(line.id) ? (
                      <span className="shrink-0 rounded border border-[var(--line)] bg-[var(--s2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                        Graph
                      </span>
                    ) : (
                      <span className="shrink-0 rounded border border-[var(--line)] bg-[var(--s2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                        Manual
                      </span>
                    )}
                    <svg
                      aria-hidden="true"
                      className="size-3 text-[var(--tx-3)] transition-transform group-open:rotate-180 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>

                  <div className="border-t border-[var(--line)] px-4 py-3">
                    <QuantitySourcePicker
                      projectId={projectId}
                      lineId={line.id}
                      currentQuantity={rawLine.quantity}
                      currentSourceKind={sourceKind}
                      currentRateGlobalId={sourceRateGlobalId}
                      currentRate={rawLine.rate}
                      currentFringeIds={lineFringeIds[line.id] ?? []}
                      globals={globals}
                      fringes={fringes}
                      categories={categories}
                      departments={departments}
                      people={people}
                      setLineQuantitySourceAction={setLineQuantitySourceAction}
                      updateLineAction={updateLineAction}
                      setLineRateGlobalAction={setLineRateGlobalAction}
                      setLineFringesAction={setLineFringesAction}
                    />
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {/* Seed affordance even when accounts exist (but no lines) */}
      {hasAccounts && accountRollups.every((a) => a.lines.length === 0) && (
        <section
          aria-label="No lines seeded"
          className="rounded-xl border border-dashed border-[var(--line-2)] bg-card px-6 py-4 text-center"
        >
          <p className="text-sm text-[var(--tx-3)]">
            Accounts exist but have no lines yet. Add lines or use the seed action
            to repopulate.
          </p>
          <form action={seedDefaultChartAction} className="mt-3 inline-block">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="budgetId" value={budgetId} />
            <Button type="submit" variant="outline" size="sm">
              Re-seed chart
            </Button>
          </form>
        </section>
      )}

      {/* ── Actuals Ledger — append-only cost entries + variance ── */}
      {hasAccounts && (
        <section aria-labelledby="actuals-ledger-heading">
          <div className="mb-3 space-y-0.5">
            <h2
              id="actuals-ledger-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Actuals
            </h2>
            <p className="text-xs text-[var(--tx-3)]">
              Append-only cost ledger. Record actuals against accounts (and
              optionally lines) to track estimate vs actual variance in real
              time. Corrections are offsetting (negative) entries — rows are
              never edited or deleted.
            </p>
          </div>

          <ActualsLedger
            projectId={projectId}
            budgetId={budgetId}
            accounts={bundle.accounts}
            lines={bundle.lines}
            costEntries={costEntryList}
            variance={varianceReport}
            addCostEntryAction={addCostEntryAction}
          />
        </section>
      )}
    </main>
  );
}
