/**
 * TopSheet — the "page 1" financial summary for a budget.
 *
 * Renders the engine's TopSheet output: per-section subtotals, fringe totals
 * (per-fringe + sum), contingency (with percent displayed), and grand total.
 *
 * Layout mirrors a standard production top sheet: sections → subtotal →
 * fringe rows → contingency → grand total. Clean financial-document hierarchy.
 *
 * Server component (read-only view for Task 12).
 */

import type { TopSheet as TopSheetData } from "@/lib/budget/schema";
import type { Fringe } from "@/lib/budget/schema";
import { formatCurrency, SECTION_LABELS } from "@/lib/budget/format";
import { Card } from "@/components/ui/card";

interface TopSheetProps {
  topSheet: TopSheetData;
  /** All fringes for this budget — used to label fringeTotals rows. */
  fringes: Fringe[];
}

/** A horizontal rule with a label — reused for section and total separators. */
function SummaryRow({
  label,
  amount,
  className,
}: {
  label: string;
  amount: number;
  className?: string;
}) {
  return (
    <tr className={className}>
      <td className="py-2 pr-4 text-sm text-foreground">{label}</td>
      <td className="py-2 text-right font-mono text-sm text-foreground tabular-nums">
        {formatCurrency(amount)}
      </td>
    </tr>
  );
}

export function TopSheet({ topSheet, fringes }: TopSheetProps) {
  const fringeById = new Map(fringes.map((f) => [f.id, f]));

  // Fringe rows: only those with a non-zero total
  const fringeTotalEntries = Object.entries(topSheet.fringeTotals).filter(
    ([, total]) => total !== 0,
  );

  return (
    // gap-0 py-0 neutralise Card's default flex-col/gap-4/py-4 so the hand-crafted
    // header + body layout is preserved while Card supplies the shared visual shell.
    <Card className="gap-0 py-0">
      {/* Card header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="space-y-0.5">
          <h2 className="font-display text-base font-extrabold tracking-[-0.2px] text-[var(--tx)]">
            Summary of Estimated Production Costs
          </h2>
          <p className="text-xs text-[var(--tx-3)]">
            All values are estimates derived on read — no costs committed yet.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-[var(--tx-3)]">Grand Total</p>
          <p className="font-mono text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {formatCurrency(topSheet.grandTotal)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        <table className="w-full">
          <tbody className="divide-y divide-border">
            {/* ---- Per-section subtotals ---- */}
            {topSheet.sections.map((section) => (
              <SummaryRow
                key={section.section}
                label={SECTION_LABELS[section.section] ?? section.section}
                amount={section.subtotal}
              />
            ))}

            {/* ---- Pre-fringe subtotal ---- */}
            <tr className="border-t border-border">
              <td className="py-3 pr-4 text-sm font-semibold text-foreground">
                Subtotal (before fringes)
              </td>
              <td className="py-3 text-right font-mono text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(topSheet.subtotal)}
              </td>
            </tr>

            {/* ---- Per-fringe breakdown ---- */}
            {fringeTotalEntries.length > 0 && (
              <>
                {fringeTotalEntries.map(([fringeId, total]) => {
                  const f = fringeById.get(fringeId);
                  const label = f
                    ? `${f.name} (${(f.percent * 100).toFixed(1)}%)`
                    : `Fringe ${fringeId.slice(0, 8)}`;
                  return (
                    <tr key={fringeId}>
                      <td className="py-1.5 pr-4 pl-4 text-sm text-muted-foreground">
                        {label}
                      </td>
                      <td className="py-1.5 text-right font-mono text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  );
                })}

                {/* Fringe total sum */}
                <tr>
                  <td className="py-2 pr-4 pl-4 text-sm font-medium text-foreground">
                    Total Fringes
                  </td>
                  <td className="py-2 text-right font-mono text-sm font-medium text-foreground tabular-nums">
                    {formatCurrency(topSheet.fringeTotalSum)}
                  </td>
                </tr>
              </>
            )}

            {/* ---- Contingency ---- */}
            {topSheet.contingency !== 0 && (
              <tr>
                <td className="py-2 pr-4 text-sm text-foreground">
                  Contingency{" "}
                  <span className="text-xs text-muted-foreground">
                    ({(topSheet.contingencyPercent * 100).toFixed(1)}%
                    {topSheet.contingencyBasis !== "none"
                      ? ` of ${topSheet.contingencyBasis.toUpperCase()}`
                      : ""}
                    )
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-sm text-foreground tabular-nums">
                  {formatCurrency(topSheet.contingency)}
                </td>
              </tr>
            )}

            {/* ---- Grand total ---- */}
            <tr className="border-t-2 border-border">
              <td className="pt-4 pb-2 pr-4 text-base font-extrabold uppercase tracking-[0.6px] text-foreground">
                Grand Total
              </td>
              <td className="pt-4 pb-2 text-right font-mono text-base font-extrabold text-foreground tabular-nums">
                {formatCurrency(topSheet.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
