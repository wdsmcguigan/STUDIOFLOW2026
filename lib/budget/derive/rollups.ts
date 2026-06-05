import type {
  ResolvedLine,
  AccountRollup,
  SectionRollup,
  TopSheet,
  ContingencyBasis,
  Section,
} from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// Minimal structural input types ("*Like" pattern)
// Decoupled from DB row types so the engine stays trivially testable with plain
// objects and column renames never ripple into pure logic.
// ---------------------------------------------------------------------------

/** Minimal shape of a budget line needed for rollup. */
interface LineLike {
  id: string;
  account_id: string;
  description: string;
  quantity?: number | null;
  rate?: number | null;
}

/** Minimal shape of a budget account needed for rollup. */
interface AccountLike {
  id: string;
  code: string;
  name: string;
  /** section ∈ "atl" | "btl" | "post" | "other" — typed as Section for safety */
  section: Section;
}

/**
 * Per-line cost result from the Task-7 engine, extended with resolved
 * quantity and rate so ResolvedLine can carry them without needing the raw
 * line's stored values (which may differ when a quantitySource or
 * rateGlobalId is in play).
 *
 * Judgment call: we extend the cost result record rather than accepting
 * a separate qty/rate map. This keeps the caller's wiring to one structure
 * per line and avoids mismatched-id bugs. `resolvedQuantity` and
 * `resolvedRate` are optional (default 0) so callers can omit them when
 * only cost totals matter (e.g. variance engine).
 */
export interface LineCostResultWithResolved {
  base: number;
  fringeCosts: { fringeId: string; amount: number }[];
  total: number;
  /** Effective quantity used to compute base (qty×rate). Defaults to 0 if absent. */
  resolvedQuantity?: number;
  /** Effective rate used to compute base. Defaults to 0 if absent. */
  resolvedRate?: number;
}

/** Budget-level settings controlling contingency computation. */
interface BudgetSettingsLike {
  /** Decimal multiplier, e.g. 0.10 = 10%. Consistent with fringe percent convention. */
  contingencyPercent: number;
  contingencyBasis: ContingencyBasis;
}

// ---------------------------------------------------------------------------
// Section ordering
// ---------------------------------------------------------------------------

const SECTION_ORDER: Section[] = ["atl", "btl", "post", "other"];

// ---------------------------------------------------------------------------
// computeRollups
// Pure: aggregate per-line cost results up through accounts → sections →
// top sheet. No DB, no I/O, no Date.
//
// Cost model (engine choices — freely revisable):
//   Account subtotal  = Σ of its lines' BASE (fringe-excluded)
//   Section subtotal  = Σ of its accounts' subtotals (base only)
//   TopSheet.subtotal = Σ of all section subtotals (= total base across budget)
//   fringeTotals      = per-fringe Σ across ALL lines
//   fringeTotalSum    = Σ fringeTotals values (= total fringe cost)
//   contingencyBase:
//     "btl"   → BTL section subtotal
//     "total" → subtotal + fringeTotalSum
//     "none"  → 0
//   contingency  = contingencyPercent × contingencyBase
//   grandTotal   = subtotal + fringeTotalSum + contingency
//
// Sections: included only when they have ≥1 account; ordered atl→btl→post→other.
// Lines with unknown account_id: skipped (not counted anywhere).
// Accounts with no lines: subtotal 0, lines [].
// Floating point: no rounding — returns raw numbers.
// ---------------------------------------------------------------------------

export function computeRollups(
  lines: LineLike[],
  accounts: AccountLike[],
  costResultsByLine: Record<string, LineCostResultWithResolved>,
  budgetSettings: BudgetSettingsLike,
  budgetId = "",
): TopSheet {
  // -- Build account lookup map --
  const accountById = new Map<string, AccountLike>();
  for (const acct of accounts) {
    accountById.set(acct.id, acct);
  }

  // -- Bucket lines by account_id (skip lines with unknown account) --
  const linesByAccount = new Map<string, LineLike[]>();
  // Pre-seed with all known accounts so accounts with no lines still appear
  for (const acct of accounts) {
    linesByAccount.set(acct.id, []);
  }
  for (const line of lines) {
    if (!accountById.has(line.account_id)) continue; // skip orphan lines
    linesByAccount.get(line.account_id)!.push(line);
  }

  // -- Build ResolvedLine objects and AccountRollups --
  // Group accounts by section
  const accountsBySection = new Map<Section, AccountLike[]>();
  for (const acct of accounts) {
    const bucket = accountsBySection.get(acct.section) ?? [];
    bucket.push(acct);
    accountsBySection.set(acct.section, bucket);
  }

  // -- Accumulate global fringe totals --
  const fringeTotalsAcc: Record<string, number> = {};

  // -- Build SectionRollups --
  const sectionRollups: SectionRollup[] = [];

  for (const sec of SECTION_ORDER) {
    const secAccounts = accountsBySection.get(sec);
    if (!secAccounts || secAccounts.length === 0) continue;

    const accountRollups: AccountRollup[] = [];
    let sectionSubtotal = 0;

    for (const acct of secAccounts) {
      const acctLines = linesByAccount.get(acct.id) ?? [];
      const resolvedLines: ResolvedLine[] = [];
      let acctSubtotal = 0;

      for (const line of acctLines) {
        const costResult = costResultsByLine[line.id];
        if (costResult === undefined) {
          // No cost result for this line → treat as zero cost
          resolvedLines.push({
            lineId: line.id,
            accountId: line.account_id,
            description: line.description,
            quantity: line.quantity ?? 0,
            rate: line.rate ?? 0,
            base: 0,
            fringeCosts: {},
            fringeTotal: 0,
            total: 0,
          });
          continue;
        }

        // Convert fringeCosts array → Record<fringeId, amount>
        const fringeCostsRecord: Record<string, number> = {};
        let fringeTotal = 0;
        for (const { fringeId, amount } of costResult.fringeCosts) {
          fringeCostsRecord[fringeId] = (fringeCostsRecord[fringeId] ?? 0) + amount;
          fringeTotal += amount;
          // Accumulate into global fringe totals
          fringeTotalsAcc[fringeId] = (fringeTotalsAcc[fringeId] ?? 0) + amount;
        }

        resolvedLines.push({
          lineId: line.id,
          accountId: line.account_id,
          description: line.description,
          quantity: costResult.resolvedQuantity ?? 0,
          rate: costResult.resolvedRate ?? 0,
          base: costResult.base,
          fringeCosts: fringeCostsRecord,
          fringeTotal,
          total: costResult.total,
        });

        // Account subtotal = Σ base (fringe-excluded)
        acctSubtotal += costResult.base;
      }

      const accountRollup: AccountRollup = {
        accountId: acct.id,
        code: acct.code,
        name: acct.name,
        section: acct.section,
        lines: resolvedLines,
        subtotal: acctSubtotal,
      };

      accountRollups.push(accountRollup);
      sectionSubtotal += acctSubtotal;
    }

    sectionRollups.push({
      section: sec,
      accounts: accountRollups,
      subtotal: sectionSubtotal,
    });
  }

  // -- TopSheet aggregates --
  const subtotal = sectionRollups.reduce((acc, s) => acc + s.subtotal, 0);
  const fringeTotalSum = Object.values(fringeTotalsAcc).reduce((acc, v) => acc + v, 0);

  // Contingency
  const { contingencyPercent, contingencyBasis } = budgetSettings;
  let contingencyBase: number;
  if (contingencyBasis === "btl") {
    const btlSection = sectionRollups.find((s) => s.section === "btl");
    contingencyBase = btlSection?.subtotal ?? 0;
  } else if (contingencyBasis === "total") {
    contingencyBase = subtotal + fringeTotalSum;
  } else {
    // "none"
    contingencyBase = 0;
  }
  const contingency = contingencyPercent * contingencyBase;

  const grandTotal = subtotal + fringeTotalSum + contingency;

  return {
    budgetId,
    sections: sectionRollups,
    subtotal,
    fringeTotals: fringeTotalsAcc,
    fringeTotalSum,
    contingency,
    contingencyPercent,
    contingencyBasis,
    grandTotal,
  };
}
