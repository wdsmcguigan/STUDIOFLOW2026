import { describe, it, expect } from "vitest";
import { computeVariance } from "./variance";
import type { TopSheet } from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// Fixtures — plain string ids (no UUID validation in the pure engine)
// ---------------------------------------------------------------------------

/**
 * Minimal TopSheet for tests.
 *
 * grandTotal = 2700 (sum of all line totals: 1100 + 600 + 1000, no contingency).
 *
 * Sections:
 *   atl  → acct-1
 *     line-1: base=1000 fringeTotal=100  total=1100
 *   btl  → acct-2
 *     line-2: base=500  fringeTotal=100  total=600
 *     line-3: base=1000 fringeTotal=0    total=1000
 */
const TOP_SHEET: TopSheet = {
  budgetId: "budget-1",
  sections: [
    {
      section: "atl",
      subtotal: 1000,
      accounts: [
        {
          accountId: "acct-1",
          code: "100",
          name: "Writer",
          section: "atl",
          subtotal: 1000,
          lines: [
            {
              lineId: "line-1",
              accountId: "acct-1",
              description: "Writer fee",
              quantity: 1,
              rate: 1000,
              base: 1000,
              fringeCosts: { "fringe-a": 100 },
              fringeTotal: 100,
              total: 1100,
            },
          ],
        },
      ],
    },
    {
      section: "btl",
      subtotal: 1500,
      accounts: [
        {
          accountId: "acct-2",
          code: "200",
          name: "DP",
          section: "btl",
          subtotal: 1500,
          lines: [
            {
              lineId: "line-2",
              accountId: "acct-2",
              description: "DP day rate",
              quantity: 1,
              rate: 500,
              base: 500,
              fringeCosts: { "fringe-a": 100 },
              fringeTotal: 100,
              total: 600,
            },
            {
              lineId: "line-3",
              accountId: "acct-2",
              description: "Camera pkg",
              quantity: 1,
              rate: 1000,
              base: 1000,
              fringeCosts: {},
              fringeTotal: 0,
              total: 1000,
            },
          ],
        },
      ],
    },
  ],
  subtotal: 2500,
  fringeTotals: { "fringe-a": 200 },
  fringeTotalSum: 200,
  contingency: 0,
  contingencyPercent: 0,
  contingencyBasis: "none",
  grandTotal: 2700,
};

// ---------------------------------------------------------------------------
// 1. Per-line variance
// ---------------------------------------------------------------------------

describe("per-line variance", () => {
  it("estimate = ResolvedLine.total (base + fringes)", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(result.byLine["line-1"].estimate).toBe(1100);
    expect(result.byLine["line-2"].estimate).toBe(600);
    expect(result.byLine["line-3"].estimate).toBe(1000);
  });

  it("actual = Σ cost entries matching line_id; variance = estimate − actual", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-1", amount: 300 },
      { account_id: "acct-1", line_id: "line-1", amount: 200 },
    ]);
    expect(result.byLine["line-1"].actual).toBe(500);
    expect(result.byLine["line-1"].variance).toBe(600); // 1100 − 500
  });

  it("line with no entries → actual 0, variance = estimate", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(result.byLine["line-3"].actual).toBe(0);
    expect(result.byLine["line-3"].variance).toBe(1000);
  });

  it("entries for other lines do not affect this line's actual", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-2", line_id: "line-2", amount: 400 },
    ]);
    expect(result.byLine["line-3"].actual).toBe(0);
    expect(result.byLine["line-2"].actual).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 2. Per-account variance
// ---------------------------------------------------------------------------

describe("per-account variance", () => {
  it("account estimate = Σ of its lines' totals (base + fringes)", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(result.byAccount["acct-1"].estimate).toBe(1100); // line-1 total
    expect(result.byAccount["acct-2"].estimate).toBe(1600); // line-2 + line-3 totals: 600 + 1000
  });

  it("account actual includes line-level entries (line_id set) for lines in that account", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-2", line_id: "line-2", amount: 150 },
      { account_id: "acct-2", line_id: "line-3", amount: 250 },
    ]);
    expect(result.byAccount["acct-2"].actual).toBe(400);
    expect(result.byAccount["acct-2"].variance).toBe(1200); // 1600 − 400
  });

  it("account actual includes account-level entries (null line_id) for that account", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: null, amount: 500 },
    ]);
    expect(result.byAccount["acct-1"].actual).toBe(500);
    expect(result.byAccount["acct-1"].variance).toBe(600); // 1100 − 500
  });

  it("account actual is sum of BOTH null-line-id and line-level entries", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-2", line_id: null, amount: 100 },   // account-level
      { account_id: "acct-2", line_id: "line-2", amount: 200 }, // line-level
    ]);
    expect(result.byAccount["acct-2"].actual).toBe(300);
    expect(result.byAccount["acct-2"].variance).toBe(1300); // 1600 − 300
  });

  it("account with no entries → actual 0, variance = estimate", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-2", line_id: "line-2", amount: 100 },
    ]);
    expect(result.byAccount["acct-1"].actual).toBe(0);
    expect(result.byAccount["acct-1"].variance).toBe(1100);
  });
});

// ---------------------------------------------------------------------------
// 3. Budget-level variance
// ---------------------------------------------------------------------------

describe("budget-level variance", () => {
  it("budget estimate = rollups.grandTotal", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(result.budget.estimate).toBe(2700);
  });

  it("budget actual = Σ ALL cost entry amounts", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-1", amount: 300 },
      { account_id: "acct-2", line_id: null, amount: 200 },
    ]);
    expect(result.budget.actual).toBe(500);
  });

  it("budget variance = estimate − actual", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-1", amount: 1000 },
    ]);
    expect(result.budget.variance).toBe(1700); // 2700 − 1000
  });

  it("no entries → budget actual 0, variance = grandTotal", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(result.budget.actual).toBe(0);
    expect(result.budget.variance).toBe(2700);
  });
});

// ---------------------------------------------------------------------------
// 4. Offsetting entries net to zero
// ---------------------------------------------------------------------------

describe("offsetting entries net to zero", () => {
  it("+500 then −500 on the same line → line actual 0, variance = estimate", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-1", amount: 500 },
      { account_id: "acct-1", line_id: "line-1", amount: -500 },
    ]);
    expect(result.byLine["line-1"].actual).toBe(0);
    expect(result.byLine["line-1"].variance).toBe(1100);
  });

  it("offsetting entries also net out in account and budget actuals", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-1", amount: 500 },
      { account_id: "acct-1", line_id: "line-1", amount: -500 },
    ]);
    expect(result.byAccount["acct-1"].actual).toBe(0);
    expect(result.budget.actual).toBe(0);
  });

  it("partial offset — only the net matters", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-2", line_id: "line-2", amount: 400 },
      { account_id: "acct-2", line_id: "line-2", amount: -100 },
    ]);
    expect(result.byLine["line-2"].actual).toBe(300);
    expect(result.byLine["line-2"].variance).toBe(300); // 600 − 300
  });
});

// ---------------------------------------------------------------------------
// 5. Orphan entries (account_id / line_id not in rollups)
// ---------------------------------------------------------------------------

describe("orphan entries", () => {
  it("orphan entry (unknown account) still counts toward budget.actual", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-unknown", line_id: null, amount: 999 },
    ]);
    expect(result.budget.actual).toBe(999);
    expect(result.budget.variance).toBe(2700 - 999);
  });

  it("orphan entry does NOT appear in byAccount (account not in rollups)", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-unknown", line_id: null, amount: 999 },
    ]);
    expect(result.byAccount["acct-unknown"]).toBeUndefined();
  });

  it("orphan entry does NOT appear in byLine (line not in rollups)", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-unknown", amount: 50 },
    ]);
    expect(result.byLine["line-unknown"]).toBeUndefined();
  });

  it("known account entry with unknown line_id still counts toward that account's actual", () => {
    // The cost_entry carries account_id, so it contributes to the account's
    // actual even when line_id is not found in the rollup.
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-unknown", amount: 50 },
    ]);
    expect(result.byAccount["acct-1"].actual).toBe(50);
    expect(result.budget.actual).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 6. Output shape / budgetId pass-through
// ---------------------------------------------------------------------------

describe("output shape", () => {
  it("budgetId is taken from the rollups.budgetId", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(result.budgetId).toBe("budget-1");
  });

  it("byLine contains an entry for every line in rollups", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(Object.keys(result.byLine).sort()).toEqual(
      ["line-1", "line-2", "line-3"].sort(),
    );
  });

  it("byAccount contains an entry for every account in rollups", () => {
    const result = computeVariance(TOP_SHEET, []);
    expect(Object.keys(result.byAccount).sort()).toEqual(
      ["acct-1", "acct-2"].sort(),
    );
  });

  it("each VarianceLine carries its id, estimate, actual, variance", () => {
    const result = computeVariance(TOP_SHEET, [
      { account_id: "acct-1", line_id: "line-1", amount: 100 },
    ]);
    const vl = result.byLine["line-1"];
    expect(vl.id).toBe("line-1");
    expect(vl.estimate).toBe(1100);
    expect(vl.actual).toBe(100);
    expect(vl.variance).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 7. TopSheet with contingency → grandTotal includes it
// ---------------------------------------------------------------------------

describe("grandTotal with contingency", () => {
  const WITH_CONTINGENCY: TopSheet = {
    ...TOP_SHEET,
    contingency: 250,
    contingencyPercent: 0.1,
    contingencyBasis: "total",
    grandTotal: 2950, // 2700 + 250
  };

  it("budget estimate = grandTotal including contingency", () => {
    const result = computeVariance(WITH_CONTINGENCY, []);
    expect(result.budget.estimate).toBe(2950);
  });
});
