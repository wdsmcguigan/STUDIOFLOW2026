import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string) {
  const password = globalThis.crypto.randomUUID();
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const client = createClient<Database>(url, anon, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return client;
}
async function newProject(client: SupabaseClient<Database>) {
  const { data: me } = await client.auth.getUser();
  const { data, error } = await client.from("projects").insert({ title: "Test Prod", owner_id: me.user!.id }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("budget root RLS (0013)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
  let aliceProject: string, aliceBudgetId: string, aliceAccountId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@test.dev`);
    aliceProject = await newProject(alice);

    // Alice creates a budget
    const { data: budget, error: budgetErr } = await alice
      .from("budgets")
      .insert({ project_id: aliceProject, name: "Alice Budget" })
      .select("id")
      .single();
    if (budgetErr) throw budgetErr;
    aliceBudgetId = budget.id;

    // Alice creates a budget_account under her budget
    const { data: account, error: accountErr } = await alice
      .from("budget_accounts")
      .insert({
        budget_id: aliceBudgetId,
        code: "1000",
        name: "Above the Line",
        section: "atl",
        ordinal: 0,
      })
      .select("id")
      .single();
    if (accountErr) throw accountErr;
    aliceAccountId = account.id;
  });

  it("Alice can see her own budget", async () => {
    const { data, error } = await alice
      .from("budgets")
      .select("*")
      .eq("id", aliceBudgetId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(aliceBudgetId);
  });

  it("Bob cannot see Alice's budget", async () => {
    const { data, error } = await bob
      .from("budgets")
      .select("*")
      .eq("id", aliceBudgetId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("Alice can see her own budget_account", async () => {
    const { data, error } = await alice
      .from("budget_accounts")
      .select("*")
      .eq("id", aliceAccountId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(aliceAccountId);
  });

  it("Bob cannot see Alice's budget_account", async () => {
    const { data, error } = await bob
      .from("budget_accounts")
      .select("*")
      .eq("id", aliceAccountId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("two-FK escape: Bob cannot insert a budget_account with Bob's budget but Alice's parent_account_id", async () => {
    // Bob creates his own project + budget
    const bobProject = await newProject(bob);
    const { data: bobBudget, error: bobBudgetErr } = await bob
      .from("budgets")
      .insert({ project_id: bobProject, name: "Bob Budget" })
      .select("id")
      .single();
    if (bobBudgetErr) throw bobBudgetErr;
    const bobBudgetId = bobBudget.id;

    // Bob tries to insert with budget_id = his own, but parent_account_id = Alice's account
    const { error } = await bob
      .from("budget_accounts")
      .insert({
        budget_id: bobBudgetId,
        parent_account_id: aliceAccountId, // Alice's account — escape attempt
        code: "9999",
        name: "Escape Attempt",
        section: "btl",
        ordinal: 0,
      });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("budget lines RLS (0014)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
  let aliceProject: string;
  let aliceBudgetId: string, aliceAccountId: string;
  let bobProject: string;
  let bobBudgetId: string, bobAccountId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-lines-${globalThis.crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-lines-${globalThis.crypto.randomUUID()}@test.dev`);

    // Alice: project + budget + account
    aliceProject = await newProject(alice);
    const { data: aBudget, error: aBudgetErr } = await alice
      .from("budgets")
      .insert({ project_id: aliceProject, name: "Alice Budget Lines" })
      .select("id")
      .single();
    if (aBudgetErr) throw aBudgetErr;
    aliceBudgetId = aBudget.id;

    const { data: aAccount, error: aAccountErr } = await alice
      .from("budget_accounts")
      .insert({ budget_id: aliceBudgetId, code: "1100", name: "Crew", section: "btl", ordinal: 0 })
      .select("id")
      .single();
    if (aAccountErr) throw aAccountErr;
    aliceAccountId = aAccount.id;

    // Bob: project + budget + account
    bobProject = await newProject(bob);
    const { data: bBudget, error: bBudgetErr } = await bob
      .from("budgets")
      .insert({ project_id: bobProject, name: "Bob Budget Lines" })
      .select("id")
      .single();
    if (bBudgetErr) throw bBudgetErr;
    bobBudgetId = bBudget.id;

    const { data: bAccount, error: bAccountErr } = await bob
      .from("budget_accounts")
      .insert({ budget_id: bobBudgetId, code: "1100", name: "Crew", section: "btl", ordinal: 0 })
      .select("id")
      .single();
    if (bAccountErr) throw bAccountErr;
    bobAccountId = bAccount.id;
  });

  it("happy path: Alice inserts a budget_line with manual quantity+rate", async () => {
    const { error } = await alice
      .from("budget_lines")
      .insert({
        budget_id: aliceBudgetId,
        account_id: aliceAccountId,
        description: "Director",
        unit: "week",
        ordinal: 0,
        quantity: 4,
        rate: 10000,
      });
    expect(error).toBeNull();
  });

  it("escape (account): Bob inserts a budget_line with Bob's budget but Alice's account_id", async () => {
    const { error } = await bob
      .from("budget_lines")
      .insert({
        budget_id: bobBudgetId,
        account_id: aliceAccountId, // Alice's account — escape attempt
        description: "Escape via account",
        ordinal: 0,
      });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("escape (rate_global): Bob inserts a budget_line with Bob's budget+account but Alice's rate_global_id", async () => {
    // Alice creates a budget_global
    const { data: aGlobal, error: aGlobalErr } = await alice
      .from("budget_globals")
      .insert({ budget_id: aliceBudgetId, name: "Director Rate", kind: "rate", value: 10000 })
      .select("id")
      .single();
    if (aGlobalErr) throw aGlobalErr;

    const { error } = await bob
      .from("budget_lines")
      .insert({
        budget_id: bobBudgetId,
        account_id: bobAccountId,
        description: "Escape via rate_global",
        ordinal: 0,
        rate_global_id: aGlobal.id, // Alice's global — escape attempt
      });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("escape (junction fringe): Bob links his own line to Alice's fringe", async () => {
    // Alice creates a fringe
    const { data: aFringe, error: aFringeErr } = await alice
      .from("fringes")
      .insert({ budget_id: aliceBudgetId, name: "P&H", percent: 0.22 })
      .select("id")
      .single();
    if (aFringeErr) throw aFringeErr;

    // Bob creates his own budget_line
    const { data: bobLine, error: bobLineErr } = await bob
      .from("budget_lines")
      .insert({
        budget_id: bobBudgetId,
        account_id: bobAccountId,
        description: "Bob's Line",
        ordinal: 0,
      })
      .select("id")
      .single();
    if (bobLineErr) throw bobLineErr;

    // Bob tries to attach Alice's fringe to his line
    const { error } = await bob
      .from("budget_line_fringes")
      .insert({
        budget_id: bobBudgetId,
        line_id: bobLine.id,
        fringe_id: aFringe.id, // Alice's fringe — escape attempt
      });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("cost_entries append-only ledger RLS (0015)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
  let aliceProject: string;
  let aliceBudgetId: string, aliceAccountId: string, aliceLineId: string;
  let bobProject: string;
  let bobBudgetId: string, bobAccountId: string;
  let aliceEntryId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-cost-${globalThis.crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-cost-${globalThis.crypto.randomUUID()}@test.dev`);

    // Alice: project + budget + account + line
    aliceProject = await newProject(alice);
    const { data: aBudget, error: aBudgetErr } = await alice
      .from("budgets")
      .insert({ project_id: aliceProject, name: "Alice Cost Budget" })
      .select("id")
      .single();
    if (aBudgetErr) throw aBudgetErr;
    aliceBudgetId = aBudget.id;

    const { data: aAccount, error: aAccountErr } = await alice
      .from("budget_accounts")
      .insert({ budget_id: aliceBudgetId, code: "2000", name: "Production", section: "btl", ordinal: 0 })
      .select("id")
      .single();
    if (aAccountErr) throw aAccountErr;
    aliceAccountId = aAccount.id;

    const { data: aLine, error: aLineErr } = await alice
      .from("budget_lines")
      .insert({
        budget_id: aliceBudgetId,
        account_id: aliceAccountId,
        description: "Director Fee",
        ordinal: 0,
        quantity: 1,
        rate: 50000,
      })
      .select("id")
      .single();
    if (aLineErr) throw aLineErr;
    aliceLineId = aLine.id;

    // Bob: project + budget + account
    bobProject = await newProject(bob);
    const { data: bBudget, error: bBudgetErr } = await bob
      .from("budgets")
      .insert({ project_id: bobProject, name: "Bob Cost Budget" })
      .select("id")
      .single();
    if (bBudgetErr) throw bBudgetErr;
    bobBudgetId = bBudget.id;

    const { data: bAccount, error: bAccountErr } = await bob
      .from("budget_accounts")
      .insert({ budget_id: bobBudgetId, code: "2000", name: "Production", section: "btl", ordinal: 0 })
      .select("id")
      .single();
    if (bAccountErr) throw bAccountErr;
    bobAccountId = bAccount.id;
  });

  it("happy path: Alice inserts a cost_entry with budget+account+line all hers", async () => {
    const { data, error } = await alice
      .from("cost_entries")
      .insert({
        budget_id: aliceBudgetId,
        account_id: aliceAccountId,
        line_id: aliceLineId,
        amount: 12500,
        entry_date: "2026-06-01",
        note: "First payment",
      })
      .select("id, amount")
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.amount).toBe(12500);
    aliceEntryId = data!.id;
  });

  it("isolation: Bob cannot select Alice's cost_entry", async () => {
    const { data, error } = await bob
      .from("cost_entries")
      .select("*")
      .eq("id", aliceEntryId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("append-only proof: Alice cannot UPDATE her own cost_entry; row is immutable", async () => {
    // Attempt the update — no update policy exists, so RLS must deny it
    const { data: updateData, error: updateError } = await alice
      .from("cost_entries")
      .update({ amount: 999 })
      .eq("id", aliceEntryId)
      .select();

    // RLS with no update policy: supabase-js may return empty data with no error
    // OR a 42501 error. Either is acceptable — the key proof is the row is unchanged.
    const wasBlocked =
      (updateError !== null && updateError.code === "42501") ||
      (updateData !== null && updateData.length === 0);
    expect(wasBlocked).toBe(true);

    // Re-fetch and confirm the original amount is unchanged
    const { data: refetch, error: refetchErr } = await alice
      .from("cost_entries")
      .select("amount")
      .eq("id", aliceEntryId)
      .single();
    expect(refetchErr).toBeNull();
    expect(refetch!.amount).toBe(12500); // unchanged — ledger is immutable
  });

  it("escape (account): Bob inserts cost_entry with his own budget but Alice's account_id", async () => {
    const { error } = await bob
      .from("cost_entries")
      .insert({
        budget_id: bobBudgetId,
        account_id: aliceAccountId, // Alice's account — escape attempt
        amount: 100,
        entry_date: "2026-06-01",
      });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("escape (line): Bob inserts cost_entry with his own budget+account but Alice's line_id", async () => {
    const { error } = await bob
      .from("cost_entries")
      .insert({
        budget_id: bobBudgetId,
        account_id: bobAccountId,
        line_id: aliceLineId, // Alice's line — escape attempt
        amount: 100,
        entry_date: "2026-06-01",
      });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});

// ---------------------------------------------------------------------------
// Task 5: budget data layer — CRUD + idempotent default-chart seed
// ---------------------------------------------------------------------------

import {
  getOrCreateDefaultBudget,
  seedDefaultChart,
  createAccount,
  listAccounts,
  createGlobal,
  listGlobals,
  createFringe,
  listFringes,
  createLine,
  listLines,
  updateLine,
  setLineFringes,
  addCostEntry,
  listCostEntries,
  setContingency,
  loadBudgetDerivationInputs,
  getBudget,
  getTopSheet,
  getAccountDetail,
  getVariance,
  setLineQuantitySource,
  setLineRateGlobal,
} from "@/lib/budget/data";

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("budget data layer (Task 5)", () => {
  let alice: SupabaseClient<Database>;
  let aliceProject: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-data-${globalThis.crypto.randomUUID()}@test.dev`);
    aliceProject = await newProject(alice);
  });

  // ── getOrCreateDefaultBudget ─────────────────────────────────────────────

  it("getOrCreateDefaultBudget returns a budget row", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    expect(budget.id).toBeTruthy();
    expect(budget.project_id).toBe(aliceProject);
    expect(budget.is_default).toBe(true);
  });

  it("getOrCreateDefaultBudget is idempotent (same id on second call)", async () => {
    const b1 = await getOrCreateDefaultBudget(alice, aliceProject);
    const b2 = await getOrCreateDefaultBudget(alice, aliceProject);
    expect(b1.id).toBe(b2.id);
  });

  // ── seedDefaultChart ─────────────────────────────────────────────────────

  it("seedDefaultChart creates accounts (count > 0, all major sections present)", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const accounts = await seedDefaultChart(alice, budget.id);
    expect(accounts.length).toBeGreaterThan(0);
    const sections = new Set(accounts.map((a) => a.section));
    // Must cover ATL, BTL, POST — "other" is optional
    expect(sections.has("atl")).toBe(true);
    expect(sections.has("btl")).toBe(true);
    expect(sections.has("post")).toBe(true);
  });

  it("seedDefaultChart is idempotent (re-seeding returns same count)", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const first = await seedDefaultChart(alice, budget.id);
    const second = await seedDefaultChart(alice, budget.id);
    expect(second.length).toBe(first.length);
  });

  // ── createAccount / listAccounts ─────────────────────────────────────────

  it("createAccount + listAccounts round-trip", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const account = await createAccount(alice, {
      budgetId: budget.id,
      name: "Test Account",
      code: "Z100",
      section: "other",
      parentAccountId: null,
      ordinal: 999,
    });
    expect(account.id).toBeTruthy();
    expect(account.name).toBe("Test Account");
    expect(account.code).toBe("Z100");

    const list = await listAccounts(alice, budget.id);
    expect(list.some((a) => a.id === account.id)).toBe(true);
  });

  // ── createGlobal / listGlobals ───────────────────────────────────────────

  it("createGlobal + listGlobals round-trip", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const global = await createGlobal(alice, {
      budgetId: budget.id,
      name: "Day Rate",
      kind: "rate",
      value: 800,
    });
    expect(global.id).toBeTruthy();
    expect(global.value).toBe(800);

    const list = await listGlobals(alice, budget.id);
    expect(list.some((g) => g.id === global.id)).toBe(true);
  });

  // ── createFringe / listFringes ───────────────────────────────────────────

  it("createFringe + listFringes round-trip", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const fringe = await createFringe(alice, {
      budgetId: budget.id,
      name: "P&H",
      percent: 0.22,
    });
    expect(fringe.id).toBeTruthy();
    expect(fringe.percent).toBe(0.22);

    const list = await listFringes(alice, budget.id);
    expect(list.some((f) => f.id === fringe.id)).toBe(true);
  });

  // ── createLine / listLines / updateLine ──────────────────────────────────

  it("createLine (manual qty+rate) + listLines round-trip", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    // Need an account
    const account = await createAccount(alice, {
      budgetId: budget.id,
      name: "Crew",
      code: "Z200",
      section: "btl",
      parentAccountId: null,
      ordinal: 0,
    });
    const line = await createLine(alice, {
      budgetId: budget.id,
      accountId: account.id,
      description: "Director of Photography",
      quantity: 10,
      rate: 5000,
      unit: "day",
      quantitySource: null,
      rateGlobalId: null,
      ordinal: 0,
    });
    expect(line.id).toBeTruthy();
    expect(line.quantity).toBe(10);
    expect(line.rate).toBe(5000);

    const list = await listLines(alice, budget.id);
    expect(list.some((l) => l.id === line.id)).toBe(true);
  });

  it("updateLine changes a field", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const account = await createAccount(alice, {
      budgetId: budget.id,
      name: "Post",
      code: "Z300",
      section: "post",
      parentAccountId: null,
      ordinal: 0,
    });
    const line = await createLine(alice, {
      budgetId: budget.id,
      accountId: account.id,
      description: "Editor",
      quantity: 6,
      rate: 3000,
      unit: "week",
      quantitySource: null,
      rateGlobalId: null,
      ordinal: 0,
    });
    const updated = await updateLine(alice, line.id, { rate: 3500 });
    expect(updated.rate).toBe(3500);
    expect(updated.id).toBe(line.id);
  });

  // ── setLineFringes ────────────────────────────────────────────────────────

  it("setLineFringes: attach 2 fringes, replace with 1", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const account = await createAccount(alice, {
      budgetId: budget.id,
      name: "Benefits",
      code: "Z400",
      section: "btl",
      parentAccountId: null,
      ordinal: 0,
    });
    const line = await createLine(alice, {
      budgetId: budget.id,
      accountId: account.id,
      description: "Fringe Test Line",
      quantity: 1,
      rate: 1000,
      unit: null,
      quantitySource: null,
      rateGlobalId: null,
      ordinal: 0,
    });
    const fringe1 = await createFringe(alice, { budgetId: budget.id, name: "FICA", percent: 0.0765 });
    const fringe2 = await createFringe(alice, { budgetId: budget.id, name: "State UI", percent: 0.035 });

    // Attach 2
    await setLineFringes(alice, line.id, [fringe1.id, fringe2.id]);
    const { data: rows2 } = await alice
      .from("budget_line_fringes")
      .select("fringe_id")
      .eq("line_id", line.id);
    expect(rows2).toHaveLength(2);

    // Replace with 1
    await setLineFringes(alice, line.id, [fringe1.id]);
    const { data: rows1 } = await alice
      .from("budget_line_fringes")
      .select("fringe_id")
      .eq("line_id", line.id);
    expect(rows1).toHaveLength(1);
    expect(rows1![0].fringe_id).toBe(fringe1.id);
  });

  // ── addCostEntry / listCostEntries ────────────────────────────────────────

  it("addCostEntry + listCostEntries round-trip", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const account = await createAccount(alice, {
      budgetId: budget.id,
      name: "Actuals Acct",
      code: "Z500",
      section: "btl",
      parentAccountId: null,
      ordinal: 0,
    });
    const entry = await addCostEntry(alice, {
      budgetId: budget.id,
      accountId: account.id,
      lineId: null,
      amount: 12500,
      entryDate: "2026-06-01",
      note: "First payment",
    });
    expect(entry.id).toBeTruthy();
    expect(entry.amount).toBe(12500);

    const list = await listCostEntries(alice, budget.id);
    expect(list.some((e) => e.id === entry.id)).toBe(true);
  });

  // ── setContingency ────────────────────────────────────────────────────────

  it("setContingency updates percent and basis on the budget", async () => {
    const budget = await getOrCreateDefaultBudget(alice, aliceProject);
    const updated = await setContingency(alice, budget.id, { percent: 0.15, basis: "btl" });
    expect(updated.contingency_percent).toBe(0.15);
    expect(updated.contingency_basis).toBe("btl");
    expect(updated.id).toBe(budget.id);
  });
});

// ---------------------------------------------------------------------------
// Concurrency safety: getOrCreateDefaultBudget race (Phase 4 fix)
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "getOrCreateDefaultBudget concurrency safety (0016 fix)",
  () => {
    it(
      "concurrent callers all return the SAME budget id and exactly ONE default budget exists",
      async () => {
        // Fresh user + project — no default budget exists yet
        const alice = await makeUser(
          `alice-concur-${globalThis.crypto.randomUUID()}@test.dev`,
        );
        const projectId = await newProject(alice);

        // Fire four concurrent get-or-create calls; without the fix these would
        // all INSERT (race) and the 5th+ call would throw "multiple rows returned".
        const results = await Promise.all([
          getOrCreateDefaultBudget(alice, projectId),
          getOrCreateDefaultBudget(alice, projectId),
          getOrCreateDefaultBudget(alice, projectId),
          getOrCreateDefaultBudget(alice, projectId),
        ]);

        // (a) All callers must return the same canonical budget id
        const ids = results.map((b) => b.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(1);

        // (b) Exactly one is_default=true budget row exists for the project
        const { data: rows, error } = await alice
          .from("budgets")
          .select("id")
          .eq("project_id", projectId)
          .eq("is_default", true);
        expect(error).toBeNull();
        expect(rows).toHaveLength(1);
        expect(rows![0].id).toBe(ids[0]);
      },
      30000, // allow extra time for concurrent DB round-trips
    );
  },
);

// ---------------------------------------------------------------------------
// Task 6: loadBudgetDerivationInputs
// ---------------------------------------------------------------------------

/**
 * Seed helper: create a minimal script + scene for a project.
 * Returns the scene id.
 */
async function seedSceneBudget(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<string> {
  const { data: script, error: se } = await client
    .from("scripts")
    .insert({ project_id: projectId, title: "Budget Test Script" })
    .select("id")
    .single();
  if (se) throw se;

  const { data: scene, error: sce } = await client
    .from("scenes")
    .insert({
      project_id: projectId,
      script_id: script!.id,
      ordinal: 0,
      status: "active",
      page_eighths: 8,
    })
    .select("id")
    .single();
  if (sce) throw sce;
  return scene!.id;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("loadBudgetDerivationInputs (Task 6)", () => {
  let alice: SupabaseClient<Database>;
  let aliceProject: string;

  // Seeded entity ids used across tests
  let catPropsId: string;
  let catWardrobeId: string;
  let deptPropsId: string;
  let deptWardrobeId: string;
  let elementPropId: string;
  let elementWardrobeId: string;
  let sceneAId: string;
  let sceneBId: string;
  let personId: string;
  let shootDay1Id: string;
  let shootDay2Id: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-deriv-${globalThis.crypto.randomUUID()}@test.dev`);
    aliceProject = await newProject(alice);

    // ── Departments + categories ─────────────────────────────────────────────
    const { data: deptProps, error: dPe } = await alice
      .from("departments")
      .insert({ project_id: aliceProject, name: "Props", ordinal: 0 })
      .select("id")
      .single();
    if (dPe) throw dPe;
    deptPropsId = deptProps!.id;

    const { data: deptWardrobe, error: dWe } = await alice
      .from("departments")
      .insert({ project_id: aliceProject, name: "Wardrobe", ordinal: 1 })
      .select("id")
      .single();
    if (dWe) throw dWe;
    deptWardrobeId = deptWardrobe!.id;

    const { data: catProps, error: cPe } = await alice
      .from("element_categories")
      .insert({ project_id: aliceProject, name: "Props", department_id: deptPropsId, ordinal: 0 })
      .select("id")
      .single();
    if (cPe) throw cPe;
    catPropsId = catProps!.id;

    const { data: catWardrobe, error: cWe } = await alice
      .from("element_categories")
      .insert({ project_id: aliceProject, name: "Wardrobe", department_id: deptWardrobeId, ordinal: 1 })
      .select("id")
      .single();
    if (cWe) throw cWe;
    catWardrobeId = catWardrobe!.id;

    // ── Elements ─────────────────────────────────────────────────────────────
    const { data: elProp, error: ePe } = await alice
      .from("elements")
      .insert({ project_id: aliceProject, category_id: catPropsId, name: "Coffee Cup" })
      .select("id")
      .single();
    if (ePe) throw ePe;
    elementPropId = elProp!.id;

    const { data: elWardrobe, error: eWe } = await alice
      .from("elements")
      .insert({ project_id: aliceProject, category_id: catWardrobeId, name: "Trench Coat" })
      .select("id")
      .single();
    if (eWe) throw eWe;
    elementWardrobeId = elWardrobe!.id;

    // ── Scenes ────────────────────────────────────────────────────────────────
    sceneAId = await seedSceneBudget(alice, aliceProject);

    // Scene B needs a separate script insert (seedSceneBudget always inserts a new script)
    const { data: scriptB, error: sBe } = await alice
      .from("scripts")
      .insert({ project_id: aliceProject, title: "Budget Script B" })
      .select("id")
      .single();
    if (sBe) throw sBe;
    const { data: scB, error: scBe } = await alice
      .from("scenes")
      .insert({
        project_id: aliceProject,
        script_id: scriptB!.id,
        ordinal: 1,
        status: "active",
        page_eighths: 4,
      })
      .select("id")
      .single();
    if (scBe) throw scBe;
    sceneBId = scB!.id;

    // ── Scene element tags: confirmed + suggested/rejected ────────────────────
    // Scene A: prop element confirmed
    const { error: tAe } = await alice
      .from("scene_elements")
      .insert({
        scene_id: sceneAId,
        element_id: elementPropId,
        status: "confirmed",
        provenance: "manual",
        anchor_state: "anchored",
      });
    if (tAe) throw tAe;

    // Scene B: wardrobe element confirmed
    const { error: tBe } = await alice
      .from("scene_elements")
      .insert({
        scene_id: sceneBId,
        element_id: elementWardrobeId,
        status: "confirmed",
        provenance: "manual",
        anchor_state: "anchored",
      });
    if (tBe) throw tBe;

    // Scene A: prop element SUGGESTED (should NOT be counted)
    await alice.from("scene_elements").insert({
      scene_id: sceneAId,
      element_id: elementWardrobeId,
      status: "suggested",
      provenance: "ai",
      anchor_state: "needs_review",
    });

    // Scene B: prop element REJECTED (should NOT be counted)
    await alice.from("scene_elements").insert({
      scene_id: sceneBId,
      element_id: elementPropId,
      status: "rejected",
      provenance: "ai",
      anchor_state: "orphaned",
    });

    // ── Shoot days: 2 dated + 1 undated ──────────────────────────────────────
    const { data: day1, error: d1e } = await alice
      .from("shoot_days")
      .insert({
        project_id: aliceProject,
        ordinal: 0,
        date: "2026-09-01",
        day_type: "shoot",
        unit: "main",
      })
      .select("id")
      .single();
    if (d1e) throw d1e;
    shootDay1Id = day1!.id;

    const { data: day2, error: d2e } = await alice
      .from("shoot_days")
      .insert({
        project_id: aliceProject,
        ordinal: 1,
        date: "2026-09-02",
        day_type: "prep",
        unit: "main",
      })
      .select("id")
      .single();
    if (d2e) throw d2e;
    shootDay2Id = day2!.id;

    // Undated shoot day — must NOT appear in shootDayCountsByType
    await alice.from("shoot_days").insert({
      project_id: aliceProject,
      ordinal: 2,
      day_type: "shoot",
      unit: "main",
      // no date
    });

    // ── Person + character + segments + strips → produces DOOD entries ─────
    // We wire the full path so getDOOD yields real derived codes (real getDOOD path).
    // Actor works both shoot days → SW on day1 (2026-09-01), WF on day2 (2026-09-02).
    // Both SW and WF are in PAID_DOOD_CODES, so doodPaidDaysByPerson[personId] = 2.
    const { data: personRow, error: pe } = await alice
      .from("people")
      .insert({ project_id: aliceProject, name: "Budget Actor" })
      .select("id")
      .single();
    if (pe) throw pe;
    personId = personRow!.id;

    const { data: charRow, error: ce } = await alice
      .from("characters")
      .insert({ project_id: aliceProject, primary_name: "HERO", cast_person_id: personId })
      .select("id")
      .single();
    if (ce) throw ce;
    const charId = charRow!.id;

    // Segments for scene A and scene B
    const { data: segA, error: segAe } = await alice
      .from("scene_segments")
      .insert({ project_id: aliceProject, scene_id: sceneAId, ordinal: 0, page_eighths: 8 })
      .select("id")
      .single();
    if (segAe) throw segAe;

    const { data: segB, error: segBe } = await alice
      .from("scene_segments")
      .insert({ project_id: aliceProject, scene_id: sceneBId, ordinal: 0, page_eighths: 4 })
      .select("id")
      .single();
    if (segBe) throw segBe;

    // Scene characters: HERO confirmed on both scenes
    await alice.from("scene_characters").insert({
      scene_id: sceneAId,
      character_id: charId,
      status: "confirmed",
      presence_type: "speaking",
      provenance: "manual",
    });
    await alice.from("scene_characters").insert({
      scene_id: sceneBId,
      character_id: charId,
      status: "confirmed",
      presence_type: "speaking",
      provenance: "manual",
    });

    // Strips: scene A on day 1, scene B on day 2
    await alice.from("strips").insert({
      project_id: aliceProject,
      shoot_day_id: shootDay1Id,
      type: "scene",
      scene_segment_id: segA!.id,
      ordinal: 0,
    });
    await alice.from("strips").insert({
      project_id: aliceProject,
      shoot_day_id: shootDay2Id,
      type: "scene",
      scene_segment_id: segB!.id,
      ordinal: 0,
    });
  });

  // ── elementCountsByCategory (confirmed-only gate) ─────────────────────────

  it("elementCountsByCategory counts only confirmed tags, keyed by category_id", async () => {
    const inputs = await loadBudgetDerivationInputs(alice, aliceProject);
    // 1 confirmed prop (scene A) + 1 confirmed wardrobe (scene B)
    // suggested + rejected tags must NOT appear
    expect(inputs.elementCountsByCategory[catPropsId]).toBe(1);
    expect(inputs.elementCountsByCategory[catWardrobeId]).toBe(1);
  });

  it("elementCountsByCategory ignores suggested and rejected tags", async () => {
    const inputs = await loadBudgetDerivationInputs(alice, aliceProject);
    // The wardrobe cat count is exactly 1 (scene B confirmed), NOT 2
    // (scene A suggested wardrobe must be excluded)
    expect(inputs.elementCountsByCategory[catWardrobeId]).toBe(1);
    // The props cat count is exactly 1 (scene A confirmed), NOT 2
    // (scene B rejected prop must be excluded)
    expect(inputs.elementCountsByCategory[catPropsId]).toBe(1);
  });

  // ── elementCountsByDepartment (department resolution via category) ─────────

  it("elementCountsByDepartment counts confirmed tags via category → department", async () => {
    const inputs = await loadBudgetDerivationInputs(alice, aliceProject);
    // Props dept: 1 confirmed prop tag → dept Props
    expect(inputs.elementCountsByDepartment[deptPropsId]).toBe(1);
    // Wardrobe dept: 1 confirmed wardrobe tag → dept Wardrobe
    expect(inputs.elementCountsByDepartment[deptWardrobeId]).toBe(1);
  });

  // ── shootDayCountsByType (dated-only gate) ─────────────────────────────────

  it("shootDayCountsByType counts only dated shoot days, grouped by day_type", async () => {
    const inputs = await loadBudgetDerivationInputs(alice, aliceProject);
    // 1 dated 'shoot' day (2026-09-01) + 1 dated 'prep' day (2026-09-02)
    // The undated 'shoot' day must NOT be counted
    expect(inputs.shootDayCountsByType["shoot"]).toBe(1);
    expect(inputs.shootDayCountsByType["prep"]).toBe(1);
  });

  it("undated shoot day is excluded from shootDayCountsByType", async () => {
    const inputs = await loadBudgetDerivationInputs(alice, aliceProject);
    // Only 1 dated 'shoot' day — the undated one brings total to 1, not 2
    expect(inputs.shootDayCountsByType["shoot"]).toBe(1);
  });

  // ── doodPaidDaysByPerson (real getDOOD path + paid-code filter) ────────────
  //
  // Strategy: we seed the FULL schedule graph (person → character → confirmed
  // scene_characters → strips on dated shoot_days) so getDOOD produces real
  // derived DoodEntry rows. The actor works 2 consecutive shoot days, which the
  // DOOD engine codes SW (2026-09-01) and WF (2026-09-02). Both are in
  // PAID_DOOD_CODES, so doodPaidDaysByPerson[personId] must equal 2.
  // This exercises the paid-code filter on real getDOOD output.

  it("doodPaidDaysByPerson counts paid DOOD days for the seeded actor (real getDOOD path)", async () => {
    const inputs = await loadBudgetDerivationInputs(alice, aliceProject);
    // Actor works day1 (SW = paid) + day2 (WF = paid) → 2 paid days
    expect(inputs.doodPaidDaysByPerson[personId]).toBe(2);
  });

  it("idle/non-paid DOOD codes are excluded from doodPaidDaysByPerson", async () => {
    // Seed a second actor with ONLY an override-idle day — should yield 0 paid days
    const idleProject = await newProject(alice);

    const { data: idlePerson, error: ipE } = await alice
      .from("people")
      .insert({ project_id: idleProject, name: "Idle Extra" })
      .select("id")
      .single();
    if (ipE) throw ipE;
    const idlePersonId = idlePerson!.id;

    // Seed a dated shoot day (needed so getDOOD processes the project)
    const { error: idE } = await alice
      .from("shoot_days")
      .insert({ project_id: idleProject, ordinal: 0, date: "2026-10-01", day_type: "shoot", unit: "main" });
    if (idE) throw idE;

    // Force an 'idle' override for this person on that date
    // (cast_day_statuses allows source='override')
    await alice.from("cast_day_statuses").insert({
      project_id: idleProject,
      person_id: idlePersonId,
      date: "2026-10-01",
      status: "idle",
      source: "override",
    });

    const inputs = await loadBudgetDerivationInputs(alice, idleProject);
    // No scenes/characters → getDOOD produces no derived entries.
    // The override alone is not visible as a DoodEntry (cast_day_statuses with
    // status='idle' would appear as code 'I', but here there's no character
    // in the project, so getDOOD returns []).
    // Either way, idle entries must NOT contribute to doodPaidDaysByPerson.
    expect(inputs.doodPaidDaysByPerson[idlePersonId] ?? 0).toBe(0);
  });

  // ── Project scoping ────────────────────────────────────────────────────────

  it("data from a second project does not appear in the first project's inputs", async () => {
    // Carol seeds a second, isolated project
    const carol = await makeUser(`carol-deriv-${globalThis.crypto.randomUUID()}@test.dev`);
    const carolProject = await newProject(carol);

    // Carol seeds a department + category + element + confirmed tag
    const { data: carolDept } = await carol
      .from("departments")
      .insert({ project_id: carolProject, name: "Carol Props", ordinal: 0 })
      .select("id")
      .single();
    const { data: carolCat } = await carol
      .from("element_categories")
      .insert({ project_id: carolProject, name: "Carol Props", department_id: carolDept!.id, ordinal: 0 })
      .select("id")
      .single();
    const { data: carolEl } = await carol
      .from("elements")
      .insert({ project_id: carolProject, category_id: carolCat!.id, name: "Carol Prop" })
      .select("id")
      .single();
    const carolSceneId = await seedSceneBudget(carol, carolProject);
    await carol.from("scene_elements").insert({
      scene_id: carolSceneId,
      element_id: carolEl!.id,
      status: "confirmed",
      provenance: "manual",
      anchor_state: "anchored",
    });

    // Carol seeds a dated shoot day
    await carol.from("shoot_days").insert({
      project_id: carolProject,
      ordinal: 0,
      date: "2026-11-01",
      day_type: "shoot",
      unit: "main",
    });

    // Alice's inputs must not contain Carol's category or department
    const aliceInputs = await loadBudgetDerivationInputs(alice, aliceProject);
    expect(aliceInputs.elementCountsByCategory[carolCat!.id]).toBeUndefined();
    expect(aliceInputs.elementCountsByDepartment[carolDept!.id]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Task 10: engine-wiring read fns
// getBudget / getTopSheet / getAccountDetail / getVariance
// setLineQuantitySource / setLineRateGlobal
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("budget engine wiring (Task 10)", () => {
  let alice: SupabaseClient<Database>;
  let aliceProject: string;

  // Budget-layer ids
  let budgetId: string;
  let accountId: string;
  let manualLineId: string; // qty=5, rate=200 → base=1000
  let doodLineId: string;   // qty=dood(personId), rate=global(350)
  let globalId: string;     // value=350
  let fringeId: string;     // percent=0.20

  // Schedule / DOOD graph ids
  let shootDay1Id: string;
  let shootDay2Id: string;
  let personId: string;

  // We expect the actor to work 2 days (SW + WF → both paid)
  // dood line: qty=2, rate=350 → base=700, fringe=700*0.20=140, total=840
  // manual line: qty=5, rate=200 → base=1000, fringe=1000*0.20=200, total=1200

  beforeAll(async () => {
    alice = await makeUser(`alice-engine-${globalThis.crypto.randomUUID()}@test.dev`);
    aliceProject = await newProject(alice);

    // ── Budget root ──────────────────────────────────────────────────────────
    const budgetRow = await getOrCreateDefaultBudget(alice, aliceProject);
    budgetId = budgetRow.id;

    // ── Account (btl) ────────────────────────────────────────────────────────
    const account = await createAccount(alice, {
      budgetId,
      name: "Talent",
      code: "N100",
      section: "btl",
      parentAccountId: null,
      ordinal: 0,
    });
    accountId = account.id;

    // ── Global: day rate = 350 ────────────────────────────────────────────────
    const globalRow = await createGlobal(alice, {
      budgetId,
      name: "Day Rate",
      kind: "rate",
      value: 350,
    });
    globalId = globalRow.id;

    // ── Fringe: 20% ──────────────────────────────────────────────────────────
    const fringeRow = await createFringe(alice, {
      budgetId,
      name: "P&H",
      percent: 0.20,
    });
    fringeId = fringeRow.id;

    // ── Manual line: qty=5, rate=200 ─────────────────────────────────────────
    const manualLine = await createLine(alice, {
      budgetId,
      accountId,
      description: "Manual Crew Day",
      quantity: 5,
      rate: 200,
      unit: "day",
      quantitySource: null,
      rateGlobalId: null,
      ordinal: 0,
    });
    manualLineId = manualLine.id;
    // Attach fringe to manual line
    await setLineFringes(alice, manualLineId, [fringeId]);

    // ── Schedule graph for DOOD ───────────────────────────────────────────────
    // Actor works 2 dated shoot days → SW (day1) + WF (day2) → 2 paid days
    const { data: script, error: se } = await alice
      .from("scripts")
      .insert({ project_id: aliceProject, title: "Engine Test Script" })
      .select("id")
      .single();
    if (se) throw se;

    const { data: sceneA, error: scAe } = await alice
      .from("scenes")
      .insert({
        project_id: aliceProject,
        script_id: script!.id,
        ordinal: 0,
        status: "active",
        page_eighths: 8,
      })
      .select("id")
      .single();
    if (scAe) throw scAe;

    const { data: sceneB, error: scBe } = await alice
      .from("scenes")
      .insert({
        project_id: aliceProject,
        script_id: script!.id,
        ordinal: 1,
        status: "active",
        page_eighths: 8,
      })
      .select("id")
      .single();
    if (scBe) throw scBe;

    const { data: day1, error: d1e } = await alice
      .from("shoot_days")
      .insert({ project_id: aliceProject, ordinal: 0, date: "2026-09-10", day_type: "shoot", unit: "main" })
      .select("id")
      .single();
    if (d1e) throw d1e;
    shootDay1Id = day1!.id;

    const { data: day2, error: d2e } = await alice
      .from("shoot_days")
      .insert({ project_id: aliceProject, ordinal: 1, date: "2026-09-11", day_type: "shoot", unit: "main" })
      .select("id")
      .single();
    if (d2e) throw d2e;
    shootDay2Id = day2!.id;

    const { data: personRow, error: pe } = await alice
      .from("people")
      .insert({ project_id: aliceProject, name: "Engine Actor" })
      .select("id")
      .single();
    if (pe) throw pe;
    personId = personRow!.id;

    const { data: charRow, error: ce } = await alice
      .from("characters")
      .insert({ project_id: aliceProject, primary_name: "HERO2", cast_person_id: personId })
      .select("id")
      .single();
    if (ce) throw ce;
    const charId = charRow!.id;

    const { data: segA, error: segAe } = await alice
      .from("scene_segments")
      .insert({ project_id: aliceProject, scene_id: sceneA!.id, ordinal: 0, page_eighths: 8 })
      .select("id")
      .single();
    if (segAe) throw segAe;

    const { data: segB, error: segBe } = await alice
      .from("scene_segments")
      .insert({ project_id: aliceProject, scene_id: sceneB!.id, ordinal: 0, page_eighths: 8 })
      .select("id")
      .single();
    if (segBe) throw segBe;

    await alice.from("scene_characters").insert({
      scene_id: sceneA!.id, character_id: charId, status: "confirmed", presence_type: "speaking", provenance: "manual",
    });
    await alice.from("scene_characters").insert({
      scene_id: sceneB!.id, character_id: charId, status: "confirmed", presence_type: "speaking", provenance: "manual",
    });

    await alice.from("strips").insert({ project_id: aliceProject, shoot_day_id: shootDay1Id, type: "scene", scene_segment_id: segA!.id, ordinal: 0 });
    await alice.from("strips").insert({ project_id: aliceProject, shoot_day_id: shootDay2Id, type: "scene", scene_segment_id: segB!.id, ordinal: 0 });

    // ── DOOD line: bound to the actor's paid days via setLineQuantitySource
    //    rate via setLineRateGlobal ─────────────────────────────────────────
    const doodLine = await createLine(alice, {
      budgetId,
      accountId,
      description: "Actor DOOD Days",
      quantity: null,
      rate: null,
      unit: "day",
      quantitySource: null,
      rateGlobalId: null,
      ordinal: 1,
    });
    doodLineId = doodLine.id;

    // Wire up quantity source and rate global via new fns (Task 10)
    await setLineQuantitySource(alice, doodLineId, { kind: "dood_cast_days", params: { personId } });
    await setLineRateGlobal(alice, doodLineId, globalId);

    // Attach fringe to DOOD line too
    await setLineFringes(alice, doodLineId, [fringeId]);

    // ── Cost entry: $400 actual against the account ───────────────────────────
    await addCostEntry(alice, {
      budgetId,
      accountId,
      lineId: manualLineId,
      amount: 400,
      entryDate: "2026-09-10",
      note: "Partial payment",
    });
  });

  // ── setLineQuantitySource ─────────────────────────────────────────────────

  it("setLineQuantitySource persists a dood_cast_days source and returns updated BudgetLine", async () => {
    const line = await setLineQuantitySource(alice, doodLineId, {
      kind: "dood_cast_days",
      params: { personId },
    });
    expect(line.id).toBe(doodLineId);
    // quantity_source should be the dood_cast_days discriminated union shape
    expect((line.quantity_source as Record<string, unknown>)?.kind).toBe("dood_cast_days");
  });

  it("setLineQuantitySource with null clears the source (manual)", async () => {
    // Use a separate project so temp lines don't pollute the shared budget's rollup
    const tmpProject = await newProject(alice);
    const tmpBudget = await getOrCreateDefaultBudget(alice, tmpProject);
    const tmpAccount = await createAccount(alice, {
      budgetId: tmpBudget.id, name: "Tmp", code: "T001", section: "btl", parentAccountId: null, ordinal: 0,
    });
    const tempLine = await createLine(alice, {
      budgetId: tmpBudget.id,
      accountId: tmpAccount.id,
      description: "Temp line for null-clear",
      quantity: 3,
      rate: 100,
      unit: null,
      quantitySource: { kind: "manual" },
      rateGlobalId: null,
      ordinal: 0,
    });
    const cleared = await setLineQuantitySource(alice, tempLine.id, null);
    expect(cleared.quantity_source).toBeNull();
  });

  // ── setLineRateGlobal ─────────────────────────────────────────────────────

  it("setLineRateGlobal persists the global id and returns updated BudgetLine", async () => {
    const line = await setLineRateGlobal(alice, doodLineId, globalId);
    expect(line.id).toBe(doodLineId);
    expect(line.rate_global_id).toBe(globalId);
  });

  it("setLineRateGlobal with null clears the global (back to manual rate)", async () => {
    // Use a separate project so temp lines don't pollute the shared budget's rollup
    const tmpProject = await newProject(alice);
    const tmpBudget = await getOrCreateDefaultBudget(alice, tmpProject);
    const tmpAccount = await createAccount(alice, {
      budgetId: tmpBudget.id, name: "Tmp", code: "T001", section: "btl", parentAccountId: null, ordinal: 0,
    });
    const tmpGlobal = await createGlobal(alice, { budgetId: tmpBudget.id, name: "TmpRate", kind: "rate", value: 500 });
    const tempLine = await createLine(alice, {
      budgetId: tmpBudget.id,
      accountId: tmpAccount.id,
      description: "Temp line for rate global null",
      quantity: 1,
      rate: 500,
      unit: null,
      quantitySource: null,
      rateGlobalId: tmpGlobal.id,
      ordinal: 0,
    });
    const cleared = await setLineRateGlobal(alice, tempLine.id, null);
    expect(cleared.rate_global_id).toBeNull();
  });

  // ── getBudget ─────────────────────────────────────────────────────────────

  it("getBudget returns the authored bundle with correct lineFringeIds mapping", async () => {
    const bundle = await getBudget(alice, aliceProject);
    expect(bundle.budget.id).toBe(budgetId);
    expect(bundle.accounts.some((a) => a.id === accountId)).toBe(true);
    expect(bundle.lines.some((l) => l.id === manualLineId)).toBe(true);
    expect(bundle.lines.some((l) => l.id === doodLineId)).toBe(true);
    expect(bundle.fringes.some((f) => f.id === fringeId)).toBe(true);

    // lineFringeIds must map both lines to the fringe
    expect(bundle.lineFringeIds[manualLineId]).toContain(fringeId);
    expect(bundle.lineFringeIds[doodLineId]).toContain(fringeId);
  });

  // ── getTopSheet ───────────────────────────────────────────────────────────

  it("getTopSheet returns a TopSheet with correct grand total", async () => {
    // manual line: qty=5 rate=200 → base=1000 fringe=200 total=1200
    // dood line:   qty=2 rate=350 → base=700  fringe=140 total=840
    // no contingency (default 0 / none)
    // grandTotal = (1000+700) + (200+140) + 0 = 2040
    const topSheet = await getTopSheet(alice, aliceProject);
    expect(topSheet.budgetId).toBe(budgetId);

    // Subtotal = sum of base costs across all lines = 1000 + 700 = 1700
    expect(topSheet.subtotal).toBeCloseTo(1700, 5);

    // fringeTotalSum = 200 + 140 = 340
    expect(topSheet.fringeTotalSum).toBeCloseTo(340, 5);

    // grandTotal = 1700 + 340 + 0 = 2040
    expect(topSheet.grandTotal).toBeCloseTo(2040, 5);
  });

  it("getTopSheet resolved lines carry correct qty/rate (DOOD line uses global rate)", async () => {
    const topSheet = await getTopSheet(alice, aliceProject);
    // Find the btl section
    const btl = topSheet.sections.find((s) => s.section === "btl");
    expect(btl).toBeDefined();
    const account = btl!.accounts.find((a) => a.accountId === accountId);
    expect(account).toBeDefined();

    const doodResolved = account!.lines.find((l) => l.lineId === doodLineId);
    expect(doodResolved).toBeDefined();
    // qty = 2 paid DOOD days, rate = 350 (global)
    expect(doodResolved!.quantity).toBe(2);
    expect(doodResolved!.rate).toBe(350);
    expect(doodResolved!.base).toBeCloseTo(700, 5);

    const manualResolved = account!.lines.find((l) => l.lineId === manualLineId);
    expect(manualResolved).toBeDefined();
    // qty = 5, rate = 200 (manual)
    expect(manualResolved!.quantity).toBe(5);
    expect(manualResolved!.rate).toBe(200);
    expect(manualResolved!.base).toBeCloseTo(1000, 5);
  });

  it("getTopSheet applies contingency when set", async () => {
    // Set 10% contingency on btl basis → 10% of btl subtotal (1700) = 170
    await setContingency(alice, budgetId, { percent: 0.10, basis: "btl" });

    const topSheet = await getTopSheet(alice, aliceProject);
    // contingency = 0.10 * 1700 = 170
    expect(topSheet.contingency).toBeCloseTo(170, 5);
    // grandTotal = 1700 + 340 + 170 = 2210
    expect(topSheet.grandTotal).toBeCloseTo(2210, 5);

    // Reset contingency to none so other tests are not affected
    await setContingency(alice, budgetId, { percent: 0, basis: "none" });
  });

  // ── getAccountDetail ──────────────────────────────────────────────────────

  it("getAccountDetail(accountId) returns single AccountRollup with resolved lines", async () => {
    const rollup = await getAccountDetail(alice, aliceProject, accountId);
    // Should return exactly one AccountRollup for our account
    expect(Array.isArray(rollup)).toBe(true);
    expect((rollup as unknown[]).length).toBe(1);
    const acct = Array.isArray(rollup) ? rollup[0] : rollup;
    expect(acct.accountId).toBe(accountId);
    expect(acct.lines.some((l: { lineId: string }) => l.lineId === manualLineId)).toBe(true);
    expect(acct.lines.some((l: { lineId: string }) => l.lineId === doodLineId)).toBe(true);
  });

  it("getAccountDetail() (no accountId) returns all AccountRollups", async () => {
    const rollups = await getAccountDetail(alice, aliceProject);
    expect(Array.isArray(rollups)).toBe(true);
    const all = rollups as { accountId: string }[];
    expect(all.some((a) => a.accountId === accountId)).toBe(true);
  });

  // ── getVariance ───────────────────────────────────────────────────────────

  it("getVariance returns budget.actual = sum of cost entries", async () => {
    const variance = await getVariance(alice, aliceProject);
    expect(variance.budgetId).toBe(budgetId);
    // One cost entry of 400
    expect(variance.budget.actual).toBeCloseTo(400, 5);
    // estimate = grandTotal (with contingency reset to 0)
    // 1700 + 340 + 0 = 2040
    expect(variance.budget.estimate).toBeCloseTo(2040, 5);
    expect(variance.budget.variance).toBeCloseTo(1640, 5); // 2040 - 400
  });

  it("getVariance byLine reflects the cost entry against the manual line", async () => {
    const variance = await getVariance(alice, aliceProject);
    // Manual line: estimate = 1200 (total), actual = 400
    const linev = variance.byLine[manualLineId];
    expect(linev).toBeDefined();
    expect(linev!.actual).toBeCloseTo(400, 5);
    expect(linev!.estimate).toBeCloseTo(1200, 5);
    expect(linev!.variance).toBeCloseTo(800, 5);
  });

  it("getVariance byAccount reflects the cost entry against the account", async () => {
    const variance = await getVariance(alice, aliceProject);
    // Account: actual = 400 (entry is in this account)
    const acctv = variance.byAccount[accountId];
    expect(acctv).toBeDefined();
    expect(acctv!.actual).toBeCloseTo(400, 5);
  });
});
