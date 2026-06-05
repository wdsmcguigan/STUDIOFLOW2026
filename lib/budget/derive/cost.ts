import { quantitySource } from "@/lib/budget/schema";
import type { BudgetDerivationInputs } from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// Minimal structural input types ("*Like" pattern)
// Decoupled from the Zod/DB row types so the engine stays trivially testable
// with plain objects, and a column rename never ripples into pure logic.
// ---------------------------------------------------------------------------

/** Minimal shape of a budget line needed to resolve its quantity. */
interface LineLike {
  quantity: number | null;
  /** The raw jsonb from the DB row — we narrow it ourselves via quantitySource.safeParse */
  quantity_source: unknown | null;
}

/** Minimal shape of a budget line needed to resolve its rate. */
interface LineRateLike {
  rate: number | null;
  rate_global_id: string | null;
}

/** Minimal shape of a budget line for the full cost computation. */
type LineCostLike = LineLike & LineRateLike;

/** Minimal shape of a global-rate record needed by resolveLineRate. */
interface GlobalLike {
  value: number;
}

/** Minimal shape of a fringe record needed by computeLineCost. */
interface FringeLike {
  /** Stored as a decimal multiplier, e.g. 0.15 = 15%. Engine multiplies directly. */
  percent: number;
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface LineCostResult {
  base: number;
  fringeCosts: { fringeId: string; amount: number }[];
  total: number;
}

// ---------------------------------------------------------------------------
// resolveLineQuantity
// Pure: determine the effective quantity for a line.
//
// Narrowing strategy for the loose jsonb:
//   1. Pass through quantitySource.safeParse (the canonical discriminated union).
//   2. On success, dispatch on .data.kind.
//   3. On failure (null, missing, any unrecognised shape) → fall back to
//      line.quantity ?? 0.  This is the "graceful unknown kind" path; new
//      derived sources added to the schema in future tasks will parse cleanly
//      without any change here.
//
// Judgment call — kind="shoot_day_count" with no dayType:
//   Interpreted as "all dated shoot days" → sum of ALL shootDayCountsByType
//   values.  Rationale: the most natural meaning of "how many shoot days are
//   there?" with no filter is the total; defaulting to 0 would silently
//   mis-cost any crew deal with no day-type filter.  If the caller intends
//   zero they should use kind="manual" with quantity=0.
// ---------------------------------------------------------------------------

export function resolveLineQuantity(
  line: LineLike,
  derivedInputs: BudgetDerivationInputs,
): number {
  const parsed = quantitySource.safeParse(line.quantity_source);

  // Unparseable / null / unknown kind → fall back to manual quantity
  if (!parsed.success) {
    return line.quantity ?? 0;
  }

  const src = parsed.data;

  switch (src.kind) {
    case "manual":
      return line.quantity ?? 0;

    case "element_count": {
      const { categoryId, department } = src.params;
      if (categoryId !== undefined) {
        return derivedInputs.elementCountsByCategory[categoryId] ?? 0;
      }
      if (department !== undefined) {
        return derivedInputs.elementCountsByDepartment[department] ?? 0;
      }
      return 0;
    }

    case "shoot_day_count": {
      const { dayType } = src.params;
      if (dayType !== undefined) {
        return derivedInputs.shootDayCountsByType[dayType] ?? 0;
      }
      // No dayType filter → sum all dated shoot days
      return Object.values(derivedInputs.shootDayCountsByType).reduce(
        (acc, n) => acc + n,
        0,
      );
    }

    case "dood_cast_days": {
      const { personId } = src.params;
      return derivedInputs.doodPaidDaysByPerson[personId] ?? 0;
    }

    // TypeScript exhaustiveness guard.  The discriminated union is closed at
    // compile time, but this branch is unreachable at runtime for any valid
    // parse result.  Satisfies the "unknown future kind" requirement at the
    // safeParse level (unknown kinds simply fail to parse, hitting the
    // !parsed.success branch above).
    default: {
      const _: never = src;
      void _;
      return line.quantity ?? 0;
    }
  }
}

// ---------------------------------------------------------------------------
// resolveLineRate
// Pure: determine the effective rate for a line.
//
// Priority:
//   1. If rate_global_id is set AND the global exists in globalsById → global.value
//   2. Otherwise → line.rate ?? 0
// ---------------------------------------------------------------------------

export function resolveLineRate(
  line: LineRateLike,
  globalsById: Record<string, GlobalLike>,
): number {
  if (line.rate_global_id !== null) {
    const global = globalsById[line.rate_global_id];
    if (global !== undefined) {
      return global.value;
    }
  }
  return line.rate ?? 0;
}

// ---------------------------------------------------------------------------
// computeLineCost
// Pure: compute base cost, per-fringe breakdown, and total for one line.
//
// base = resolveLineQuantity × resolveLineRate
// fringeCosts = for each id in lineFringeIds present in fringesById:
//               { fringeId, amount: base × fringe.percent }
//               (fringes applied to base only — not stacked on each other;
//               industry-standard flat fringe model)
// total = base + sum(fringeCosts.amount)
//
// Floating point: no rounding — returns raw numbers; formatting is a UI concern.
// ---------------------------------------------------------------------------

export function computeLineCost(
  line: LineCostLike,
  derivedInputs: BudgetDerivationInputs,
  globalsById: Record<string, GlobalLike>,
  fringesById: Record<string, FringeLike>,
  lineFringeIds: string[],
): LineCostResult {
  const qty = resolveLineQuantity(line, derivedInputs);
  const rate = resolveLineRate(line, globalsById);
  const base = qty * rate;

  const fringeCosts = lineFringeIds
    .filter((id) => id in fringesById)
    .map((id) => ({
      fringeId: id,
      amount: base * fringesById[id].percent,
    }));

  const total = base + fringeCosts.reduce((acc, f) => acc + f.amount, 0);

  return { base, fringeCosts, total };
}
