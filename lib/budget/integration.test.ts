/**
 * Phase 4 cross-module integration test
 *
 * THESIS: The budget derives live from the confirmed breakdown AND the
 * schedule/DOOD, with NO sync step. The engine is pure and runs on every read
 * call (derived-on-read). This file proves that thesis end-to-end with a
 * live database.
 *
 * Guard: skip unless SUPABASE_SERVICE_ROLE_KEY is set (same pattern as every
 * other live-DB test in this codebase).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

import {
  getOrCreateDefaultBudget,
  createAccount,
  createGlobal,
  createLine,
  setLineQuantitySource,
  setLineRateGlobal,
  addCostEntry,
  getTopSheet,
  getAccountDetail,
  getVariance,
} from "@/lib/budget/data";

// ---------------------------------------------------------------------------
// Harness helpers (mirror data.test.ts style exactly)
// ---------------------------------------------------------------------------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string): Promise<SupabaseClient<Database>> {
  const password = globalThis.crypto.randomUUID();
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const client = createClient<Database>(url, anon, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return client;
}

async function newProject(client: SupabaseClient<Database>): Promise<string> {
  const { data: me } = await client.auth.getUser();
  const { data, error } = await client
    .from("projects")
    .insert({ title: "Integration Test Project", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Integration suite
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "Phase 4 cross-module integration — budget derives from breakdown + schedule",
  () => {
    let alice: SupabaseClient<Database>;
    let projectId: string;

    // Budget layer ids
    let budgetId: string;
    let accountId: string;
    let castLineId: string;   // dood_cast_days bound to personId, rate via global (800)
    let elementLineId: string; // element_count bound to catPropsId, manual rate (50)
    let globalId: string;     // value = 800 (cast day rate)

    // Breakdown layer ids
    let personId: string;
    let charId: string;
    let sceneId: string;
    let catPropsId: string;
    let elementId: string;
    let sceneCharId: string; // PK of the scene_characters row (for status flip)

    // Schedule layer ids
    let shootDay1Id: string; // 2026-09-01 — initial shoot day

    // ---------------------------------------------------------------------------
    // Seed: full upstream graph in beforeAll
    //
    // Person → Character (cast_person_id) → confirmed scene_character → segment →
    // strip on dated shoot day → DOOD derives SW for person on 2026-09-01
    //
    // Element → confirmed scene_element in catPropsId
    // Budget: castLine (dood_cast_days, personId, rate=800)
    //         elementLine (element_count, catPropsId, rate=50 manual)
    // ---------------------------------------------------------------------------

    beforeAll(async () => {
      alice = await makeUser(`alice-integration-${globalThis.crypto.randomUUID()}@test.dev`);
      projectId = await newProject(alice);

      // ── Breakdown: department + category ────────────────────────────────────
      const { data: dept, error: deptErr } = await alice
        .from("departments")
        .insert({ project_id: projectId, name: "Props", ordinal: 0 })
        .select("id")
        .single();
      if (deptErr) throw deptErr;

      const { data: cat, error: catErr } = await alice
        .from("element_categories")
        .insert({ project_id: projectId, name: "Props", department_id: dept!.id, ordinal: 0 })
        .select("id")
        .single();
      if (catErr) throw catErr;
      catPropsId = cat!.id;

      // ── Breakdown: element ───────────────────────────────────────────────────
      const { data: el, error: elErr } = await alice
        .from("elements")
        .insert({ project_id: projectId, category_id: catPropsId, name: "Hero Pistol" })
        .select("id")
        .single();
      if (elErr) throw elErr;
      elementId = el!.id;

      // ── Breakdown: person + character (cast) ─────────────────────────────────
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({ project_id: projectId, name: "Integration Actor" })
        .select("id")
        .single();
      if (personErr) throw personErr;
      personId = person!.id;

      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: projectId, primary_name: "DETECTIVE", cast_person_id: personId })
        .select("id")
        .single();
      if (charErr) throw charErr;
      charId = char!.id;

      // ── Script + scene ───────────────────────────────────────────────────────
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: projectId, title: "Integration Test Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;

      const { data: scene, error: sceneErr } = await alice
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
      if (sceneErr) throw sceneErr;
      sceneId = scene!.id;

      // ── Confirmed scene_character tag: DETECTIVE in sceneId ─────────────────
      const { data: scChar, error: scCharErr } = await alice
        .from("scene_characters")
        .insert({
          scene_id: sceneId,
          character_id: charId,
          status: "confirmed",
          presence_type: "speaking",
          provenance: "manual",
          anchor_state: "anchored",
        })
        .select("id")
        .single();
      if (scCharErr) throw scCharErr;
      sceneCharId = scChar!.id;

      // ── Confirmed scene_element tag: Hero Pistol in sceneId ─────────────────
      const { error: seErr } = await alice
        .from("scene_elements")
        .insert({
          scene_id: sceneId,
          element_id: elementId,
          status: "confirmed",
          provenance: "manual",
          anchor_state: "anchored",
        });
      if (seErr) throw seErr;

      // ── Schedule: 1 dated shoot day, segment, strip ──────────────────────────
      // 2026-09-01 — actor works this day → DOOD codes SW (single start = SW)
      const { data: day1, error: d1Err } = await alice
        .from("shoot_days")
        .insert({
          project_id: projectId,
          ordinal: 0,
          date: "2026-09-01",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (d1Err) throw d1Err;
      shootDay1Id = day1!.id;

      const { data: seg, error: segErr } = await alice
        .from("scene_segments")
        .insert({ project_id: projectId, scene_id: sceneId, ordinal: 0, page_eighths: 8 })
        .select("id")
        .single();
      if (segErr) throw segErr;

      // Strip: places the scene on shoot day 1
      const { error: stripErr } = await alice
        .from("strips")
        .insert({
          project_id: projectId,
          shoot_day_id: shootDay1Id,
          type: "scene",
          scene_segment_id: seg!.id,
          ordinal: 0,
        });
      if (stripErr) throw stripErr;

      // ── Budget: default budget + account ─────────────────────────────────────
      const budgetRow = await getOrCreateDefaultBudget(alice, projectId);
      budgetId = budgetRow.id;

      const account = await createAccount(alice, {
        budgetId,
        name: "Talent",
        code: "N100",
        section: "atl",
        parentAccountId: null,
        ordinal: 0,
      });
      accountId = account.id;

      // ── Global: day rate = 800 ────────────────────────────────────────────────
      const globalRow = await createGlobal(alice, {
        budgetId,
        name: "Cast Day Rate",
        kind: "rate",
        value: 800,
      });
      globalId = globalRow.id;

      // ── Cast line: dood_cast_days bound to personId, rate = global (800) ─────
      const castLine = await createLine(alice, {
        budgetId,
        accountId,
        description: "Detective — DOOD days",
        quantity: null,
        rate: null,
        unit: "day",
        quantitySource: null,
        rateGlobalId: null,
        ordinal: 0,
      });
      castLineId = castLine.id;

      await setLineQuantitySource(alice, castLineId, {
        kind: "dood_cast_days",
        params: { personId },
      });
      await setLineRateGlobal(alice, castLineId, globalId);

      // ── Element line: element_count bound to catPropsId, manual rate = 50 ────
      const elementLine = await createLine(alice, {
        budgetId,
        accountId,
        description: "Props count",
        quantity: null,
        rate: 50,
        unit: "item",
        quantitySource: { kind: "element_count", params: { categoryId: catPropsId } },
        rateGlobalId: null,
        ordinal: 1,
      });
      elementLineId = elementLine.id;
    }, 60_000); // generous timeout for all the inserts

    // ── Assertion 1: DOOD-derived cost appears ────────────────────────────────
    it("Assertion 1: getTopSheet reflects DOOD-derived cost for the cast line", async () => {
      // Actor is on 1 dated shoot day → expected DOOD code is SW (start of work).
      // SW is in PAID_DOOD_CODES → 1 paid day → castLine cost = 1 × 800 = 800.
      const topSheet = await getTopSheet(alice, projectId);

      const allLines = topSheet.sections.flatMap((s) => s.accounts).flatMap((a) => a.lines);
      const castResolved = allLines.find((l) => l.lineId === castLineId);
      expect(castResolved).toBeDefined();

      // Paid days: 1 (SW on 2026-09-01)
      expect(castResolved!.quantity).toBe(1);
      // Rate: 800 (from global)
      expect(castResolved!.rate).toBe(800);
      // Cost: 1 × 800 = 800
      expect(castResolved!.base).toBeCloseTo(800, 5);
    });

    // ── Assertion 2: Extend schedule → cost increases with NO sync step ────────
    it("Assertion 2: adding another dated shoot day raises cast line cost with no sync step", async () => {
      // Capture baseline cost from assertion 1 — 1 day × $800 = $800
      const before = await getTopSheet(alice, projectId);
      const beforeLines = before.sections.flatMap((s) => s.accounts).flatMap((a) => a.lines);
      const beforeCast = beforeLines.find((l) => l.lineId === castLineId)!;
      const costBefore = beforeCast.base;

      // Add a second dated shoot day and place the SAME scene on it.
      // This adds another DOOD paid day for the actor (WF = Work Finish).
      const { data: day2, error: d2Err } = await alice
        .from("shoot_days")
        .insert({
          project_id: projectId,
          ordinal: 1,
          date: "2026-09-02",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (d2Err) throw d2Err;

      // New segment for the same scene (split off a second segment)
      const { data: seg2, error: seg2Err } = await alice
        .from("scene_segments")
        .insert({ project_id: projectId, scene_id: sceneId, ordinal: 1, page_eighths: 4 })
        .select("id")
        .single();
      if (seg2Err) throw seg2Err;

      const { error: stripErr } = await alice
        .from("strips")
        .insert({
          project_id: projectId,
          shoot_day_id: day2!.id,
          type: "scene",
          scene_segment_id: seg2!.id,
          ordinal: 0,
        });
      if (stripErr) throw stripErr;

      // Re-read immediately — NO sync step, NO cache bust, NO manual recompute.
      // The engine derives from the DB on every call.
      const after = await getTopSheet(alice, projectId);
      const afterLines = after.sections.flatMap((s) => s.accounts).flatMap((a) => a.lines);
      const afterCast = afterLines.find((l) => l.lineId === castLineId)!;
      const costAfter = afterCast.base;

      // Actor now works 2 days (SW day1, WF day2) → both paid → 2 × 800 = 1600
      expect(afterCast.quantity).toBe(2);
      expect(afterCast.rate).toBe(800);
      expect(costAfter).toBeCloseTo(1600, 5);

      // The headline proof: schedule extension → higher cost, no sync needed.
      expect(costAfter).toBeGreaterThan(costBefore);
    });

    // ── Assertion 3: Add confirmed element → element-count line qty moves ──────
    it("Assertion 3: adding a second confirmed element in the same category increases element line quantity", async () => {
      // Capture baseline: 1 confirmed prop tag → qty = 1, cost = 1 × 50 = 50
      const before = await getAccountDetail(alice, projectId, accountId);
      const beforeAcct = Array.isArray(before) ? before[0] : before;
      const beforeElementLine = beforeAcct.lines.find((l) => l.lineId === elementLineId)!;
      const qtyBefore = beforeElementLine.quantity;
      expect(qtyBefore).toBe(1);

      // Add a second element in the same Props category and tag it confirmed in the scene
      const { data: el2, error: el2Err } = await alice
        .from("elements")
        .insert({ project_id: projectId, category_id: catPropsId, name: "Handcuffs" })
        .select("id")
        .single();
      if (el2Err) throw el2Err;

      const { error: seErr } = await alice
        .from("scene_elements")
        .insert({
          scene_id: sceneId,
          element_id: el2!.id,
          status: "confirmed",
          provenance: "manual",
          anchor_state: "anchored",
        });
      if (seErr) throw seErr;

      // Re-read — no sync step.
      const after = await getAccountDetail(alice, projectId, accountId);
      const afterAcct = Array.isArray(after) ? after[0] : after;
      const afterElementLine = afterAcct.lines.find((l) => l.lineId === elementLineId)!;
      const qtyAfter = afterElementLine.quantity;

      // 2 confirmed props → qty = 2, cost = 2 × 50 = 100
      expect(qtyAfter).toBe(2);
      expect(afterElementLine.base).toBeCloseTo(100, 5);

      // The proof: element qty moved up automatically.
      expect(qtyAfter).toBeGreaterThan(qtyBefore);
    });

    // ── Assertion 4: Reject cast tag → derived qty drops to 0 ────────────────
    it("Assertion 4: rejecting the scene_character tag removes actor from DOOD → cast line cost drops to 0", async () => {
      // Pre-check: actor currently has 2 paid DOOD days (from assertion 2).
      // Rejecting the scene_character breaks the path:
      //   confirmed scene_character → no cast on scene → no strips count for actor
      //   → getDOOD yields 0 paid days for personId
      //   → castLine resolvedQty = 0 → base cost = 0.

      // The scene_characters row was inserted in beforeAll; sceneCharId is its PK.
      const { error: rejectErr } = await alice
        .from("scene_characters")
        .update({ status: "rejected" })
        .eq("id", sceneCharId);
      if (rejectErr) throw rejectErr;

      // Re-read top sheet immediately — no sync step.
      const topSheet = await getTopSheet(alice, projectId);
      const allLines = topSheet.sections.flatMap((s) => s.accounts).flatMap((a) => a.lines);
      const castResolved = allLines.find((l) => l.lineId === castLineId)!;

      // Actor removed from confirmed cast → 0 paid DOOD days → qty = 0, cost = 0.
      expect(castResolved.quantity).toBe(0);
      expect(castResolved.base).toBeCloseTo(0, 5);
    });

    // ── Assertion 5: Variance from a cost entry ────────────────────────────────
    it("Assertion 5: addCostEntry creates an actual; getVariance reflects estimate − actual", async () => {
      // Budget state at this point:
      // - castLine: qty=0 (actor rejected), rate=800, base=0
      // - elementLine: qty=2, rate=50, base=100
      // - grandTotal estimate = 100 (no fringes, no contingency)
      //
      // Add an actual cost entry of $60 against the element line.
      const entry = await addCostEntry(alice, {
        budgetId,
        accountId,
        lineId: elementLineId,
        amount: 60,
        entryDate: "2026-09-01",
        note: "Prop purchase — hero pistol",
      });
      expect(entry.id).toBeTruthy();
      expect(entry.amount).toBe(60);

      // Re-read variance — no sync step.
      const variance = await getVariance(alice, projectId);
      expect(variance.budgetId).toBe(budgetId);

      // Budget-level: estimate = grandTotal = 100, actual = 60, variance = 40
      expect(variance.budget.actual).toBeCloseTo(60, 5);
      expect(variance.budget.estimate).toBeCloseTo(100, 5);
      expect(variance.budget.variance).toBeCloseTo(40, 5); // estimate − actual

      // Line-level: elementLine estimate = 100, actual = 60, variance = 40
      const linev = variance.byLine[elementLineId];
      expect(linev).toBeDefined();
      expect(linev!.actual).toBeCloseTo(60, 5);
      expect(linev!.estimate).toBeCloseTo(100, 5);
      expect(linev!.variance).toBeCloseTo(40, 5);

      // Account-level: actual = 60
      const acctv = variance.byAccount[accountId];
      expect(acctv).toBeDefined();
      expect(acctv!.actual).toBeCloseTo(60, 5);
    });
  },
);
