import { describe, it, expect } from "vitest";
import { computeRollups } from "./rollups";

// ---------------------------------------------------------------------------
// Fixtures — plain string ids (no UUID validation in the pure engine)
// ---------------------------------------------------------------------------

const ATL_ACCT = { id: "acct-atl-1", code: "100", name: "Writer Fee", section: "atl" as const };
const BTL_ACCT = { id: "acct-btl-1", code: "200", name: "DP Day Rate", section: "btl" as const };
const BTL_ACCT_2 = { id: "acct-btl-2", code: "210", name: "Camera Pkg", section: "btl" as const };

const LINE_A = {
  id: "line-a",
  account_id: "acct-atl-1",
  description: "Writer fee",
  quantity: 1,
  rate: 10_000,
};
const LINE_B = {
  id: "line-b",
  account_id: "acct-btl-1",
  description: "DP 10 days",
  quantity: 10,
  rate: 500,
};
const LINE_C = {
  id: "line-c",
  account_id: "acct-btl-1",
  description: "DP overtime",
  quantity: 5,
  rate: 250,
};
const LINE_D = {
  id: "line-d",
  account_id: "acct-btl-2",
  description: "Camera pkg 10 days",
  quantity: 10,
  rate: 800,
};

const NO_CONTINGENCY = { contingencyPercent: 0, contingencyBasis: "none" as const };

// ---------------------------------------------------------------------------
// 1. Lines roll into their account (account subtotal = Σ bases)
// ---------------------------------------------------------------------------

describe("lines roll into account", () => {
  it("single line — account subtotal equals line base", () => {
    const result = computeRollups(
      [LINE_A],
      [ATL_ACCT],
      { "line-a": { base: 10_000, fringeCosts: [], total: 10_000, resolvedQuantity: 1, resolvedRate: 10_000 } },
      NO_CONTINGENCY,
    );
    const sec = result.sections.find((s) => s.section === "atl")!;
    const acct = sec.accounts[0];
    expect(acct.subtotal).toBe(10_000);
    expect(acct.lines).toHaveLength(1);
    expect(acct.lines[0].base).toBe(10_000);
  });

  it("two lines on same account — account subtotal = Σ bases", () => {
    // LINE_B base = 5000, LINE_C base = 1250
    const result = computeRollups(
      [LINE_B, LINE_C],
      [BTL_ACCT],
      {
        "line-b": { base: 5_000, fringeCosts: [], total: 5_000, resolvedQuantity: 10, resolvedRate: 500 },
        "line-c": { base: 1_250, fringeCosts: [], total: 1_250, resolvedQuantity: 5, resolvedRate: 250 },
      },
      NO_CONTINGENCY,
    );
    const sec = result.sections.find((s) => s.section === "btl")!;
    const acct = sec.accounts[0];
    expect(acct.subtotal).toBe(6_250);
    expect(acct.lines).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Accounts roll into sections; section subtotals; TopSheet.subtotal
// ---------------------------------------------------------------------------

describe("accounts roll into sections and TopSheet.subtotal", () => {
  it("two BTL accounts — section subtotal = sum of account subtotals", () => {
    // LINE_B base=5000 (btl-1), LINE_D base=8000 (btl-2)
    const result = computeRollups(
      [LINE_B, LINE_D],
      [BTL_ACCT, BTL_ACCT_2],
      {
        "line-b": { base: 5_000, fringeCosts: [], total: 5_000, resolvedQuantity: 10, resolvedRate: 500 },
        "line-d": { base: 8_000, fringeCosts: [], total: 8_000, resolvedQuantity: 10, resolvedRate: 800 },
      },
      NO_CONTINGENCY,
    );
    const btl = result.sections.find((s) => s.section === "btl")!;
    expect(btl.subtotal).toBe(13_000);
  });

  it("ATL + BTL lines — TopSheet.subtotal = sum of all section subtotals", () => {
    // LINE_A base=10000 (atl), LINE_B base=5000 (btl)
    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": { base: 10_000, fringeCosts: [], total: 10_000, resolvedQuantity: 1, resolvedRate: 10_000 },
        "line-b": { base: 5_000, fringeCosts: [], total: 5_000, resolvedQuantity: 10, resolvedRate: 500 },
      },
      NO_CONTINGENCY,
    );
    expect(result.subtotal).toBe(15_000);
    expect(result.sections).toHaveLength(2);
  });

  it("sections ordered atl, btl, post, other", () => {
    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": { base: 100, fringeCosts: [], total: 100, resolvedQuantity: 1, resolvedRate: 100 },
        "line-b": { base: 200, fringeCosts: [], total: 200, resolvedQuantity: 1, resolvedRate: 200 },
      },
      NO_CONTINGENCY,
    );
    expect(result.sections.map((s) => s.section)).toEqual(["atl", "btl"]);
  });
});

// ---------------------------------------------------------------------------
// 3. Fringe rollup
// ---------------------------------------------------------------------------

describe("fringe rollup", () => {
  it("fringe used on 2 lines → fringeTotals[id] = sum of both amounts", () => {
    // fringe-1 applied to line-b (amt 500) and line-c (amt 125)
    const result = computeRollups(
      [LINE_B, LINE_C],
      [BTL_ACCT],
      {
        "line-b": {
          base: 5_000,
          fringeCosts: [{ fringeId: "fringe-1", amount: 500 }],
          total: 5_500,
          resolvedQuantity: 10,
          resolvedRate: 500,
        },
        "line-c": {
          base: 1_250,
          fringeCosts: [{ fringeId: "fringe-1", amount: 125 }],
          total: 1_375,
          resolvedQuantity: 5,
          resolvedRate: 250,
        },
      },
      NO_CONTINGENCY,
    );
    expect(result.fringeTotals["fringe-1"]).toBe(625);
    expect(result.fringeTotalSum).toBe(625);
  });

  it("two different fringes on the same line", () => {
    const result = computeRollups(
      [LINE_A],
      [ATL_ACCT],
      {
        "line-a": {
          base: 10_000,
          fringeCosts: [
            { fringeId: "fringe-pension", amount: 800 },
            { fringeId: "fringe-health", amount: 400 },
          ],
          total: 11_200,
          resolvedQuantity: 1,
          resolvedRate: 10_000,
        },
      },
      NO_CONTINGENCY,
    );
    expect(result.fringeTotals["fringe-pension"]).toBe(800);
    expect(result.fringeTotals["fringe-health"]).toBe(400);
    expect(result.fringeTotalSum).toBe(1_200);
  });

  it("fringe on two lines across two accounts — accumulates globally", () => {
    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": {
          base: 10_000,
          fringeCosts: [{ fringeId: "fringe-1", amount: 1_000 }],
          total: 11_000,
          resolvedQuantity: 1,
          resolvedRate: 10_000,
        },
        "line-b": {
          base: 5_000,
          fringeCosts: [{ fringeId: "fringe-1", amount: 500 }],
          total: 5_500,
          resolvedQuantity: 10,
          resolvedRate: 500,
        },
      },
      NO_CONTINGENCY,
    );
    expect(result.fringeTotals["fringe-1"]).toBe(1_500);
    expect(result.fringeTotalSum).toBe(1_500);
  });
});

// ---------------------------------------------------------------------------
// 4. Contingency
// ---------------------------------------------------------------------------

describe("contingency", () => {
  it('basis "btl" → contingency = percent × BTL section subtotal', () => {
    // BTL base = 5000, ATL base = 10000
    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": { base: 10_000, fringeCosts: [], total: 10_000, resolvedQuantity: 1, resolvedRate: 10_000 },
        "line-b": { base: 5_000, fringeCosts: [], total: 5_000, resolvedQuantity: 10, resolvedRate: 500 },
      },
      { contingencyPercent: 0.10, contingencyBasis: "btl" },
    );
    // BTL subtotal = 5000; contingency = 0.10 × 5000 = 500
    expect(result.contingency).toBe(500);
    expect(result.contingencyPercent).toBe(0.10);
    expect(result.contingencyBasis).toBe("btl");
  });

  it('basis "total" → contingency = percent × (subtotal + fringeTotalSum)', () => {
    // subtotal=15000, fringeTotalSum=1500
    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": {
          base: 10_000,
          fringeCosts: [{ fringeId: "fringe-1", amount: 1_000 }],
          total: 11_000,
          resolvedQuantity: 1,
          resolvedRate: 10_000,
        },
        "line-b": {
          base: 5_000,
          fringeCosts: [{ fringeId: "fringe-1", amount: 500 }],
          total: 5_500,
          resolvedQuantity: 10,
          resolvedRate: 500,
        },
      },
      { contingencyPercent: 0.05, contingencyBasis: "total" },
    );
    // subtotal=15000, fringeTotalSum=1500, basis=16500, contingency=825
    expect(result.contingency).toBe(825);
  });

  it('basis "none" → contingency = 0', () => {
    const result = computeRollups(
      [LINE_A],
      [ATL_ACCT],
      {
        "line-a": { base: 10_000, fringeCosts: [], total: 10_000, resolvedQuantity: 1, resolvedRate: 10_000 },
      },
      { contingencyPercent: 0.15, contingencyBasis: "none" },
    );
    expect(result.contingency).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. grandTotal = subtotal + fringeTotalSum + contingency (end-to-end)
// ---------------------------------------------------------------------------

describe("grandTotal — end-to-end worked example", () => {
  it("ATL + BTL accounts, 2 fringes, 10% contingency on total", () => {
    // ATL: writer fee 1×10000 = 10000 base; fringe-pension 10%, fringe-health 4%
    //   fringe-pension amount = 1000, fringe-health amount = 400; line total = 11400
    // BTL: DP 10×500 = 5000 base; fringe-pension 10%
    //   fringe-pension amount = 500; line total = 5500
    //
    // subtotal = 10000 + 5000 = 15000
    // fringeTotals: { fringe-pension: 1500, fringe-health: 400 }
    // fringeTotalSum = 1900
    // contingencyBasis = "total" => basis = 15000 + 1900 = 16900
    // contingency = 0.10 × 16900 = 1690
    // grandTotal = 15000 + 1900 + 1690 = 18590

    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": {
          base: 10_000,
          fringeCosts: [
            { fringeId: "fringe-pension", amount: 1_000 },
            { fringeId: "fringe-health", amount: 400 },
          ],
          total: 11_400,
          resolvedQuantity: 1,
          resolvedRate: 10_000,
        },
        "line-b": {
          base: 5_000,
          fringeCosts: [{ fringeId: "fringe-pension", amount: 500 }],
          total: 5_500,
          resolvedQuantity: 10,
          resolvedRate: 500,
        },
      },
      { contingencyPercent: 0.10, contingencyBasis: "total" },
    );

    expect(result.subtotal).toBe(15_000);
    expect(result.fringeTotals).toEqual({ "fringe-pension": 1_500, "fringe-health": 400 });
    expect(result.fringeTotalSum).toBe(1_900);
    expect(result.contingency).toBe(1_690);
    expect(result.grandTotal).toBe(18_590);
  });

  it("ATL + BTL, 10% contingency on BTL only", () => {
    // ATL base=10000, BTL base=5000
    // no fringes
    // contingencyBasis="btl" => basis=5000, contingency=500
    // grandTotal = 15000 + 0 + 500 = 15500

    const result = computeRollups(
      [LINE_A, LINE_B],
      [ATL_ACCT, BTL_ACCT],
      {
        "line-a": { base: 10_000, fringeCosts: [], total: 10_000, resolvedQuantity: 1, resolvedRate: 10_000 },
        "line-b": { base: 5_000, fringeCosts: [], total: 5_000, resolvedQuantity: 10, resolvedRate: 500 },
      },
      { contingencyPercent: 0.10, contingencyBasis: "btl" },
    );

    expect(result.grandTotal).toBe(15_500);
  });
});

// ---------------------------------------------------------------------------
// 6. Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("account with no lines → subtotal 0, empty lines[]", () => {
    const result = computeRollups(
      [], // no lines
      [ATL_ACCT],
      {},
      NO_CONTINGENCY,
    );
    const sec = result.sections.find((s) => s.section === "atl")!;
    expect(sec.accounts[0].subtotal).toBe(0);
    expect(sec.accounts[0].lines).toEqual([]);
  });

  it("line with unknown account_id → skipped (not counted in any section)", () => {
    const orphanLine = { id: "line-orphan", account_id: "acct-unknown", description: "Ghost", quantity: 1, rate: 99_999 };
    const result = computeRollups(
      [orphanLine],
      [ATL_ACCT], // no account for "acct-unknown"
      {
        "line-orphan": { base: 99_999, fringeCosts: [], total: 99_999, resolvedQuantity: 1, resolvedRate: 99_999 },
      },
      NO_CONTINGENCY,
    );
    // ATL account exists but has no matching lines
    const atl = result.sections.find((s) => s.section === "atl")!;
    expect(atl.accounts[0].subtotal).toBe(0);
    expect(result.subtotal).toBe(0);
  });

  it("no lines and no accounts → empty sections, all zeros", () => {
    const result = computeRollups([], [], {}, NO_CONTINGENCY);
    expect(result.sections).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(result.fringeTotalSum).toBe(0);
    expect(result.contingency).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it("ResolvedLine carries resolvedQuantity/resolvedRate from cost result", () => {
    const result = computeRollups(
      [LINE_B],
      [BTL_ACCT],
      {
        "line-b": { base: 5_000, fringeCosts: [], total: 5_000, resolvedQuantity: 10, resolvedRate: 500 },
      },
      NO_CONTINGENCY,
    );
    const line = result.sections[0].accounts[0].lines[0];
    expect(line.quantity).toBe(10);
    expect(line.rate).toBe(500);
  });

  it("section only included when it has at least one account", () => {
    // Only ATL account — post/btl/other sections should not appear
    const result = computeRollups(
      [LINE_A],
      [ATL_ACCT],
      {
        "line-a": { base: 1_000, fringeCosts: [], total: 1_000, resolvedQuantity: 1, resolvedRate: 1_000 },
      },
      NO_CONTINGENCY,
    );
    expect(result.sections.map((s) => s.section)).toEqual(["atl"]);
  });

  it("budgetId is echoed into TopSheet", () => {
    const result = computeRollups(
      [],
      [],
      {},
      NO_CONTINGENCY,
      "budget-xyz",
    );
    expect(result.budgetId).toBe("budget-xyz");
  });
});
