/**
 * AccountDetail — budget accounts grouped by section, each with its line rows.
 *
 * Renders AccountRollup[] output from the engine. Lines render via LineRow.
 * Fringes: the page resolves fringe names and passes a map; we pass the relevant
 * subset down per-line.
 *
 * Server component (read-only view for Task 12). Can be promoted to "use client"
 * in Tasks 13–14 when edit affordances are wired in.
 */

import type { AccountRollup, Section } from "@/lib/budget/schema";
import type { Fringe } from "@/lib/budget/schema";
import { LineRow } from "./line-row";
import { formatCurrency, SECTION_LABELS } from "@/lib/budget/format";
import { Card } from "@/components/ui/card";

interface AccountDetailProps {
  /** All account rollups (from TopSheet.sections.flatMap(s => s.accounts)). */
  accounts: AccountRollup[];
  /** Line ids whose quantity is graph-derived (quantity_source is non-null). */
  derivedLineIds: ReadonlySet<string>;
  /** All fringes for this budget (for chip labels). */
  fringes: Fringe[];
  /** fringeId[] attached to each line (lineId → fringeId[]). */
  lineFringeIds: Record<string, string[]>;
}

/** Group accounts by section, preserving order within each group. */
function groupBySection(accounts: AccountRollup[]): [Section, AccountRollup[]][] {
  const order: Section[] = ["atl", "btl", "post", "other"];
  const map = new Map<Section, AccountRollup[]>();
  for (const s of order) map.set(s, []);
  for (const a of accounts) {
    map.get(a.section as Section)?.push(a);
  }
  // Only emit sections that have accounts
  return order.filter((s) => (map.get(s)?.length ?? 0) > 0).map((s) => [s, map.get(s)!]);
}

export function AccountDetail({
  accounts,
  derivedLineIds,
  fringes,
  lineFringeIds,
}: AccountDetailProps) {
  const fringeById = new Map(fringes.map((f) => [f.id, f]));
  const grouped = groupBySection(accounts);

  if (grouped.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-6 text-center text-sm text-[var(--tx-3)]">
        No accounts yet. Seed the default chart above to get started.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([section, sectionAccounts]) => (
        <section key={section} aria-labelledby={`section-${section}`}>
          <h3
            id={`section-${section}`}
            className="mb-3 text-xs font-extrabold uppercase tracking-[0.8px] text-[var(--tx-3)]"
          >
            {SECTION_LABELS[section]}
          </h3>

          <div className="space-y-3">
            {sectionAccounts.map((account) => (
              // gap-0 py-0 neutralise Card's default flex-col/gap-4/py-4 so the
              // account header + table layout is preserved.
              <Card
                key={account.accountId}
                className="gap-0 py-0"
              >
                {/* Account header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 font-mono text-xs font-semibold text-[var(--tx-2)]">
                      {account.code}
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">
                      {account.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {account.lines.length} {account.lines.length === 1 ? "line" : "lines"}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(account.subtotal)}
                  </span>
                </div>

                {account.lines.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[var(--tx-3)]">
                    No lines — add lines in the editor.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                            Description
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                            Rate
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                            Base
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.lines.map((line) => {
                          const attachedFringeIds = lineFringeIds[line.lineId] ?? [];
                          const lineFringes = attachedFringeIds
                            .map((id) => fringeById.get(id))
                            .filter((f): f is Fringe => f !== undefined)
                            .map((f) => ({
                              id: f.id,
                              name: f.name,
                              percent: f.percent,
                            }));

                          return (
                            <LineRow
                              key={line.lineId}
                              line={line}
                              isDerived={derivedLineIds.has(line.lineId)}
                              fringes={lineFringes}
                            />
                          );
                        })}
                      </tbody>
                      {/* Account subtotal row */}
                      <tfoot>
                        <tr className="border-t border-border bg-muted/20">
                          <td
                            className="px-3 py-2 text-xs font-semibold text-muted-foreground"
                            colSpan={3}
                          >
                            Account total
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums" />
                          <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">
                            {formatCurrency(account.subtotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
