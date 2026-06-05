/**
 * LineRow — renders a single budget line with all derived values.
 *
 * Displays: description, resolved qty × rate, base cost, total cost,
 * a derived-vs-manual indicator badge, and fringe chips for attached fringes.
 *
 * Thin client: all values are engine output (derived-on-read); this component
 * only formats and labels them.
 */

import type { ResolvedLine } from "@/lib/budget/schema";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/budget/format";

interface FringeChip {
  id: string;
  name: string;
  /** percent stored as decimal e.g. 0.15 = 15% */
  percent: number;
}

interface LineRowProps {
  line: ResolvedLine;
  /** Whether this line's quantity is graph-derived (quantitySource bound). */
  isDerived: boolean;
  /** Fringes attached to this line (names resolved by the page). */
  fringes: FringeChip[];
}

export function LineRow({ line, isDerived, fringes }: LineRowProps) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Description + derived badge */}
      <td className="px-3 py-2 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-foreground truncate">{line.description}</span>
          {/* Derived-vs-manual indicator */}
          {isDerived ? (
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.4px]"
              title="Quantity derived from the production graph"
            >
              Graph
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.4px]"
              title="Quantity entered manually"
            >
              Manual
            </Badge>
          )}
          {/* Fringe chips */}
          {fringes.map((f) => (
            <span
              key={f.id}
              className="inline-flex h-4 items-center rounded-full border px-1.5 text-[10px] font-medium"
              style={{
                borderColor: "var(--line)",
                color: "var(--tx-3)",
                background: "var(--s2)",
              }}
              title={`${f.name}: ${(f.percent * 100).toFixed(1)}%`}
            >
              {f.name}
            </span>
          ))}
        </div>
      </td>

      {/* Qty */}
      <td className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {line.quantity !== 0 ? line.quantity : "—"}
      </td>

      {/* Rate */}
      <td className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {line.rate !== 0 ? formatCurrency(line.rate) : "—"}
      </td>

      {/* Base (qty × rate, before fringes) */}
      <td className="px-3 py-2 text-right text-sm text-foreground tabular-nums whitespace-nowrap">
        {formatCurrency(line.base)}
      </td>

      {/* Total (base + fringes) */}
      <td className="px-3 py-2 text-right text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
        {formatCurrency(line.total)}
      </td>
    </tr>
  );
}
