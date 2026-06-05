import { describe, it, expect } from "vitest";
import {
  section,
  globalKind,
  contingencyBasis,
  quantitySource,
  createBudgetInput,
  createAccountInput,
  createGlobalInput,
  createFringeInput,
  createLineInput,
  setLineFringesInput,
  addCostEntryInput,
  setContingencyInput,
  budget,
  budgetAccount,
  budgetGlobal,
  fringe,
  budgetLine,
  budgetLineFringe,
  costEntry,
} from "@/lib/budget/schema";

// ---- Enum tests ---------------------------------------------------------------

describe("section enum", () => {
  it("accepts valid values", () => {
    expect(section.safeParse("atl").success).toBe(true);
    expect(section.safeParse("btl").success).toBe(true);
    expect(section.safeParse("post").success).toBe(true);
    expect(section.safeParse("other").success).toBe(true);
  });

  it("rejects junk", () => {
    expect(section.safeParse("xtl").success).toBe(false);
    expect(section.safeParse("ATL").success).toBe(false);
    expect(section.safeParse("").success).toBe(false);
    expect(section.safeParse(null).success).toBe(false);
  });
});

describe("globalKind enum", () => {
  it("accepts valid values", () => {
    expect(globalKind.safeParse("rate").success).toBe(true);
    expect(globalKind.safeParse("percent").success).toBe(true);
  });

  it("rejects junk", () => {
    expect(globalKind.safeParse("flat").success).toBe(false);
    expect(globalKind.safeParse("RATE").success).toBe(false);
  });
});

describe("contingencyBasis enum", () => {
  it("accepts valid values", () => {
    expect(contingencyBasis.safeParse("btl").success).toBe(true);
    expect(contingencyBasis.safeParse("total").success).toBe(true);
    expect(contingencyBasis.safeParse("none").success).toBe(true);
  });

  it("rejects junk", () => {
    expect(contingencyBasis.safeParse("atl").success).toBe(false);
    expect(contingencyBasis.safeParse("").success).toBe(false);
  });
});

// ---- quantitySource discriminated union ---------------------------------------

describe("quantitySource union", () => {
  it("validates { kind: 'manual' }", () => {
    expect(quantitySource.safeParse({ kind: "manual" }).success).toBe(true);
  });

  it("validates dood_cast_days with personId", () => {
    expect(
      quantitySource.safeParse({
        kind: "dood_cast_days",
        params: { personId: crypto.randomUUID() },
      }).success
    ).toBe(true);
  });

  it("rejects dood_cast_days with missing personId", () => {
    expect(
      quantitySource.safeParse({ kind: "dood_cast_days", params: {} }).success
    ).toBe(false);
  });

  it("validates element_count with categoryId", () => {
    expect(
      quantitySource.safeParse({
        kind: "element_count",
        params: { categoryId: crypto.randomUUID() },
      }).success
    ).toBe(true);
  });

  it("validates element_count with department only", () => {
    expect(
      quantitySource.safeParse({
        kind: "element_count",
        params: { department: "Camera" },
      }).success
    ).toBe(true);
  });

  it("validates element_count with both optional fields omitted", () => {
    expect(
      quantitySource.safeParse({
        kind: "element_count",
        params: {},
      }).success
    ).toBe(true);
  });

  it("validates shoot_day_count with dayType", () => {
    expect(
      quantitySource.safeParse({
        kind: "shoot_day_count",
        params: { dayType: "shoot" },
      }).success
    ).toBe(true);
  });

  it("validates shoot_day_count with no params content", () => {
    expect(
      quantitySource.safeParse({
        kind: "shoot_day_count",
        params: {},
      }).success
    ).toBe(true);
  });

  it("rejects unknown kind", () => {
    expect(quantitySource.safeParse({ kind: "unknown_future_kind" }).success).toBe(false);
  });
});

// ---- Read-row schema tests ----------------------------------------------------

describe("budget row schema", () => {
  it("parses a valid budget row", () => {
    const row = {
      id: crypto.randomUUID(),
      project_id: crypto.randomUUID(),
      name: "2026 Feature Budget",
      is_default: true,
      contingency_percent: 10,
      contingency_basis: "btl",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const result = budget.safeParse(row);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(budget.safeParse({ id: "nope" }).success).toBe(false);
  });
});

describe("budgetAccount row schema", () => {
  it("parses a valid account row", () => {
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      name: "Camera",
      code: "1200",
      section: "btl",
      parent_account_id: null,
      ordinal: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(budgetAccount.safeParse(row).success).toBe(true);
  });
});

describe("budgetGlobal row schema", () => {
  it("parses a valid global row", () => {
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      name: "Daily Rate",
      kind: "rate",
      value: 750,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(budgetGlobal.safeParse(row).success).toBe(true);
  });
});

describe("fringe row schema", () => {
  it("parses a valid fringe row", () => {
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      name: "Payroll Tax",
      percent: 0.15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(fringe.safeParse(row).success).toBe(true);
  });
});

describe("budgetLine row schema", () => {
  it("parses a line with manual quantity", () => {
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      account_id: crypto.randomUUID(),
      description: "DP Prep Days",
      quantity: 5,
      quantity_source: null,
      rate: 1200,
      rate_global_id: null,
      unit: "day",
      ordinal: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(budgetLine.safeParse(row).success).toBe(true);
  });

  it("parses a line with quantity_source jsonb", () => {
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      account_id: crypto.randomUUID(),
      description: "Cast Days",
      quantity: null,
      quantity_source: { kind: "dood_cast_days", params: { personId: crypto.randomUUID() } },
      rate: 2000,
      rate_global_id: null,
      unit: "day",
      ordinal: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(budgetLine.safeParse(row).success).toBe(true);
  });

  it("parses a line with an unknown/future quantity_source kind (loose read)", () => {
    // budgetLine read-row uses z.unknown() for quantity_source so future kinds never throw
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      account_id: crypto.randomUUID(),
      description: "Future Derived Line",
      quantity: null,
      quantity_source: { kind: "unknown_future_kind", params: { something: 42 } },
      rate: 500,
      rate_global_id: null,
      unit: "day",
      ordinal: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(budgetLine.safeParse(row).success).toBe(true);
  });
});

describe("budgetLineFringe row schema", () => {
  it("parses a valid junction row", () => {
    const row = {
      budget_id: crypto.randomUUID(),
      line_id: crypto.randomUUID(),
      fringe_id: crypto.randomUUID(),
    };
    expect(budgetLineFringe.safeParse(row).success).toBe(true);
  });
});

describe("costEntry row schema", () => {
  it("parses a valid cost entry row", () => {
    const row = {
      id: crypto.randomUUID(),
      budget_id: crypto.randomUUID(),
      account_id: crypto.randomUUID(),
      line_id: null,
      amount: 4500,
      entry_date: "2026-06-05",
      note: "PO #1234",
      created_at: new Date().toISOString(),
      created_by: crypto.randomUUID(),
    };
    expect(costEntry.safeParse(row).success).toBe(true);
  });
});

// ---- Write input tests --------------------------------------------------------

describe("createBudgetInput", () => {
  it("accepts valid input", () => {
    const result = createBudgetInput.safeParse({
      projectId: crypto.randomUUID(),
      name: "Feature Film 2026",
    });
    expect(result.success).toBe(true);
  });

  it("rejects blank name", () => {
    expect(
      createBudgetInput.safeParse({ projectId: crypto.randomUUID(), name: "" }).success
    ).toBe(false);
  });

  it("rejects invalid projectId", () => {
    expect(createBudgetInput.safeParse({ projectId: "not-a-uuid", name: "Budget" }).success).toBe(
      false
    );
  });
});

describe("createAccountInput", () => {
  it("accepts valid input with strict section enum", () => {
    const result = createAccountInput.safeParse({
      budgetId: crypto.randomUUID(),
      name: "Camera",
      code: "1200",
      section: "btl",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid section", () => {
    expect(
      createAccountInput.safeParse({
        budgetId: crypto.randomUUID(),
        name: "Camera",
        code: "1200",
        section: "xtl",
      }).success
    ).toBe(false);
  });
});

describe("createGlobalInput", () => {
  it("accepts valid rate global", () => {
    const result = createGlobalInput.safeParse({
      budgetId: crypto.randomUUID(),
      name: "Daily Rate",
      kind: "rate",
      value: 750,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid kind", () => {
    expect(
      createGlobalInput.safeParse({
        budgetId: crypto.randomUUID(),
        name: "Test",
        kind: "flat",
        value: 100,
      }).success
    ).toBe(false);
  });
});

describe("createFringeInput", () => {
  it("accepts valid fringe input", () => {
    expect(
      createFringeInput.safeParse({
        budgetId: crypto.randomUUID(),
        name: "Payroll Tax",
        percent: 0.15,
      }).success
    ).toBe(true);
  });
});

describe("createLineInput", () => {
  it("accepts manual quantity + rate", () => {
    const result = createLineInput.safeParse({
      budgetId: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      description: "DP Prep Days",
      quantity: 5,
      rate: 1200,
      unit: "day",
    });
    expect(result.success).toBe(true);
  });

  it("accepts quantity_source + rate_global_id", () => {
    const result = createLineInput.safeParse({
      budgetId: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      description: "Cast shoot days",
      quantitySource: { kind: "dood_cast_days", params: { personId: crypto.randomUUID() } },
      rateGlobalId: crypto.randomUUID(),
      unit: "day",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal input (description only)", () => {
    const result = createLineInput.safeParse({
      budgetId: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      description: "TBD Line",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid quantitySource kind", () => {
    expect(
      createLineInput.safeParse({
        budgetId: crypto.randomUUID(),
        accountId: crypto.randomUUID(),
        description: "Bad line",
        quantitySource: { kind: "bad_kind" },
      }).success
    ).toBe(false);
  });

  it("rejects blank description", () => {
    expect(
      createLineInput.safeParse({
        budgetId: crypto.randomUUID(),
        accountId: crypto.randomUUID(),
        description: "",
      }).success
    ).toBe(false);
  });
});

describe("setLineFringesInput", () => {
  it("accepts valid input", () => {
    expect(
      setLineFringesInput.safeParse({
        lineId: crypto.randomUUID(),
        fringeIds: [crypto.randomUUID(), crypto.randomUUID()],
      }).success
    ).toBe(true);
  });

  it("accepts empty fringeIds array (clear all fringes)", () => {
    expect(
      setLineFringesInput.safeParse({
        lineId: crypto.randomUUID(),
        fringeIds: [],
      }).success
    ).toBe(true);
  });

  it("rejects non-uuid in fringeIds", () => {
    expect(
      setLineFringesInput.safeParse({
        lineId: crypto.randomUUID(),
        fringeIds: ["not-a-uuid"],
      }).success
    ).toBe(false);
  });
});

describe("addCostEntryInput", () => {
  it("accepts valid cost entry", () => {
    expect(
      addCostEntryInput.safeParse({
        budgetId: crypto.randomUUID(),
        accountId: crypto.randomUUID(),
        amount: 4500,
        entryDate: "2026-06-05",
        note: "PO #1234",
      }).success
    ).toBe(true);
  });

  it("accepts entry without optional lineId/note", () => {
    expect(
      addCostEntryInput.safeParse({
        budgetId: crypto.randomUUID(),
        accountId: crypto.randomUUID(),
        amount: 100,
        entryDate: "2026-06-05",
      }).success
    ).toBe(true);
  });

  it("rejects zero amount", () => {
    expect(
      addCostEntryInput.safeParse({
        budgetId: crypto.randomUUID(),
        accountId: crypto.randomUUID(),
        amount: 0,
        entryDate: "2026-06-05",
      }).success
    ).toBe(false);
  });
});

describe("setContingencyInput", () => {
  it("accepts valid input", () => {
    expect(
      setContingencyInput.safeParse({
        percent: 0.1, // decimal: 0.1 = 10% (consistent with fringe percent)
        basis: "btl",
      }).success
    ).toBe(true);
  });

  it("rejects invalid basis", () => {
    expect(
      setContingencyInput.safeParse({ percent: 10, basis: "atl" }).success
    ).toBe(false);
  });

  it("rejects negative percent", () => {
    expect(
      setContingencyInput.safeParse({ percent: -1, basis: "none" }).success
    ).toBe(false);
  });
});
