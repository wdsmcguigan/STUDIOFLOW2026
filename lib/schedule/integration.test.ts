// ⭐ THESIS integration test (Phase 3, Task 17).
//
// Proves the load-bearing claim of the platform: the schedule module DERIVES
// from the CONFIRMED breakdown with NO sync step (derived-on-read). Confirm a
// cast member on two scenes' breakdown, schedule those scenes on the SAME date
// but DIFFERENT units, and the schedule's conflicts + DOOD reflect it
// automatically. Reject one breakdown tag and the cross-unit conflict clears on
// the very next read — while the actor's remaining work day stays intact.
//
// This is the CROSS-UNIT variant (unit === null) that lib/schedule/data.test.ts
// Task 12 deliberately did NOT cover (its conflict was two strips on one unit).

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { createShootDay, createStrip, getOrCreateDefaultSegment, getConflicts, getDOOD } from "@/lib/schedule/data";
import {
  createCharacter,
  createPerson,
  setCharacterCast,
  tagSceneCharacter,
  setSceneCharacterStatus,
} from "@/lib/breakdown/data";

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
  const { data, error } = await client
    .from("projects")
    .insert({ title: "Thesis Prod", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "⭐ thesis: breakdown→schedule derivation (cross-unit)",
  () => {
    let alice: SupabaseClient<Database>;
    let project: string;

    // Seeded ids — every assertion is tied to these.
    let sceneAId: string;
    let sceneBId: string;
    let segAId: string;
    let segBId: string;
    let personAId: string;
    let charAId: string;
    let scBId: string; // the scene_characters row id for sceneB (the one we reject to clear)

    const DATE = "2026-09-01";

    beforeAll(async () => {
      alice = await makeUser(`alice-thesis-${globalThis.crypto.randomUUID()}@t.dev`);
      project = await newProject(alice);

      // --- 1. Script + two scenes (each 8 eighths, active) -----------------
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: project, title: "Thesis Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;

      const { data: sceneA, error: aErr } = await alice
        .from("scenes")
        .insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active", page_eighths: 8 })
        .select("id")
        .single();
      if (aErr) throw aErr;
      sceneAId = sceneA!.id;

      const { data: sceneB, error: bErr } = await alice
        .from("scenes")
        .insert({ project_id: project, script_id: script!.id, ordinal: 1, status: "active", page_eighths: 8 })
        .select("id")
        .single();
      if (bErr) throw bErr;
      sceneBId = sceneB!.id;

      // --- 2. Person + character, cast linked -------------------------------
      const personA = await createPerson(alice, { projectId: project, name: "Cross-Unit Lead" });
      personAId = personA.id;

      const charA = await createCharacter(alice, { projectId: project, primaryName: "PROTAGONIST" });
      charAId = charA.id;

      const linked = await setCharacterCast(alice, { characterId: charAId, personId: personAId });
      // sanity: the cast link is what the engine joins on
      expect(linked.cast_person_id).toBe(personAId);

      // --- 3. Confirm charA on BOTH scenes' breakdown -----------------------
      // sceneA: tag directly as confirmed.
      await tagSceneCharacter(alice, {
        projectId: project,
        sceneId: sceneAId,
        characterId: charAId,
        presenceType: "speaking",
        provenance: "manual",
        status: "confirmed",
      });
      // sceneB: tag (capture its row id) then it is confirmed — this is the tag
      // we will later REJECT to prove the conflict clears.
      const scB = await tagSceneCharacter(alice, {
        projectId: project,
        sceneId: sceneBId,
        characterId: charAId,
        presenceType: "speaking",
        provenance: "manual",
        status: "confirmed",
      });
      scBId = scB.id;

      // --- 4. Default segments for both scenes ------------------------------
      const segA = await getOrCreateDefaultSegment(alice, { projectId: project, sceneId: sceneAId });
      segAId = segA.id;
      const segB = await getOrCreateDefaultSegment(alice, { projectId: project, sceneId: sceneBId });
      segBId = segB.id;

      // --- 5. Two shoot days, SAME date, DIFFERENT units --------------------
      const dayMain = await createShootDay(alice, {
        projectId: project,
        ordinal: 0,
        date: DATE,
        unit: "main",
      });
      const daySecond = await createShootDay(alice, {
        projectId: project,
        ordinal: 1,
        date: DATE,
        unit: "second",
      });

      // sceneA strip on main unit; sceneB strip on second unit — same date.
      await createStrip(alice, {
        projectId: project,
        shootDayId: dayMain.id,
        type: "scene",
        sceneSegmentId: segAId,
        ordinal: 0,
      });
      await createStrip(alice, {
        projectId: project,
        shootDayId: daySecond.id,
        type: "scene",
        sceneSegmentId: segBId,
        ordinal: 0,
      });
    });

    it("getConflicts surfaces a CROSS-UNIT cast double-book (unit === null) from the confirmed breakdown", async () => {
      const conflicts = await getConflicts(alice, project);
      const castConflicts = conflicts.filter((c) => c.type === "cast");

      const personConflict = castConflicts.find((c) => c.resourceId === personAId);
      expect(personConflict).toBeDefined();
      expect(personConflict!.date).toBe(DATE);
      // Both scheduled segments require personA on the same date → double-book.
      expect(personConflict!.segmentIds).toContain(segAId);
      expect(personConflict!.segmentIds).toContain(segBId);
      expect(personConflict!.segmentIds).toHaveLength(2);
      // THE cross-unit assertion: the two strips live on different units
      // (main vs second) → unit cannot be a single value → null.
      expect(personConflict!.unit).toBeNull();
    });

    it("getDOOD shows personA working DATE — single work day coded SWF, source derived", async () => {
      const entries = await getDOOD(alice, project);
      const personEntries = entries.filter((e) => e.personId === personAId);
      const cell = personEntries.find((e) => e.date === DATE);
      expect(cell).toBeDefined();
      expect(cell!.source).toBe("derived");
      // Only one calendar date is scheduled for this actor → start+work+finish.
      expect(cell!.code).toBe("SWF");
    });

    it("rejecting sceneB's breakdown tag CLEARS the cross-unit conflict on the next read (no sync step)", async () => {
      // RESOLVE via the breakdown, not the board — this is the cleanest proof of
      // the derived-from-confirmed-breakdown thesis: flip sceneB's scene_character
      // to 'rejected'. The strip on the second unit stays put; it simply no longer
      // requires personA because only sceneA still confirms PROTAGONIST.
      const rejected = await setSceneCharacterStatus(alice, { id: scBId, status: "rejected" });
      expect(rejected.status).toBe("rejected");

      const conflicts = await getConflicts(alice, project);
      const personCast = conflicts.filter((c) => c.type === "cast" && c.resourceId === personAId);
      // Only one scheduled segment now needs personA → no double-book.
      expect(personCast).toHaveLength(0);

      // ...but the actor still has a work day on DATE (still confirmed on sceneA).
      const entries = await getDOOD(alice, project);
      const cell = entries.find((e) => e.personId === personAId && e.date === DATE);
      expect(cell).toBeDefined();
      expect(cell!.source).toBe("derived");
      expect(cell!.code).toBe("SWF");
    });
  },
);
