// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input at the server boundary. Follows lib/breakdown/data.ts style.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/db/types";
import {
  budget,
  budgetAccount,
  budgetGlobal,
  fringe,
  budgetLine,
  budgetLineFringe,
  costEntry,
  quantitySource,
  createAccountInput,
  createGlobalInput,
  createFringeInput,
  createLineInput,
  setLineFringesInput,
  addCostEntryInput,
  setContingencyInput,
  type Budget,
  type BudgetAccount,
  type BudgetGlobal,
  type Fringe,
  type BudgetLine,
  type BudgetLineFringe,
  type CostEntry,
  type BudgetDerivationInputs,
  type BudgetBundle,
  type TopSheet,
  type AccountRollup,
  type Variance,
  type QuantitySource,
} from "@/lib/budget/schema";
import { computeLineCost, resolveLineQuantity, resolveLineRate } from "@/lib/budget/derive/cost";
import { computeRollups } from "@/lib/budget/derive/rollups";
import { computeVariance } from "@/lib/budget/derive/variance";
import { getDOOD, listShootDays } from "@/lib/schedule/data";
import { listElements, listElementCategories } from "@/lib/breakdown/data";

type DbClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Default chart seed data (ported from legacy/components/projectmodules/Budget/budget-presets.ts)
// Structure only — rates are blank (null). Covers all major sections: atl, btl, post, other.
//
// Section mapping heuristic:
//   atl  = Above-the-Line: director/producer/writer fees, casting, talent
//   btl  = Below-the-Line: shoot crew, locations/travel, props/wardrobe/animals,
//          set construction, SFX, art dept, equipment, lab/digital, insurance
//   post = Post-production: editorial, color, sound design/mix, VFX, lab finishing
//   other= Miscellaneous (expenses, petty cash, shipping, phones)
// ---------------------------------------------------------------------------

interface SeedAccount {
  code: string;
  name: string;
  section: "atl" | "btl" | "post" | "other";
}

const SEED_ACCOUNTS: SeedAccount[] = [
  // ATL — Above the Line
  { code: "L100", name: "Director / Creative Fees", section: "atl" },
  { code: "N100", name: "Talent", section: "atl" },
  { code: "C100", name: "Casting", section: "atl" },
  // BTL — Below the Line (Shoot)
  { code: "A100", name: "Pre-Production & Wrap", section: "btl" },
  { code: "B100", name: "Shoot Crew", section: "btl" },
  { code: "D100", name: "Location & Travel", section: "btl" },
  { code: "E100", name: "Props, Wardrobe & Animals", section: "btl" },
  { code: "F100", name: "Set Construction", section: "btl" },
  { code: "G100", name: "Special Effects", section: "btl" },
  { code: "H100", name: "Art Department", section: "btl" },
  { code: "I100", name: "Equipment Rental", section: "btl" },
  { code: "J100", name: "Laboratory & Digital", section: "btl" },
  { code: "M100", name: "Insurance", section: "btl" },
  // POST — Post-Production
  { code: "K100", name: "Editorial & Finishing", section: "post" },
  // OTHER — Miscellaneous
  { code: "Z900", name: "Miscellaneous & Expenses", section: "other" },
];

// ---------------------------------------------------------------------------
// Budget (get-or-create default)
// ---------------------------------------------------------------------------

/**
 * Return the default budget for a project (is_default = true).
 * If none exists, inserts one and returns it. Idempotent — two calls return the same id.
 */
export async function getOrCreateDefaultBudget(client: DbClient, projectId: string): Promise<Budget> {
  const { data: existing, error: readErr } = await client
    .from("budgets")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_default", true)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if (existing) return budget.parse(existing);

  const { data, error } = await client
    .from("budgets")
    .insert({ project_id: projectId, name: "Budget", is_default: true })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      // Lost the create race — a concurrent caller inserted first.
      // Re-read the winner (the partial unique index guarantees exactly one row).
      const { data: winner, error: reErr } = await client
        .from("budgets")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_default", true)
        .single();
      if (reErr) throw new Error(reErr.message, { cause: reErr });
      return budget.parse(winner);
    }
    throw new Error(error.message, { cause: error });
  }
  return budget.parse(data);
}

// ---------------------------------------------------------------------------
// Default chart seed (idempotent: early-return if accounts already exist)
// ---------------------------------------------------------------------------

/**
 * Seed the default chart of accounts for a budget.
 * Idempotent: if the budget already has any accounts, no-ops and returns existing list.
 * Rates are left blank (null) — this seeds STRUCTURE only.
 */
export async function seedDefaultChart(client: DbClient, budgetId: string): Promise<BudgetAccount[]> {
  // Check for existing accounts — early-return prevents duplicates
  const { data: existing, error: readErr } = await client
    .from("budget_accounts")
    .select("id")
    .eq("budget_id", budgetId)
    .limit(1);
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if ((existing ?? []).length > 0) {
    // Already seeded — return the full list
    return listAccounts(client, budgetId);
  }

  const rows = SEED_ACCOUNTS.map((a, i) => ({
    budget_id: budgetId,
    code: a.code,
    name: a.name,
    section: a.section,
    ordinal: i,
  }));
  const { data, error } = await client
    .from("budget_accounts")
    .insert(rows)
    .select("*");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => budgetAccount.parse(r));
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function createAccount(client: DbClient, input: unknown): Promise<BudgetAccount> {
  const p = createAccountInput.parse(input);
  const { data, error } = await client
    .from("budget_accounts")
    .insert({
      budget_id: p.budgetId,
      name: p.name,
      code: p.code,
      section: p.section,
      parent_account_id: p.parentAccountId,
      ordinal: p.ordinal,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetAccount.parse(data);
}

/**
 * Partial update for a budget account.
 * Accepts a subset of fields: name, code, section, ordinal.
 * Only the provided fields are patched; all others are left unchanged.
 */
export async function updateAccount(
  client: DbClient,
  accountId: string,
  partial: Partial<{
    name: string;
    code: string;
    section: "atl" | "btl" | "post" | "other";
    ordinal: number;
  }>,
): Promise<BudgetAccount> {
  const patch: Database["public"]["Tables"]["budget_accounts"]["Update"] = {};
  if (partial.name !== undefined) patch.name = partial.name;
  if (partial.code !== undefined) patch.code = partial.code;
  if (partial.section !== undefined) patch.section = partial.section;
  if (partial.ordinal !== undefined) patch.ordinal = partial.ordinal;

  const { data, error } = await client
    .from("budget_accounts")
    .update(patch)
    .eq("id", accountId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetAccount.parse(data);
}

/** List accounts ordered by ordinal then code (stable for top-sheet display). */
export async function listAccounts(client: DbClient, budgetId: string): Promise<BudgetAccount[]> {
  const { data, error } = await client
    .from("budget_accounts")
    .select("*")
    .eq("budget_id", budgetId)
    .order("ordinal")
    .order("code");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => budgetAccount.parse(r));
}

// ---------------------------------------------------------------------------
// Globals (shared rate/percent values referenced by lines)
// ---------------------------------------------------------------------------

export async function createGlobal(client: DbClient, input: unknown): Promise<BudgetGlobal> {
  const p = createGlobalInput.parse(input);
  const { data, error } = await client
    .from("budget_globals")
    .insert({
      budget_id: p.budgetId,
      name: p.name,
      kind: p.kind,
      value: p.value,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetGlobal.parse(data);
}

export async function listGlobals(client: DbClient, budgetId: string): Promise<BudgetGlobal[]> {
  const { data, error } = await client
    .from("budget_globals")
    .select("*")
    .eq("budget_id", budgetId)
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => budgetGlobal.parse(r));
}

/**
 * Partial update for a budget global.
 * Accepts a subset of fields: name, kind, value.
 * Only the provided fields are patched; all others are left unchanged.
 */
export async function updateGlobal(
  client: DbClient,
  globalId: string,
  partial: Partial<{
    name: string;
    kind: "rate" | "percent";
    value: number;
  }>,
): Promise<BudgetGlobal> {
  const patch: Database["public"]["Tables"]["budget_globals"]["Update"] = {};
  if (partial.name !== undefined) patch.name = partial.name;
  if (partial.kind !== undefined) patch.kind = partial.kind;
  if (partial.value !== undefined) patch.value = partial.value;

  const { data, error } = await client
    .from("budget_globals")
    .update(patch)
    .eq("id", globalId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetGlobal.parse(data);
}

// ---------------------------------------------------------------------------
// Fringes (benefit/tax percentages applied to lines)
// ---------------------------------------------------------------------------

export async function createFringe(client: DbClient, input: unknown): Promise<Fringe> {
  const p = createFringeInput.parse(input);
  const { data, error } = await client
    .from("fringes")
    .insert({
      budget_id: p.budgetId,
      name: p.name,
      percent: p.percent,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return fringe.parse(data);
}

export async function listFringes(client: DbClient, budgetId: string): Promise<Fringe[]> {
  const { data, error } = await client
    .from("fringes")
    .select("*")
    .eq("budget_id", budgetId)
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => fringe.parse(r));
}

// ---------------------------------------------------------------------------
// Budget lines
// ---------------------------------------------------------------------------

export async function createLine(client: DbClient, input: unknown): Promise<BudgetLine> {
  const p = createLineInput.parse(input);
  const { data, error } = await client
    .from("budget_lines")
    .insert({
      budget_id: p.budgetId,
      account_id: p.accountId,
      description: p.description,
      quantity: p.quantity,
      rate: p.rate,
      unit: p.unit,
      // quantitySource is a jsonb column — cast through unknown to satisfy TS
      quantity_source: p.quantitySource as Json,
      rate_global_id: p.rateGlobalId,
      ordinal: p.ordinal,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetLine.parse(data);
}

export async function listLines(client: DbClient, budgetId: string): Promise<BudgetLine[]> {
  const { data, error } = await client
    .from("budget_lines")
    .select("*")
    .eq("budget_id", budgetId)
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => budgetLine.parse(r));
}

/**
 * Partial update for a budget line. Accepts a subset of createLineInput fields.
 * Only the provided fields are patched; all others are left unchanged.
 */
export async function updateLine(
  client: DbClient,
  lineId: string,
  partial: Partial<{
    description: string;
    quantity: number | null;
    rate: number | null;
    unit: string | null;
    ordinal: number;
  }>,
): Promise<BudgetLine> {
  const patch: Database["public"]["Tables"]["budget_lines"]["Update"] = {};
  if (partial.description !== undefined) patch.description = partial.description;
  if (partial.quantity !== undefined) patch.quantity = partial.quantity;
  if (partial.rate !== undefined) patch.rate = partial.rate;
  if (partial.unit !== undefined) patch.unit = partial.unit;
  if (partial.ordinal !== undefined) patch.ordinal = partial.ordinal;

  const { data, error } = await client
    .from("budget_lines")
    .update(patch)
    .eq("id", lineId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetLine.parse(data);
}

// ---------------------------------------------------------------------------
// Line ↔ fringe junction (REPLACE semantics — delete + re-insert)
// ---------------------------------------------------------------------------

/**
 * Replace the full set of fringes attached to a budget line.
 * Deletes existing budget_line_fringes for the line, then inserts the new set.
 * Fetches the line's budget_id internally (needed for the junction's budget_id column).
 * Idempotent-ish: calling with the same set produces the same result.
 */
export async function setLineFringes(
  client: DbClient,
  lineId: string,
  fringeIds: string[],
): Promise<BudgetLineFringe[]> {
  // Parse input
  setLineFringesInput.parse({ lineId, fringeIds });

  // Fetch the line to get budget_id (required by junction RLS check)
  const { data: line, error: lineErr } = await client
    .from("budget_lines")
    .select("budget_id")
    .eq("id", lineId)
    .single();
  if (lineErr) throw new Error(lineErr.message, { cause: lineErr });
  const budgetId = line.budget_id;

  // Replace set: delete-then-insert (non-atomic, like schedule's splitSegment).
  // A mid-operation insert failure would leave the line fringe-less; acceptable at
  // single-user pre-pro scale — promote to an RPC if this becomes a hot path.
  const { error: delErr } = await client
    .from("budget_line_fringes")
    .delete()
    .eq("line_id", lineId);
  if (delErr) throw new Error(delErr.message, { cause: delErr });

  if (fringeIds.length === 0) return [];

  // Insert the new set
  const rows = fringeIds.map((fringeId) => ({
    budget_id: budgetId,
    line_id: lineId,
    fringe_id: fringeId,
  }));
  const { data, error } = await client
    .from("budget_line_fringes")
    .insert(rows)
    .select("*");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => budgetLineFringe.parse(r));
}

// ---------------------------------------------------------------------------
// Cost entries (append-only ledger — no update path)
// ---------------------------------------------------------------------------

/**
 * Add an actuals cost entry to the append-only ledger.
 * A correction must be a new offsetting entry (never update an existing row).
 */
export async function addCostEntry(client: DbClient, input: unknown): Promise<CostEntry> {
  const p = addCostEntryInput.parse(input);
  const { data, error } = await client
    .from("cost_entries")
    .insert({
      budget_id: p.budgetId,
      account_id: p.accountId,
      line_id: p.lineId,
      amount: p.amount,
      entry_date: p.entryDate,
      note: p.note,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return costEntry.parse(data);
}

export async function listCostEntries(client: DbClient, budgetId: string): Promise<CostEntry[]> {
  const { data, error } = await client
    .from("cost_entries")
    .select("*")
    .eq("budget_id", budgetId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => costEntry.parse(r));
}

// ---------------------------------------------------------------------------
// Contingency (updates budgets.contingency_percent + contingency_basis)
// ---------------------------------------------------------------------------

/**
 * Update the contingency settings on a budget row.
 * Returns the updated budget row (parse-on-read).
 */
export async function setContingency(
  client: DbClient,
  budgetId: string,
  input: unknown,
): Promise<Budget> {
  const p = setContingencyInput.parse(input);
  const { data, error } = await client
    .from("budgets")
    .update({
      contingency_percent: p.percent,
      contingency_basis: p.basis,
    })
    .eq("id", budgetId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budget.parse(data);
}

// ---------------------------------------------------------------------------
// Budget derivation input loader (Task 6) — the seam between DB and engine
// ---------------------------------------------------------------------------

/**
 * Paid DOOD codes: Work-day codes + Hold + Travel.
 * Idle (I) and all other non-work codes are excluded.
 *
 * engine logic — freely revisable (no migration). Spec decision 4:
 * paid = Work + compound Work + Hold + Travel.
 */
const PAID_DOOD_CODES = new Set(["W", "SW", "WF", "SWF", "H", "T"]);

/**
 * Assemble the plain-data inputs the pure budget engine needs for one project.
 *
 * This is the ONLY place the engine's input is assembled. It proves the
 * "production graph" thesis: budget reads from breakdown (confirmed element
 * counts) and schedule (shoot-day counts + DOOD paid days) WITHOUT duplicating
 * their query logic — it reuses the upstream data-layer functions.
 *
 * Upstream gates carried forward:
 * - Phase 2 (breakdown): only scene_elements with status = 'confirmed' count.
 * - Phase 3 (schedule): only shoot_days with a non-null date count toward
 *   shootDayCountsByType. getDOOD already filters undated days internally.
 *
 * Department linkage: elements table has category_id but NOT department_id
 * directly. The category carries the department_id FK. We resolve via
 * listElementCategories to build a categoryId→departmentId lookup, then fan
 * out from confirmed element_id → category_id → department_id.
 *
 * Direct query: scene_elements has no project_id column; it scopes to a
 * project via scene_id. We fetch confirmed rows via:
 *   SELECT element_id FROM scene_elements
 *   WHERE scene_id IN (scenes for project) AND status = 'confirmed'
 * This is the budget data layer's one direct query — breakdown/data.ts has no
 * project-wide confirmed-count reader, only a per-scene variant.
 */
export async function loadBudgetDerivationInputs(
  client: DbClient,
  projectId: string,
): Promise<BudgetDerivationInputs> {
  // 1. Reuse schedule functions (do NOT re-query those tables directly)
  const [shootDays, doodEntries] = await Promise.all([
    listShootDays(client, projectId),
    getDOOD(client, projectId),
  ]);

  // 2. Reuse breakdown functions for element metadata
  const [elements, elementCategories] = await Promise.all([
    listElements(client, projectId),
    listElementCategories(client, projectId),
  ]);

  // 3. Direct query: confirmed scene_element tags scoped to this project.
  //    scene_elements has no project_id column — scope via scenes.
  const { data: sceneRows, error: sceneErr } = await client
    .from("scenes")
    .select("id")
    .eq("project_id", projectId);
  if (sceneErr) throw new Error(sceneErr.message, { cause: sceneErr });

  const sceneIds = (sceneRows ?? []).map((r) => r.id);

  let confirmedElementIds: string[] = [];
  if (sceneIds.length > 0) {
    const { data: seRows, error: seErr } = await client
      .from("scene_elements")
      .select("element_id")
      .in("scene_id", sceneIds)
      .eq("status", "confirmed");
    if (seErr) throw new Error(seErr.message, { cause: seErr });
    confirmedElementIds = (seRows ?? []).map((r) => r.element_id);
  }

  // 4. Build lookup maps from upstream metadata
  // elementId → category_id (from listElements)
  const elementCategoryMap = new Map<string, string>();
  for (const el of elements) {
    elementCategoryMap.set(el.id, el.category_id);
  }

  // categoryId → department_id (from listElementCategories; department_id is nullable)
  const categoryDepartmentMap = new Map<string, string | null>();
  for (const cat of elementCategories) {
    categoryDepartmentMap.set(cat.id, cat.department_id);
  }

  // 5. Count confirmed tags by category and by department
  const elementCountsByCategory: Record<string, number> = {};
  const elementCountsByDepartment: Record<string, number> = {};

  for (const elementId of confirmedElementIds) {
    const categoryId = elementCategoryMap.get(elementId);
    if (categoryId) {
      elementCountsByCategory[categoryId] = (elementCountsByCategory[categoryId] ?? 0) + 1;

      const departmentId = categoryDepartmentMap.get(categoryId);
      if (departmentId) {
        elementCountsByDepartment[departmentId] =
          (elementCountsByDepartment[departmentId] ?? 0) + 1;
      }
    }
    // Elements with no matching category (should not happen with FK constraints, but
    // be defensive) simply don't contribute to either record — spec: skip null keys.
  }

  // 6. Count dated shoot days by type (Phase-3 dated gate: null date → excluded)
  const shootDayCountsByType: Record<string, number> = {};
  for (const day of shootDays) {
    if (day.date !== null) {
      shootDayCountsByType[day.day_type] = (shootDayCountsByType[day.day_type] ?? 0) + 1;
    }
  }

  // 7. Count paid DOOD days per person
  const doodPaidDaysByPerson: Record<string, number> = {};
  for (const entry of doodEntries) {
    if (PAID_DOOD_CODES.has(entry.code)) {
      doodPaidDaysByPerson[entry.personId] = (doodPaidDaysByPerson[entry.personId] ?? 0) + 1;
    }
  }

  return {
    elementCountsByCategory,
    elementCountsByDepartment,
    shootDayCountsByType,
    doodPaidDaysByPerson,
  };
}

// ---------------------------------------------------------------------------
// setLineQuantitySource / setLineRateGlobal (Task 10 / Task 11 deferred writes)
// ---------------------------------------------------------------------------

/**
 * Update the quantity_source column for a budget line.
 * Pass null to clear (revert to manual: quantity column is used).
 * Returns the updated BudgetLine (parse-on-read).
 */
export async function setLineQuantitySource(
  client: DbClient,
  lineId: string,
  quantitySourceValue: QuantitySource | null,
): Promise<BudgetLine> {
  // Validate the source if non-null
  if (quantitySourceValue !== null) {
    quantitySource.parse(quantitySourceValue);
  }
  const { data, error } = await client
    .from("budget_lines")
    .update({ quantity_source: quantitySourceValue as Json })
    .eq("id", lineId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetLine.parse(data);
}

/**
 * Update the rate_global_id column for a budget line.
 * Pass null to clear (revert to manual: rate column is used).
 * Returns the updated BudgetLine (parse-on-read).
 */
export async function setLineRateGlobal(
  client: DbClient,
  lineId: string,
  rateGlobalId: string | null,
): Promise<BudgetLine> {
  const { data, error } = await client
    .from("budget_lines")
    .update({ rate_global_id: rateGlobalId })
    .eq("id", lineId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return budgetLine.parse(data);
}

// ---------------------------------------------------------------------------
// Engine-wiring read functions (Task 10) — derived-on-read
// ---------------------------------------------------------------------------

/**
 * Load the full authored budget slice for a project into a BudgetBundle.
 * Resolves the default budget (get-or-create), loads accounts/lines/globals/fringes,
 * and builds the lineFringeIds lookup from budget_line_fringes.
 */
export async function getBudget(client: DbClient, projectId: string): Promise<BudgetBundle> {
  const budgetRow = await getOrCreateDefaultBudget(client, projectId);
  const budgetId = budgetRow.id;

  const [accounts, lines, globals, fringes] = await Promise.all([
    listAccounts(client, budgetId),
    listLines(client, budgetId),
    listGlobals(client, budgetId),
    listFringes(client, budgetId),
  ]);

  // Build lineFringeIds: one query for all junction rows, group by line_id
  const { data: junctionRows, error: jErr } = await client
    .from("budget_line_fringes")
    .select("line_id, fringe_id")
    .eq("budget_id", budgetId);
  if (jErr) throw new Error(jErr.message, { cause: jErr });

  const lineFringeIds: Record<string, string[]> = {};
  // Pre-seed every known line with an empty array
  for (const line of lines) {
    lineFringeIds[line.id] = [];
  }
  for (const row of junctionRows ?? []) {
    // Select returns only line_id + fringe_id (no budget_id) — access directly
    const lineId = row.line_id;
    const fringeId = row.fringe_id;
    if (!lineFringeIds[lineId]) {
      lineFringeIds[lineId] = [];
    }
    lineFringeIds[lineId].push(fringeId);
  }

  return { budget: budgetRow, accounts, lines, globals, fringes, lineFringeIds };
}

// ---------------------------------------------------------------------------
// Private helper: load the full slice + run the engine → TopSheet
// This is the single wiring point consumed by getTopSheet/getAccountDetail/getVariance.
// ---------------------------------------------------------------------------

async function _computeTopSheet(client: DbClient, projectId: string): Promise<TopSheet> {
  // Load authored slice and derived inputs in parallel
  const [bundle, derivedInputs] = await Promise.all([
    getBudget(client, projectId),
    loadBudgetDerivationInputs(client, projectId),
  ]);

  const { budget: budgetRow, accounts, lines, globals, fringes, lineFringeIds } = bundle;

  // Build lookup maps for the engine
  const globalsById: Record<string, { value: number }> = {};
  for (const g of globals) {
    globalsById[g.id] = { value: g.value };
  }

  const fringesById: Record<string, { percent: number }> = {};
  for (const f of fringes) {
    fringesById[f.id] = { percent: f.percent };
  }

  // Compute per-line cost results, extended with resolvedQuantity + resolvedRate
  const costResultsByLine: Record<
    string,
    { base: number; fringeCosts: { fringeId: string; amount: number }[]; total: number; resolvedQuantity: number; resolvedRate: number }
  > = {};

  for (const line of lines) {
    const idsForLine = lineFringeIds[line.id] ?? [];
    const cost = computeLineCost(line, derivedInputs, globalsById, fringesById, idsForLine);
    const resolvedQuantity = resolveLineQuantity(line, derivedInputs);
    const resolvedRate = resolveLineRate(line, globalsById);
    costResultsByLine[line.id] = { ...cost, resolvedQuantity, resolvedRate };
  }

  // contingency_percent stored as decimal (0.10 = 10%), consistent with fringes.percent
  const contingencyPercent = budgetRow.contingency_percent;
  // contingency_basis is stored as text; cast to ContingencyBasis
  const contingencyBasis = (budgetRow.contingency_basis as "btl" | "total" | "none") ?? "none";

  // Cast accounts: BudgetAccount.section is string (loose read schema) but computeRollups
  // needs Section. We own both shapes — safe cast since the DB constrains to the enum values.
  const accountsTyped = accounts as Parameters<typeof computeRollups>[1];
  return computeRollups(lines, accountsTyped, costResultsByLine, { contingencyPercent, contingencyBasis }, budgetRow.id);
}

/**
 * Compute and return the full TopSheet for a project.
 * Nothing derived is persisted — engine runs on every call.
 */
export async function getTopSheet(client: DbClient, projectId: string): Promise<TopSheet> {
  return _computeTopSheet(client, projectId);
}

/**
 * Return AccountRollup(s) from the computed TopSheet.
 * - If accountId is provided: returns an array containing just that one AccountRollup
 *   (array form keeps a uniform return shape for the caller).
 * - If no accountId: returns all AccountRollups flattened from all sections.
 */
export async function getAccountDetail(
  client: DbClient,
  projectId: string,
  accountId?: string,
): Promise<AccountRollup[]> {
  const topSheet = await _computeTopSheet(client, projectId);
  const allAccounts = topSheet.sections.flatMap((s) => s.accounts);
  if (accountId !== undefined) {
    return allAccounts.filter((a) => a.accountId === accountId);
  }
  return allAccounts;
}

/**
 * Compute and return the Variance report for a project.
 * Runs getTopSheet, reads cost entries, calls computeVariance.
 */
export async function getVariance(client: DbClient, projectId: string): Promise<Variance> {
  // _computeTopSheet already resolves the budget internally (via getBudget →
  // getOrCreateDefaultBudget). Use topSheet.budgetId to avoid a redundant DB call.
  const topSheet = await _computeTopSheet(client, projectId);
  const costEntries = await listCostEntries(client, topSheet.budgetId);

  // Map CostEntry to the minimal CostEntryLike shape the variance engine needs
  const costEntryLikes = costEntries.map((e) => ({
    account_id: e.account_id,
    line_id: e.line_id,
    amount: e.amount,
  }));

  return computeVariance(topSheet, costEntryLikes);
}
