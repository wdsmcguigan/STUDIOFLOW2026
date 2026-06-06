/**
 * Phase 5 cross-module integration test
 *
 * THESIS: The call sheet derives live from the schedule (stripboard) AND the
 * breakdown (confirmed cast), with NO sync step. Moving a scene to a different
 * shoot day changes BOTH days' call sheets — immediately, derived-on-read.
 *
 * Guard: skip unless SUPABASE_SERVICE_ROLE_KEY is set (same pattern as every
 * other live-DB test in this codebase).
 *
 * State: the `it` blocks share seeded state intentionally (mutations carry
 * forward). The order matters:
 *   1. Baseline → read day1 and day2 with sceneA on day1
 *   2. HEADLINE move → move sceneA to day2, both days update
 *   3. Reject cast → person drops from cast on the day the scene is now on
 *   4. Call-time cascade → dept > general > individual override end-to-end
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { CastCallRow, CrewDepartmentBlock } from "@/lib/callsheet/schema";
import {
  getCallSheet,
  setCrewDeptCall,
  setCrewDayCall,
  upsertCallSheetHeader,
} from "@/lib/callsheet/data";

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
    .insert({ title: "Phase 5 Integration Test", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Integration suite
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "Phase 5 cross-module integration — call sheet derives from schedule + breakdown",
  () => {
    let alice: SupabaseClient<Database>;
    let projectId: string;

    // Breakdown layer ids
    let personId: string;
    let sceneAId: string;
    let sceneBId: string;
    let sceneACharacterId: string; // PK of scene_characters row for sceneA

    // Schedule layer ids
    let day1Id: string; // "2026-09-01" — initial day for sceneA
    let day2Id: string; // "2026-09-02" — initial day for sceneB
    let sceneASegmentId: string; // scene_segments.id for sceneA
    let sceneAStripId: string; // strips.id placing sceneA (we UPDATE its shoot_day_id for the move)

    // Crew layer ids
    let crewMemberId: string;
    let crewDepartment: string; // "Camera"

    // ---------------------------------------------------------------------------
    // Seed: full upstream graph in beforeAll
    //
    // Person → Character (cast_person_id) → confirmed scene_characters tag on sceneA
    // TWO scenes: sceneA (on day1), sceneB (on day2)
    // TWO dated shoot days: day1 "2026-09-01", day2 "2026-09-02"
    // Crew member in "Camera" dept + crew_day_call placing them on day1
    //
    // DOOD will derive: person works day1 (sceneA confirmed on day1)
    // ---------------------------------------------------------------------------

    beforeAll(async () => {
      alice = await makeUser(`alice-cs-integ-${globalThis.crypto.randomUUID()}@test.dev`);
      projectId = await newProject(alice);

      // ── Script (required FK for scenes) ────────────────────────────────────
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: projectId, title: "Integration Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;
      const scriptId = script.id;

      // ── Two scenes ──────────────────────────────────────────────────────────
      const { data: sceneA, error: sceneAErr } = await alice
        .from("scenes")
        .insert({
          project_id: projectId,
          script_id: scriptId,
          scene_number: "1",
          int_ext: "INT",
          time_of_day: "DAY",
          location_slug: "OFFICE",
          page_eighths: 8,
          synopsis: "Scene A — the heist begins.",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (sceneAErr) throw sceneAErr;
      sceneAId = sceneA.id;

      const { data: sceneB, error: sceneBErr } = await alice
        .from("scenes")
        .insert({
          project_id: projectId,
          script_id: scriptId,
          scene_number: "2",
          int_ext: "EXT",
          time_of_day: "NIGHT",
          location_slug: "ROOFTOP",
          page_eighths: 4,
          synopsis: "Scene B — the confrontation.",
          ordinal: 1,
        })
        .select("id")
        .single();
      if (sceneBErr) throw sceneBErr;
      sceneBId = sceneB.id;

      // ── Person + Character (cast_person_id) ─────────────────────────────────
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({
          project_id: projectId,
          name: "Jane Actor",
          contact_email: "jane@studio.dev",
          contact_phone: "555-0001",
        })
        .select("id")
        .single();
      if (personErr) throw personErr;
      personId = person.id;

      const { data: character, error: charErr } = await alice
        .from("characters")
        .insert({
          project_id: projectId,
          primary_name: "DETECTIVE MORGAN",
          cast_person_id: personId,
        })
        .select("id")
        .single();
      if (charErr) throw charErr;
      const characterId = character.id;

      // ── Confirmed scene_characters: character in sceneA ─────────────────────
      const { data: scChar, error: scCharErr } = await alice
        .from("scene_characters")
        .insert({
          scene_id: sceneAId,
          character_id: characterId,
          status: "confirmed",
          presence_type: "speaking",
          provenance: "manual",
        })
        .select("id")
        .single();
      if (scCharErr) throw scCharErr;
      sceneACharacterId = scChar.id;

      // ── TWO dated shoot days ────────────────────────────────────────────────
      const { data: day1, error: day1Err } = await alice
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
      if (day1Err) throw day1Err;
      day1Id = day1.id;

      const { data: day2, error: day2Err } = await alice
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
      if (day2Err) throw day2Err;
      day2Id = day2.id;

      // ── Scene segments ──────────────────────────────────────────────────────
      const { data: segA, error: segAErr } = await alice
        .from("scene_segments")
        .insert({ project_id: projectId, scene_id: sceneAId, ordinal: 0, page_eighths: 8 })
        .select("id")
        .single();
      if (segAErr) throw segAErr;
      sceneASegmentId = segA.id;

      const { data: segB, error: segBErr } = await alice
        .from("scene_segments")
        .insert({ project_id: projectId, scene_id: sceneBId, ordinal: 0, page_eighths: 4 })
        .select("id")
        .single();
      if (segBErr) throw segBErr;
      const sceneBSegmentId = segB.id;

      // ── Strips: sceneA on day1, sceneB on day2 ───────────────────────────────
      const { data: stripA, error: stripAErr } = await alice
        .from("strips")
        .insert({
          project_id: projectId,
          shoot_day_id: day1Id,
          type: "scene",
          scene_segment_id: sceneASegmentId,
          ordinal: 0,
        })
        .select("id")
        .single();
      if (stripAErr) throw stripAErr;
      sceneAStripId = stripA.id;

      const { error: stripBErr } = await alice
        .from("strips")
        .insert({
          project_id: projectId,
          shoot_day_id: day2Id,
          type: "scene",
          scene_segment_id: sceneBSegmentId,
          ordinal: 0,
        });
      if (stripBErr) throw stripBErr;

      // ── Crew member in "Camera" dept ─────────────────────────────────────────
      crewDepartment = "Camera";
      const { data: crew, error: crewErr } = await alice
        .from("crew_members")
        .insert({
          project_id: projectId,
          name: "Sam DP",
          department: crewDepartment,
          position: "Director of Photography",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (crewErr) throw crewErr;
      crewMemberId = crew.id;

      // ── crew_day_call placing crew member on day1 (call_time null initially) ─
      // call_time=null: member is on today's call sheet but uses cascade resolution.
      const { error: cdcErr } = await alice
        .from("crew_day_calls")
        .insert({
          shoot_day_id: day1Id,
          crew_member_id: crewMemberId,
          call_time: null,
        });
      if (cdcErr) throw cdcErr;

      // ── Set general call time for day1 (used in cascade test) ───────────────
      await upsertCallSheetHeader(alice, {
        shootDayId: day1Id,
        generalCallTime: "07:00",
      });

      // Ensure call sheet row exists for day2 as well (for re-reads later).
      await upsertCallSheetHeader(alice, {
        shootDayId: day2Id,
        generalCallTime: "08:00",
      });
    }, 60_000); // generous timeout for all the inserts

    // ── Assertion 1: BASELINE ─────────────────────────────────────────────────
    it("Assertion 1 — baseline: day1 has sceneA + person in cast; day2 does not", async () => {
      const day1Sheet = await getCallSheet(alice, day1Id);
      const day2Sheet = await getCallSheet(alice, day2Id);

      // Header: dayNumber 1 of 2, dayNumber 2 of 2
      expect(day1Sheet.header.dayNumber).toBe(1);
      expect(day1Sheet.header.dayCount).toBe(2);
      expect(day2Sheet.header.dayNumber).toBe(2);
      expect(day2Sheet.header.dayCount).toBe(2);

      // day1 scenes: contains sceneA (scene_number "1")
      const day1SceneNums = day1Sheet.scenes.map((s) => s.sceneNumber);
      expect(day1SceneNums).toContain("1"); // sceneA
      expect(day1SceneNums).not.toContain("2"); // sceneB not on day1

      // day2 scenes: contains sceneB only
      const day2SceneNums = day2Sheet.scenes.map((s) => s.sceneNumber);
      expect(day2SceneNums).toContain("2"); // sceneB
      expect(day2SceneNums).not.toContain("1"); // sceneA not on day2

      // day1 cast: person appears (sceneA is confirmed on day1 → DOOD W/SW)
      const day1CastPersonIds = day1Sheet.cast.map((c: CastCallRow) => c.personId);
      expect(day1CastPersonIds).toContain(personId);

      // day2 cast: person does NOT appear (sceneA is not on day2 yet)
      const day2CastPersonIds = day2Sheet.cast.map((c: CastCallRow) => c.personId);
      expect(day2CastPersonIds).not.toContain(personId);

      // day1 crew: Sam DP appears (crew_day_call placed them on day1)
      const cameraBlock = day1Sheet.crewByDepartment.find(
        (b: CrewDepartmentBlock) => b.department === crewDepartment,
      );
      expect(cameraBlock).toBeDefined();
      expect(cameraBlock!.members.find((m) => m.crewMemberId === crewMemberId)).toBeDefined();
    });

    // ── Assertion 2: HEADLINE — move the scene, both days update, NO sync step ─
    it("Assertion 2 — HEADLINE: move sceneA strip to day2; day1 loses sceneA+person, day2 gains both", async () => {
      // The scene move: update the strip's shoot_day_id from day1 → day2.
      // This is the production-graph mutation; there is NO sync step needed.
      const { error: moveErr } = await alice
        .from("strips")
        .update({ shoot_day_id: day2Id })
        .eq("id", sceneAStripId);
      expect(moveErr).toBeNull();

      // Re-read BOTH days immediately — derived-on-read, no cache to bust.
      const day1Sheet = await getCallSheet(alice, day1Id);
      const day2Sheet = await getCallSheet(alice, day2Id);

      // day1 after move: sceneA is GONE
      const day1SceneNums = day1Sheet.scenes.map((s) => s.sceneNumber);
      expect(day1SceneNums).not.toContain("1"); // sceneA removed

      // day1 after move: person is GONE from cast (no longer works day1)
      const day1CastPersonIds = day1Sheet.cast.map((c: CastCallRow) => c.personId);
      expect(day1CastPersonIds).not.toContain(personId);

      // day2 after move: sceneA is NOW THERE
      const day2SceneNums = day2Sheet.scenes.map((s) => s.sceneNumber);
      expect(day2SceneNums).toContain("1"); // sceneA moved to day2
      expect(day2SceneNums).toContain("2"); // sceneB still on day2

      // day2 after move: person is NOW IN CAST (sceneA is confirmed on day2)
      const day2CastPersonIds = day2Sheet.cast.map((c: CastCallRow) => c.personId);
      expect(day2CastPersonIds).toContain(personId);

      // THE PROOF: the call sheet follows the schedule with no sync step.
      // No `recomputeCallSheet()`, no webhook, no materialization — pure derivation.
    });

    // ── Assertion 3: reject cast tag → person drops from cast ─────────────────
    // State entering this test: sceneA is on day2. Person is in day2 cast.
    it("Assertion 3 — reject: setting scene_characters.status='rejected' removes person from cast", async () => {
      // Pre-check: person is on day2 (from assertion 2)
      const before = await getCallSheet(alice, day2Id);
      const beforePersonIds = before.cast.map((c: CastCallRow) => c.personId);
      expect(beforePersonIds).toContain(personId);

      // Reject the confirmed cast tag (sceneA's scene_characters row)
      const { error: rejectErr } = await alice
        .from("scene_characters")
        .update({ status: "rejected" })
        .eq("id", sceneACharacterId);
      expect(rejectErr).toBeNull();

      // Re-read day2 — derived-on-read, no sync step.
      const after = await getCallSheet(alice, day2Id);
      const afterPersonIds = after.cast.map((c: CastCallRow) => c.personId);

      // Person is GONE: DOOD no longer derives a working code for them on day2
      // because their only confirmed scene_characters tag is now rejected.
      expect(afterPersonIds).not.toContain(personId);
    });

    // ── Assertion 4: call-time cascade — dept > general > individual override ──
    // State entering this test: sceneA on day2, cast rejected.
    // The crew member is on day1 (crew_day_call with call_time=null).
    // day1 has generalCallTime="07:00" (set in beforeAll).
    it("Assertion 4 — cascade: crew call time resolves dept > general, then individual override wins", async () => {
      // Step A: no individual override, no dept call → resolves to general (07:00)
      const sheetA = await getCallSheet(alice, day1Id);
      const cameraBlockA = sheetA.crewByDepartment.find(
        (b: CrewDepartmentBlock) => b.department === crewDepartment,
      );
      expect(cameraBlockA).toBeDefined();
      const crewRowA = cameraBlockA!.members.find((m) => m.crewMemberId === crewMemberId);
      expect(crewRowA).toBeDefined();
      // call_time=null on the day_call, no dept call → falls through to general 07:00
      expect(crewRowA!.callTime).toBe("07:00");

      // Step B: set a department call (06:30) — should WIN over general (07:00)
      await setCrewDeptCall(alice, {
        shootDayId: day1Id,
        department: crewDepartment,
        callTime: "06:30",
      });

      const sheetB = await getCallSheet(alice, day1Id);
      const cameraBlockB = sheetB.crewByDepartment.find(
        (b: CrewDepartmentBlock) => b.department === crewDepartment,
      );
      expect(cameraBlockB).toBeDefined();
      const crewRowB = cameraBlockB!.members.find((m) => m.crewMemberId === crewMemberId);
      expect(crewRowB).toBeDefined();
      // Dept call (06:30) wins over general (07:00)
      expect(crewRowB!.callTime).toBe("06:30");

      // Step C: set an individual override (06:00) — should WIN over dept (06:30)
      await setCrewDayCall(alice, {
        shootDayId: day1Id,
        crewMemberId: crewMemberId,
        callTime: "06:00",
      });

      const sheetC = await getCallSheet(alice, day1Id);
      const cameraBlockC = sheetC.crewByDepartment.find(
        (b: CrewDepartmentBlock) => b.department === crewDepartment,
      );
      expect(cameraBlockC).toBeDefined();
      const crewRowC = cameraBlockC!.members.find((m) => m.crewMemberId === crewMemberId);
      expect(crewRowC).toBeDefined();
      // Individual override (06:00) wins over dept (06:30) wins over general (07:00)
      expect(crewRowC!.callTime).toBe("06:00");
    });
  },
);
