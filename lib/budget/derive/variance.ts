import type { Variance, VarianceLine, TopSheet } from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// Minimal structural input type ("*Like" pattern)
// Decoupled from the DB row type (CostEntry) so the engine stays trivially
// testable with plain objects and column renames never ripple into pure logic.
// ---------------------------------------------------------------------------

/** Minimal shape of a cost_entry row needed for variance computation. */
interface CostEntryLike {
  account_id: string;
  line_id: string | null;
  amount: number;
}

// ---------------------------------------------------------------------------
// computeVariance
// Pure: derive estimate/actual/variance for every line and account, plus the
// overall budget totals. No DB, no I/O, no Date.
//
// Estimate model (engine choices — freely revisable):
//   byLine[lineId].estimate   = ResolvedLine.total (base + that line's fringes)
//   byAccount[acctId].estimate = Σ of its ResolvedLine.total values
//   budget.estimate            = rollups.grandTotal (incl. fringeTotalSum + contingency)
//
// Actual model:
//   byLine[lineId].actual     = Σ costEntries.amount where line_id === lineId
//   byAccount[acctId].actual  = Σ costEntries.amount where account_id === acctId
//                               (includes both null-line-id entries and line-level
//                                entries — every cost_entry carries account_id)
//   budget.actual              = Σ ALL costEntries.amount
//
// Variance = estimate − actual (positive = under budget).
//
// Offsetting entries (e.g. +500 / −500) net to 0 actual — falls out of
// summation naturally; no special-case required.
//
// Orphan entries:
//   An entry whose account_id is not in the rollups:
//     - counted in budget.actual (Σ all entries)
//     - NOT counted in byAccount (account not in rollups)
//     - NOT counted in byLine (line not in rollups)
//   An entry whose account_id IS in the rollups but whose line_id is not:
//     - counted in byAccount[account_id].actual (entry carries account_id)
//     - counted in budget.actual
//     - NOT counted in byLine (line not in rollups)
//
// Floating point: no rounding — returns raw numbers.
// ---------------------------------------------------------------------------

export function computeVariance(
  rollups: TopSheet,
  costEntries: CostEntryLike[],
): Variance {
  // -- Phase 1: collect estimates from the TopSheet --

  // lineId → estimate (ResolvedLine.total)
  const lineEstimate = new Map<string, number>();
  // accountId → estimate (Σ of its lines' totals)
  const accountEstimate = new Map<string, number>();

  for (const section of rollups.sections) {
    for (const account of section.accounts) {
      let acctEstimate = 0;
      for (const line of account.lines) {
        lineEstimate.set(line.lineId, line.total);
        acctEstimate += line.total;
      }
      accountEstimate.set(account.accountId, acctEstimate);
    }
  }

  // -- Phase 2: accumulate actuals from cost entries --

  // lineId → actual (only for lines present in rollups)
  const lineActual = new Map<string, number>();
  // accountId → actual (only for accounts present in rollups)
  const accountActual = new Map<string, number>();
  let budgetActual = 0;

  for (const entry of costEntries) {
    budgetActual += entry.amount;

    // Account-level actual — only if account is in rollups
    if (accountEstimate.has(entry.account_id)) {
      accountActual.set(
        entry.account_id,
        (accountActual.get(entry.account_id) ?? 0) + entry.amount,
      );
    }

    // Line-level actual — only if line is in rollups
    if (entry.line_id !== null && lineEstimate.has(entry.line_id)) {
      lineActual.set(
        entry.line_id,
        (lineActual.get(entry.line_id) ?? 0) + entry.amount,
      );
    }
  }

  // -- Phase 3: build output Records --

  const byLine: Record<string, VarianceLine> = {};
  for (const [lineId, estimate] of lineEstimate) {
    const actual = lineActual.get(lineId) ?? 0;
    byLine[lineId] = {
      id: lineId,
      estimate,
      actual,
      variance: estimate - actual,
    };
  }

  const byAccount: Record<string, VarianceLine> = {};
  for (const [accountId, estimate] of accountEstimate) {
    const actual = accountActual.get(accountId) ?? 0;
    byAccount[accountId] = {
      id: accountId,
      estimate,
      actual,
      variance: estimate - actual,
    };
  }

  const budgetEstimate = rollups.grandTotal;

  return {
    budgetId: rollups.budgetId,
    byLine,
    byAccount,
    budget: {
      estimate: budgetEstimate,
      actual: budgetActual,
      variance: budgetEstimate - budgetActual,
    },
  };
}
