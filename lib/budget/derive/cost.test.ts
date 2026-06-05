import { describe, it, expect } from "vitest";
import {
  resolveLineQuantity,
  resolveLineRate,
  computeLineCost,
} from "@/lib/budget/derive/cost";
import type { BudgetDerivationInputs } from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// Shared test fixture — a fully-populated derivation inputs object
// UUIDs are used as keys because the schema validates categoryId / personId
// as z.uuid() — plain label strings would fail safeParse.
// ---------------------------------------------------------------------------

// Fixed v4 UUIDs for test stability (must satisfy Zod v4's strict UUID regex,
// which requires version bits [1-8] in segment 3 and variant bits [89abAB] in segment 4).
const CAT_VEHICLES   = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const CAT_PROPS      = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2";
const DEPT_ART       = "dept-art";       // department is z.string(), not z.uuid()
const DEPT_COSTUME   = "dept-costume";
const PERSON_LEAD    = "c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3";
const PERSON_SUPPORT = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4";

const inputs: BudgetDerivationInputs = {
  elementCountsByCategory: {
    [CAT_VEHICLES]: 4,
    [CAT_PROPS]: 12,
  },
  elementCountsByDepartment: {
    [DEPT_ART]: 8,
    [DEPT_COSTUME]: 3,
  },
  shootDayCountsByType: {
    studio: 5,
    location: 10,
  },
  doodPaidDaysByPerson: {
    [PERSON_LEAD]: 7,
    [PERSON_SUPPORT]: 3,
  },
};

const emptyInputs: BudgetDerivationInputs = {
  elementCountsByCategory: {},
  elementCountsByDepartment: {},
  shootDayCountsByType: {},
  doodPaidDaysByPerson: {},
};

// ---------------------------------------------------------------------------
// resolveLineQuantity
// ---------------------------------------------------------------------------

describe("resolveLineQuantity", () => {
  it("manual line: returns line.quantity when no quantity_source", () => {
    expect(
      resolveLineQuantity(
        { quantity: 3, quantity_source: null },
        emptyInputs,
      ),
    ).toBe(3);
  });

  it("manual line: returns 0 when quantity is null and no quantity_source", () => {
    expect(
      resolveLineQuantity(
        { quantity: null, quantity_source: null },
        emptyInputs,
      ),
    ).toBe(0);
  });

  it("kind=manual: returns line.quantity (explicit manual source)", () => {
    expect(
      resolveLineQuantity(
        { quantity: 5, quantity_source: { kind: "manual" } },
        emptyInputs,
      ),
    ).toBe(5);
  });

  it("kind=element_count with categoryId: returns elementCountsByCategory value", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: {
            kind: "element_count",
            params: { categoryId: CAT_VEHICLES },
          },
        },
        inputs,
      ),
    ).toBe(4);
  });

  it("kind=element_count with department: returns elementCountsByDepartment value", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: {
            kind: "element_count",
            params: { department: DEPT_ART },
          },
        },
        inputs,
      ),
    ).toBe(8);
  });

  it("kind=element_count with neither categoryId nor department: returns 0", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: { kind: "element_count", params: {} },
        },
        inputs,
      ),
    ).toBe(0);
  });

  it("kind=element_count with missing categoryId key: returns 0", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 2,
          quantity_source: {
            kind: "element_count",
            // valid v4 UUID but not present in inputs
            params: { categoryId: "e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5" },
          },
        },
        inputs,
      ),
    ).toBe(0);
  });

  it("kind=shoot_day_count with dayType: returns shootDayCountsByType for that type", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: {
            kind: "shoot_day_count",
            params: { dayType: "studio" },
          },
        },
        inputs,
      ),
    ).toBe(5);
  });

  it("kind=shoot_day_count with no dayType: returns SUM of all shootDayCountsByType values", () => {
    // studio=5 + location=10 = 15
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: { kind: "shoot_day_count", params: {} },
        },
        inputs,
      ),
    ).toBe(15);
  });

  it("kind=shoot_day_count no dayType with empty inputs: returns 0", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: { kind: "shoot_day_count", params: {} },
        },
        emptyInputs,
      ),
    ).toBe(0);
  });

  it("kind=dood_cast_days with personId: returns doodPaidDaysByPerson value", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: {
            kind: "dood_cast_days",
            params: { personId: PERSON_LEAD },
          },
        },
        inputs,
      ),
    ).toBe(7);
  });

  it("kind=dood_cast_days with missing personId: returns 0", () => {
    expect(
      resolveLineQuantity(
        {
          quantity: 99,
          quantity_source: {
            kind: "dood_cast_days",
            // valid v4 UUID but not present in inputs
            params: { personId: "f6f6f6f6-f6f6-4f6f-8f6f-f6f6f6f6f6f6" },
          },
        },
        inputs,
      ),
    ).toBe(0);
  });

  it("unparseable quantity_source: falls back to line.quantity", () => {
    expect(
      resolveLineQuantity(
        { quantity: 7, quantity_source: { kind: "FUTURE_UNKNOWN", params: {} } },
        inputs,
      ),
    ).toBe(7);
  });

  it("unparseable quantity_source with null quantity: returns 0", () => {
    expect(
      resolveLineQuantity(
        { quantity: null, quantity_source: { not_a_valid_source: true } },
        inputs,
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveLineRate
// ---------------------------------------------------------------------------

describe("resolveLineRate", () => {
  const globalsById = {
    "global-day-rate": { value: 750 },
    "global-weekly": { value: 3000 },
  };

  it("uses line.rate when rate_global_id is null", () => {
    expect(
      resolveLineRate({ rate: 100, rate_global_id: null }, globalsById),
    ).toBe(100);
  });

  it("overrides line.rate with global value when rate_global_id is set and present", () => {
    expect(
      resolveLineRate(
        { rate: 100, rate_global_id: "global-day-rate" },
        globalsById,
      ),
    ).toBe(750);
  });

  it("falls back to line.rate when rate_global_id is set but global is absent", () => {
    expect(
      resolveLineRate(
        { rate: 100, rate_global_id: "global-missing" },
        globalsById,
      ),
    ).toBe(100);
  });

  it("returns 0 when rate is null and no global", () => {
    expect(
      resolveLineRate({ rate: null, rate_global_id: null }, globalsById),
    ).toBe(0);
  });

  it("returns 0 when rate is null and global is missing", () => {
    expect(
      resolveLineRate(
        { rate: null, rate_global_id: "global-missing" },
        globalsById,
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeLineCost
// ---------------------------------------------------------------------------

describe("computeLineCost", () => {
  const globalsById = { "global-rate": { value: 500 } };
  const fringesById = {
    "fringe-pension": { percent: 0.2 },
    "fringe-health": { percent: 0.1 },
    "fringe-vacation": { percent: 0.05 },
  };

  it("manual qty × rate, no fringes ⇒ base=300, total=300", () => {
    const result = computeLineCost(
      { quantity: 3, quantity_source: null, rate: 100, rate_global_id: null },
      emptyInputs,
      {},
      {},
      [],
    );
    expect(result.base).toBe(300);
    expect(result.fringeCosts).toEqual([]);
    expect(result.total).toBe(300);
  });

  it("stackable fringes: 0.20 + 0.10 on base 1000 ⇒ fringeCosts=[200,100], total=1300", () => {
    const result = computeLineCost(
      { quantity: 10, quantity_source: null, rate: 100, rate_global_id: null },
      emptyInputs,
      {},
      fringesById,
      ["fringe-pension", "fringe-health"],
    );
    expect(result.base).toBe(1000);
    // Order matches lineFringeIds order
    expect(result.fringeCosts).toEqual([
      { fringeId: "fringe-pension", amount: 200 },
      { fringeId: "fringe-health", amount: 100 },
    ]);
    expect(result.total).toBe(1300);
  });

  it("all three fringes stacked on base 1000 ⇒ total=1350", () => {
    const result = computeLineCost(
      { quantity: 10, quantity_source: null, rate: 100, rate_global_id: null },
      emptyInputs,
      {},
      fringesById,
      ["fringe-pension", "fringe-health", "fringe-vacation"],
    );
    expect(result.base).toBe(1000);
    expect(result.total).toBe(1350);
    expect(result.fringeCosts).toHaveLength(3);
  });

  it("fringe id not in fringesById is silently skipped", () => {
    const result = computeLineCost(
      { quantity: 5, quantity_source: null, rate: 100, rate_global_id: null },
      emptyInputs,
      {},
      fringesById,
      ["fringe-pension", "fringe-nonexistent"],
    );
    expect(result.base).toBe(500);
    expect(result.fringeCosts).toHaveLength(1);
    expect(result.fringeCosts[0].fringeId).toBe("fringe-pension");
    expect(result.total).toBe(600); // 500 + 100
  });

  it("null quantity ⇒ base 0, total 0", () => {
    const result = computeLineCost(
      { quantity: null, quantity_source: null, rate: 100, rate_global_id: null },
      emptyInputs,
      {},
      fringesById,
      ["fringe-pension"],
    );
    expect(result.base).toBe(0);
    expect(result.total).toBe(0);
    expect(result.fringeCosts[0].amount).toBe(0);
  });

  it("null rate ⇒ base 0, total 0", () => {
    const result = computeLineCost(
      { quantity: 10, quantity_source: null, rate: null, rate_global_id: null },
      emptyInputs,
      {},
      fringesById,
      ["fringe-pension"],
    );
    expect(result.base).toBe(0);
    expect(result.total).toBe(0);
  });

  it("both quantity and rate null ⇒ base 0, total 0", () => {
    const result = computeLineCost(
      { quantity: null, quantity_source: null, rate: null, rate_global_id: null },
      emptyInputs,
      {},
      {},
      [],
    );
    expect(result.base).toBe(0);
    expect(result.total).toBe(0);
    expect(result.fringeCosts).toEqual([]);
  });

  it("global rate overrides line rate in cost computation", () => {
    const result = computeLineCost(
      { quantity: 2, quantity_source: null, rate: 100, rate_global_id: "global-rate" },
      emptyInputs,
      globalsById,
      {},
      [],
    );
    // global-rate = 500, so base = 2 × 500 = 1000
    expect(result.base).toBe(1000);
    expect(result.total).toBe(1000);
  });

  it("element_count qty source + fringe ⇒ correct derivation end-to-end", () => {
    // CAT_VEHICLES=4, rate=200 ⇒ base=800; pension(0.2)=160 ⇒ total=960
    const result = computeLineCost(
      {
        quantity: null,
        quantity_source: { kind: "element_count", params: { categoryId: CAT_VEHICLES } },
        rate: 200,
        rate_global_id: null,
      },
      inputs,
      {},
      fringesById,
      ["fringe-pension"],
    );
    expect(result.base).toBe(800);
    expect(result.fringeCosts[0].amount).toBe(160);
    expect(result.total).toBe(960);
  });

  it("shoot_day_count (all) qty source: sums all day types", () => {
    // studio=5 + location=10 = 15 days, rate=100 ⇒ base=1500
    const result = computeLineCost(
      {
        quantity: null,
        quantity_source: { kind: "shoot_day_count", params: {} },
        rate: 100,
        rate_global_id: null,
      },
      inputs,
      {},
      {},
      [],
    );
    expect(result.base).toBe(1500);
    expect(result.total).toBe(1500);
  });

  it("dood_cast_days qty source: uses paid days for person", () => {
    // PERSON_LEAD=7, rate=300 ⇒ base=2100
    const result = computeLineCost(
      {
        quantity: null,
        quantity_source: {
          kind: "dood_cast_days",
          params: { personId: PERSON_LEAD },
        },
        rate: 300,
        rate_global_id: null,
      },
      inputs,
      {},
      {},
      [],
    );
    expect(result.base).toBe(2100);
    expect(result.total).toBe(2100);
  });

  it("unknown future kind falls back to line.quantity", () => {
    const result = computeLineCost(
      {
        quantity: 6,
        quantity_source: { kind: "FUTURE_KIND", params: {} },
        rate: 50,
        rate_global_id: null,
      },
      emptyInputs,
      {},
      {},
      [],
    );
    expect(result.base).toBe(300);
    expect(result.total).toBe(300);
  });
});
