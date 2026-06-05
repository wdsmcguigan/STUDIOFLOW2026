import { z } from "zod";

// ---- Enums (text + CHECK in DB; strict on write) --------------------------

export const section = z.enum(["atl", "btl", "post", "other"]);
export const globalKind = z.enum(["rate", "percent"]);
export const contingencyBasis = z.enum(["btl", "total", "none"]);

export type Section = z.infer<typeof section>;
export type GlobalKind = z.infer<typeof globalKind>;
export type ContingencyBasis = z.infer<typeof contingencyBasis>;

// ---- quantitySource — discriminated union (the soft seam) -----------------
// New derived sources should be added here as data, not scattered app logic.
// On READ from DB, quantity_source jsonb is parsed through this same union
// (the column is jsonb and we control its shape, so validate-on-read is safe).

export const quantitySource = z.discriminatedUnion("kind", [
  // Manual: no params — quantity is set explicitly on the line
  z.object({
    kind: z.literal("manual"),
  }),
  // element_count: count elements matching a category and/or department
  z.object({
    kind: z.literal("element_count"),
    params: z.object({
      categoryId: z.uuid().optional(),
      department: z.string().optional(),
    }),
  }),
  // shoot_day_count: count shoot days matching a dayType filter
  z.object({
    kind: z.literal("shoot_day_count"),
    params: z.object({
      dayType: z.string().optional(),
    }),
  }),
  // dood_cast_days: count DOOD working days for a specific cast person
  z.object({
    kind: z.literal("dood_cast_days"),
    params: z.object({
      personId: z.uuid(), // required — {} must fail
    }),
  }),
]);

export type QuantitySource = z.infer<typeof quantitySource>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) ------
// Convention (mirrors breakdown/schedule):
//   - enum-constrained DB columns → z.string() on read (loose; DB is source of truth)
//   - jsonb columns with a known union → parse through the union (we own the shape)
//   - nullable DB columns → .nullable()
//   - numeric DB columns → z.number() (Supabase returns JS numbers for numeric/float8)

export const budget = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  is_default: z.boolean(),
  contingency_percent: z.number(),
  contingency_basis: z.string(), // loose: text column
  created_at: z.string(),
  updated_at: z.string(),
});

export const budgetAccount = z.object({
  id: z.uuid(),
  budget_id: z.uuid(),
  name: z.string(),
  code: z.string(),
  section: z.string(), // loose: text column
  parent_account_id: z.uuid().nullable(),
  ordinal: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const budgetGlobal = z.object({
  id: z.uuid(),
  budget_id: z.uuid(),
  name: z.string(),
  kind: z.string(), // loose: text column
  value: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const fringe = z.object({
  id: z.uuid(),
  budget_id: z.uuid(),
  name: z.string(),
  percent: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const budgetLine = z.object({
  id: z.uuid(),
  budget_id: z.uuid(),
  account_id: z.uuid(),
  description: z.string(),
  quantity: z.number().nullable(),
  // loose on read (parse-on-read); the write input validates the union strictly
  quantity_source: z.unknown().nullable(),
  rate: z.number().nullable(),
  rate_global_id: z.uuid().nullable(),
  unit: z.string().nullable(),
  ordinal: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const budgetLineFringe = z.object({
  budget_id: z.uuid(),
  line_id: z.uuid(),
  fringe_id: z.uuid(),
});

export const costEntry = z.object({
  id: z.uuid(),
  budget_id: z.uuid(),
  account_id: z.uuid(),
  line_id: z.uuid().nullable(),
  amount: z.number(),
  entry_date: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
  created_by: z.uuid(),
  // No updated_at — append-only ledger; no update path
});

export type Budget = z.infer<typeof budget>;
export type BudgetAccount = z.infer<typeof budgetAccount>;
export type BudgetGlobal = z.infer<typeof budgetGlobal>;
export type Fringe = z.infer<typeof fringe>;
export type BudgetLine = z.infer<typeof budgetLine>;
export type BudgetLineFringe = z.infer<typeof budgetLineFringe>;
export type CostEntry = z.infer<typeof costEntry>;

// ---- Write inputs (parse-at-boundary; strict enums + uuids) ---------------

export const createBudgetInput = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  isDefault: z.boolean().default(false),
});

export const createAccountInput = z.object({
  budgetId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(20),
  section, // strict enum
  parentAccountId: z.uuid().nullable().default(null),
  ordinal: z.number().int().default(0),
});

export const createGlobalInput = z.object({
  budgetId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  kind: globalKind, // strict enum
  value: z.number(),
});

export const createFringeInput = z.object({
  budgetId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  percent: z.number().min(0).max(10), // fringe percent (0–1000%, stored as decimal e.g. 0.15)
});

// createLineInput: the soft seam — accepts either manual quantity/rate OR
// quantity_source/rate_global_id; all optional (line can be stubbed with description only).
export const createLineInput = z.object({
  budgetId: z.uuid(),
  accountId: z.uuid(),
  description: z.string().trim().min(1).max(500),
  // Manual path
  quantity: z.number().nullable().default(null),
  rate: z.number().nullable().default(null),
  unit: z.string().trim().max(50).nullable().default(null),
  // Derived path
  quantitySource: quantitySource.nullable().default(null),
  rateGlobalId: z.uuid().nullable().default(null),
  ordinal: z.number().int().default(0),
});

export const setLineFringesInput = z.object({
  lineId: z.uuid(),
  fringeIds: z.array(z.uuid()),
});

export const addCostEntryInput = z.object({
  budgetId: z.uuid(),
  accountId: z.uuid(),
  lineId: z.uuid().nullable().default(null),
  amount: z.number().refine((v) => v !== 0, "amount must be non-zero"),
  entryDate: z.string(), // ISO yyyy-MM-dd; validated at data layer
  note: z.string().trim().max(500).nullable().default(null),
});

export const setContingencyInput = z.object({
  percent: z.number().min(0).max(1), // decimal; 0.10 = 10% (consistent with fringe percent)
  basis: contingencyBasis, // strict enum
});

export type CreateBudgetInput = z.infer<typeof createBudgetInput>;
export type CreateAccountInput = z.infer<typeof createAccountInput>;
export type CreateGlobalInput = z.infer<typeof createGlobalInput>;
export type CreateFringeInput = z.infer<typeof createFringeInput>;
export type CreateLineInput = z.infer<typeof createLineInput>;
export type SetLineFringesInput = z.infer<typeof setLineFringesInput>;
export type AddCostEntryInput = z.infer<typeof addCostEntryInput>;
export type SetContingencyInput = z.infer<typeof setContingencyInput>;

// ---- Derived-result types (engine outputs — not persisted) ----------------
// These are the shapes Tasks 7–9 (derive/cost, derive/rollups, derive/variance)
// produce and Tasks 12–14 (UI) consume. Defined as plain TS interfaces so they
// can be refined in later tasks without migrating Zod schemas.

/**
 * A single budget line with all quantities/rates fully resolved:
 * - quantity: the effective count (manual or derived from quantitySource)
 * - rate: the effective rate (manual or resolved from rateGlobalId)
 * - base: quantity × rate before fringes
 * - fringeCosts: per-fringe breakdown (fringe id → amount)
 * - fringeTotal: sum of all applied fringe amounts
 * - total: base + fringeTotal
 */
export interface ResolvedLine {
  lineId: string;
  accountId: string;
  description: string;
  quantity: number;
  rate: number;
  base: number;
  fringeCosts: Record<string, number>; // fringeId → amount
  fringeTotal: number;
  total: number;
}

/**
 * All resolved lines under a single budget account, plus their subtotal.
 */
export interface AccountRollup {
  accountId: string;
  code: string;
  name: string;
  section: Section;
  lines: ResolvedLine[];
  subtotal: number;
}

/**
 * All accounts under a top-level section, plus their subtotal.
 */
export interface SectionRollup {
  section: Section;
  accounts: AccountRollup[];
  subtotal: number;
}

/**
 * The complete top sheet: all sections + fringe totals + contingency + grand total.
 * This is the primary shape passed to the TopSheet UI (Task 12).
 */
export interface TopSheet {
  budgetId: string;
  sections: SectionRollup[];
  /** Subtotal before contingency (sum of all section subtotals) */
  subtotal: number;
  /** Per-fringe totals across the entire budget */
  fringeTotals: Record<string, number>; // fringeId → total
  /** Sum of all fringe costs across the budget */
  fringeTotalSum: number;
  /** Contingency amount (derived from percent × basis) */
  contingency: number;
  contingencyPercent: number;
  contingencyBasis: ContingencyBasis;
  /** subtotal + fringeTotalSum + contingency */
  grandTotal: number;
}

/**
 * Plain-data inputs assembled by loadBudgetDerivationInputs for the pure budget engine.
 *
 * This is the seam between the DB and the engine (Tasks 7–9): the loader reads
 * breakdown + schedule via their respective data-layer functions and reduces them
 * to flat counts. The engine receives this object and performs no DB access.
 *
 * All counts reflect the "confirmed-only" and "dated-only" upstream gates:
 * - elementCounts*    : only scene_elements with status = 'confirmed'
 * - shootDayCountsByType : only shoot_days with a non-null date
 * - doodPaidDaysByPerson : DOOD entries whose code is in the PAID_DOOD_CODES set
 */
export interface BudgetDerivationInputs {
  /** categoryId → count of confirmed scene_element tags whose element has that category_id */
  elementCountsByCategory: Record<string, number>;
  /** departmentId → count of confirmed scene_element tags whose element's category has that department_id */
  elementCountsByDepartment: Record<string, number>;
  /** day_type → count of dated shoot_days of that type */
  shootDayCountsByType: Record<string, number>;
  /** personId → count of that person's DOOD entries with a paid code (Work, Hold, Travel) */
  doodPaidDaysByPerson: Record<string, number>;
}

/**
 * The full authored slice for a budget, loaded together for the engine.
 * `lineFringeIds` maps each line id to its attached fringe ids (may be empty array).
 */
export interface BudgetBundle {
  budget: Budget;
  accounts: BudgetAccount[];
  lines: BudgetLine[];
  globals: BudgetGlobal[];
  fringes: Fringe[];
  lineFringeIds: Record<string, string[]>; // lineId → fringeId[]
}

/**
 * Variance between budget estimate and actuals for a single line or account.
 */
export interface VarianceLine {
  id: string; // lineId or accountId
  estimate: number;
  actual: number;
  variance: number; // estimate − actual (positive = under budget)
}

/**
 * Full variance report for a budget: per-line and per-account breakdowns,
 * plus the overall budget-level totals.
 */
export interface Variance {
  budgetId: string;
  byLine: Record<string, VarianceLine>; // lineId → VarianceLine
  byAccount: Record<string, VarianceLine>; // accountId → VarianceLine
  budget: {
    estimate: number;
    actual: number;
    variance: number;
  };
}
