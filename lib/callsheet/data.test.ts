import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { CastCallRow, CrewDepartmentBlock } from "@/lib/callsheet/schema";
import {
  createCrewMember,
  listCrewMembers,
  updateCrewMember,
  deleteCrewMember,
  getOrCreateCallSheet,
  upsertCallSheetHeader,
  bumpRevision,
  setCrewDeptCall,
  listCrewDeptCalls,
  setCrewDayCall,
  listCrewDayCalls,
  removeCrewDayCall,
  setCastDayCall,
  listCastDayCalls,
  loadCallSheetInputs,
  getCallSheet,
} from "@/lib/callsheet/data";

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
    .insert({ title: "Test Prod", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "crew roster RLS (0017)",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string, bobProject: string;
    let alicePersonId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      bobProject = await newProject(bob);

      // Alice creates a person in her own project
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({ project_id: aliceProject, name: "Alice Contact" })
        .select("id")
        .single();
      if (personErr) throw personErr;
      alicePersonId = person.id;
    });

    it("Alice can insert a crew_member and see it", async () => {
      const { data, error } = await alice
        .from("crew_members")
        .insert({ project_id: aliceProject, name: "Grip 1", department: "Grip" })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
    });

    it("Bob sees 0 crew_members from Alice's project", async () => {
      const { data, error } = await bob
        .from("crew_members")
        .select("id")
        .eq("project_id", aliceProject);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("two-FK escape: Bob cannot insert crew_member in his project with Alice's person_id", async () => {
      const { error } = await bob
        .from("crew_members")
        .insert({
          project_id: bobProject,
          name: "Escaped Grip",
          department: "Grip",
          person_id: alicePersonId, // Alice's person — Bob does not own this
        });
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501");
    });
  }
);

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "call sheet tables RLS (0018)",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string, bobProject: string;
    let aliceShootDayId: string, bobShootDayId: string;
    let aliceCrewMemberId: string, alicePersonId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-cs-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-cs-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      bobProject = await newProject(bob);

      // Alice creates a shoot day
      const { data: aliceDay, error: aliceDayErr } = await alice
        .from("shoot_days")
        .insert({ project_id: aliceProject, ordinal: 0, date: "2026-09-01", day_type: "shoot", unit: "main" })
        .select("id")
        .single();
      if (aliceDayErr) throw aliceDayErr;
      aliceShootDayId = aliceDay.id;

      // Bob creates his own shoot day
      const { data: bobDay, error: bobDayErr } = await bob
        .from("shoot_days")
        .insert({ project_id: bobProject, ordinal: 0, date: "2026-09-01", day_type: "shoot", unit: "main" })
        .select("id")
        .single();
      if (bobDayErr) throw bobDayErr;
      bobShootDayId = bobDay.id;

      // Alice creates a crew_member in her project
      const { data: crewMember, error: crewErr } = await alice
        .from("crew_members")
        .insert({ project_id: aliceProject, name: "Alice DP", department: "Camera" })
        .select("id")
        .single();
      if (crewErr) throw crewErr;
      aliceCrewMemberId = crewMember.id;

      // Alice creates a person in her project
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({ project_id: aliceProject, name: "Alice Actor" })
        .select("id")
        .single();
      if (personErr) throw personErr;
      alicePersonId = person.id;
    });

    it("happy path: Alice creates a call_sheets row for her shoot day — succeeds", async () => {
      const { data, error } = await alice
        .from("call_sheets")
        .insert({ shoot_day_id: aliceShootDayId, general_call_time: "07:00" })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
    });

    it("isolation: Bob cannot select Alice's call_sheets row (0 rows)", async () => {
      const { data, error } = await bob
        .from("call_sheets")
        .select("id")
        .eq("shoot_day_id", aliceShootDayId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("two-FK escape (crew_day_calls): Bob inserts with his shoot_day but Alice's crew_member_id → 42501", async () => {
      const { error } = await bob
        .from("crew_day_calls")
        .insert({
          shoot_day_id: bobShootDayId,       // Bob's own shoot day
          crew_member_id: aliceCrewMemberId,  // Alice's crew member — Bob does not own this
          call_time: "07:30",
        });
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501");
    });

    it("two-FK escape (cast_day_calls): Bob inserts with his shoot_day but Alice's person_id → 42501", async () => {
      const { error } = await bob
        .from("cast_day_calls")
        .insert({
          shoot_day_id: bobShootDayId,  // Bob's own shoot day
          person_id: alicePersonId,      // Alice's person — Bob does not own this
          call_time: "08:00",
        });
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501");
    });
  }
);

// ---------------------------------------------------------------------------
// Task 5: call sheet data layer
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "call sheet data layer (Task 5)",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;
    let aliceShootDayId: string;
    let alicePersonId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-t5-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);

      // Seed a shoot_days row (required columns from schedule data tests)
      const { data: day, error: dayErr } = await alice
        .from("shoot_days")
        .insert({
          project_id: aliceProject,
          ordinal: 0,
          date: "2026-10-01",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (dayErr) throw dayErr;
      aliceShootDayId = day.id;

      // Seed a person for cast_day_calls tests
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({ project_id: aliceProject, name: "Test Actor" })
        .select("id")
        .single();
      if (personErr) throw personErr;
      alicePersonId = person.id;
    });

    // ------------------------------------------------------------------
    // Crew members
    // ------------------------------------------------------------------

    it("createCrewMember + listCrewMembers round-trip (ordered by ordinal then name)", async () => {
      const cm1 = await createCrewMember(alice, {
        projectId: aliceProject,
        name: "Zebra Gaffer",
        department: "Electric",
        position: "Gaffer",
        ordinal: 1,
      });
      const cm2 = await createCrewMember(alice, {
        projectId: aliceProject,
        name: "Alpha Key Grip",
        department: "Grip",
        position: "Key Grip",
        ordinal: 0,
      });

      expect(cm1.id).toBeDefined();
      expect(cm2.id).toBeDefined();

      const list = await listCrewMembers(alice, aliceProject);
      // ordinal 0 should come first
      const names = list.map((m) => m.name);
      expect(names.indexOf("Alpha Key Grip")).toBeLessThan(names.indexOf("Zebra Gaffer"));
    });

    it("updateCrewMember patches fields", async () => {
      const cm = await createCrewMember(alice, {
        projectId: aliceProject,
        name: "Original Name",
        department: "Sound",
        position: "Boom Op",
        ordinal: 99,
      });
      const updated = await updateCrewMember(alice, { id: cm.id, name: "Updated Name", position: "Sound Mixer" });
      expect(updated.name).toBe("Updated Name");
      expect(updated.position).toBe("Sound Mixer");
      expect(updated.department).toBe("Sound"); // unchanged
    });

    it("deleteCrewMember removes the row", async () => {
      const cm = await createCrewMember(alice, {
        projectId: aliceProject,
        name: "To Delete",
        department: "Art",
        position: "PA",
        ordinal: 50,
      });
      await deleteCrewMember(alice, cm.id);
      const list = await listCrewMembers(alice, aliceProject);
      expect(list.find((m) => m.id === cm.id)).toBeUndefined();
    });

    // ------------------------------------------------------------------
    // getOrCreateCallSheet — idempotency
    // ------------------------------------------------------------------

    it("getOrCreateCallSheet twice ⇒ SAME id (idempotent)", async () => {
      const first = await getOrCreateCallSheet(alice, aliceShootDayId);
      const second = await getOrCreateCallSheet(alice, aliceShootDayId);
      expect(first.id).toBe(second.id);
      expect(first.shoot_day_id).toBe(aliceShootDayId);
    });

    it("concurrency: 3 concurrent getOrCreateCallSheet calls ⇒ all same id, exactly 1 DB row", async () => {
      // Use a fresh shoot day to avoid interference with the idempotency test above
      const { data: freshDay, error: freshErr } = await alice
        .from("shoot_days")
        .insert({
          project_id: aliceProject,
          ordinal: 1,
          date: "2026-10-02",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (freshErr) throw freshErr;
      const freshDayId = freshDay.id;

      const [r1, r2, r3] = await Promise.all([
        getOrCreateCallSheet(alice, freshDayId),
        getOrCreateCallSheet(alice, freshDayId),
        getOrCreateCallSheet(alice, freshDayId),
      ]);

      // All three must return the same row id
      expect(r1.id).toBe(r2.id);
      expect(r2.id).toBe(r3.id);

      // Verify exactly ONE call_sheets row exists for the day
      const { data: rows, error: rowsErr } = await alice
        .from("call_sheets")
        .select("id")
        .eq("shoot_day_id", freshDayId);
      if (rowsErr) throw rowsErr;
      expect(rows).toHaveLength(1);
    });

    // ------------------------------------------------------------------
    // upsertCallSheetHeader
    // ------------------------------------------------------------------

    it("upsertCallSheetHeader sets header fields; re-read shows them", async () => {
      const updated = await upsertCallSheetHeader(alice, {
        shootDayId: aliceShootDayId,
        generalCallTime: "07:00",
        weatherNote: "Sunny, 72°F",
        hospitalName: "County General",
        hospitalAddress: "123 Main St",
        notes: "Safety meeting at 06:45",
      });
      expect(updated.general_call_time).toBe("07:00");
      expect(updated.weather_note).toBe("Sunny, 72°F");
      expect(updated.hospital_name).toBe("County General");
      expect(updated.hospital_address).toBe("123 Main St");
      expect(updated.notes).toBe("Safety meeting at 06:45");

      // Re-fetch via getOrCreateCallSheet to confirm persistence
      const row = await getOrCreateCallSheet(alice, aliceShootDayId);
      expect(row.general_call_time).toBe("07:00");
      expect(row.hospital_name).toBe("County General");
    });

    // ------------------------------------------------------------------
    // bumpRevision
    // ------------------------------------------------------------------

    it("bumpRevision increments revision (starts at 1, becomes 2)", async () => {
      // ensure call sheet exists and note current revision
      const before = await getOrCreateCallSheet(alice, aliceShootDayId);
      const startRevision = before.revision;

      const after = await bumpRevision(alice, aliceShootDayId);
      expect(after.revision).toBe(startRevision + 1);
    });

    // ------------------------------------------------------------------
    // setCrewDeptCall / listCrewDeptCalls
    // ------------------------------------------------------------------

    it("setCrewDeptCall upsert — same dept twice ⇒ one row, updated time; listCrewDeptCalls returns it", async () => {
      await setCrewDeptCall(alice, {
        shootDayId: aliceShootDayId,
        department: "Camera",
        callTime: "07:00",
      });
      const second = await setCrewDeptCall(alice, {
        shootDayId: aliceShootDayId,
        department: "Camera",
        callTime: "07:30",
      });
      expect(second.call_time).toBe("07:30");

      const list = await listCrewDeptCalls(alice, aliceShootDayId);
      const cameraCalls = list.filter((c) => c.department === "Camera");
      expect(cameraCalls).toHaveLength(1);
      expect(cameraCalls[0].call_time).toBe("07:30");
    });

    // ------------------------------------------------------------------
    // setCrewDayCall / listCrewDayCalls / removeCrewDayCall
    // ------------------------------------------------------------------

    it("setCrewDayCall + listCrewDayCalls; removeCrewDayCall removes it", async () => {
      // Need a crew member in Alice's project
      const cm = await createCrewMember(alice, {
        projectId: aliceProject,
        name: "Day Call Test Grip",
        department: "Grip",
        position: "Grip",
        ordinal: 200,
      });

      // Set day call
      const dayCall = await setCrewDayCall(alice, {
        shootDayId: aliceShootDayId,
        crewMemberId: cm.id,
        callTime: "08:00",
      });
      expect(dayCall.call_time).toBe("08:00");

      // Upsert (same crew member, updated time)
      const updated = await setCrewDayCall(alice, {
        shootDayId: aliceShootDayId,
        crewMemberId: cm.id,
        callTime: "08:15",
      });
      expect(updated.call_time).toBe("08:15");

      // List
      const list = await listCrewDayCalls(alice, aliceShootDayId);
      const found = list.find((r) => r.crew_member_id === cm.id);
      expect(found).toBeDefined();
      expect(found!.call_time).toBe("08:15");

      // Remove
      await removeCrewDayCall(alice, {
        shootDayId: aliceShootDayId,
        crewMemberId: cm.id,
      });
      const afterRemove = await listCrewDayCalls(alice, aliceShootDayId);
      expect(afterRemove.find((r) => r.crew_member_id === cm.id)).toBeUndefined();
    });

    // ------------------------------------------------------------------
    // setCastDayCall / listCastDayCalls
    // ------------------------------------------------------------------

    it("setCastDayCall upsert + listCastDayCalls", async () => {
      // First insert
      const first = await setCastDayCall(alice, {
        shootDayId: aliceShootDayId,
        personId: alicePersonId,
        callTime: "09:00",
        makeupTime: "08:30",
        wardrobeTime: "08:45",
        onSetTime: "09:00",
        notes: "Principal cast",
      });
      expect(first.call_time).toBe("09:00");
      expect(first.makeup_time).toBe("08:30");

      // Upsert (same person, updated call time)
      const second = await setCastDayCall(alice, {
        shootDayId: aliceShootDayId,
        personId: alicePersonId,
        callTime: "09:30",
      });
      expect(second.call_time).toBe("09:30");
      // makeup_time should be preserved from first upsert (upsert merges)
      // OR may be overwritten to null depending on implementation — we accept either
      // (spec: upsert with onConflict, caller provides full update set)

      // List
      const list = await listCastDayCalls(alice, aliceShootDayId);
      const personRow = list.find((r) => r.person_id === alicePersonId);
      expect(personRow).toBeDefined();
      expect(personRow!.call_time).toBe("09:30");

      // Exactly one row for this person+day
      const personRows = list.filter((r) => r.person_id === alicePersonId);
      expect(personRows).toHaveLength(1);
    });
  }
);

// ---------------------------------------------------------------------------
// Task 6: loadCallSheetInputs — graph-slice loader
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "loadCallSheetInputs (Task 6)",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string, bobProject: string;
    let aliceShootDayId: string;
    let alicePersonId: string;
    let aliceCharacterId: string;
    let aliceCrewMemberId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-t6-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-t6-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      bobProject = await newProject(bob);

      // --- Seed Alice's project ---

      // 1. Location with geo coords (for location resolution)
      const { data: loc, error: locErr } = await alice
        .from("locations")
        .insert({
          project_id: aliceProject,
          name: "Stage 5",
          address: "123 Studio Blvd",
          geo_lat: 34.0522,
          geo_lng: -118.2437,
          timezone: "America/Los_Angeles",
        })
        .select("id")
        .single();
      if (locErr) throw locErr;
      const aliceLocationId = loc.id;

      // 2. Set → location
      const { data: setRow, error: setErr } = await alice
        .from("sets")
        .insert({ project_id: aliceProject, name: "INT. OFFICE", location_id: aliceLocationId })
        .select("id")
        .single();
      if (setErr) throw setErr;
      const aliceSetId = setRow.id;

      // 3. Script (required FK for scenes)
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: aliceProject, title: "Test Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;
      const aliceScriptId = script.id;

      // 4. Scene with display fields
      const { data: scene, error: sceneErr } = await alice
        .from("scenes")
        .insert({
          project_id: aliceProject,
          script_id: aliceScriptId,
          scene_number: "42",
          int_ext: "INT",
          time_of_day: "DAY",
          location_slug: "OFFICE",
          set_id: aliceSetId,
          page_eighths: 8,
          synopsis: "The heist begins.",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;
      const aliceSceneId = scene.id;

      // 5. Person (cast actor) with contact info
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({
          project_id: aliceProject,
          name: "Jane Actor",
          contact_email: "jane@example.com",
          contact_phone: "555-1234",
        })
        .select("id")
        .single();
      if (personErr) throw personErr;
      alicePersonId = person.id;

      // 6. Character linked to cast person
      const { data: character, error: charErr } = await alice
        .from("characters")
        .insert({
          project_id: aliceProject,
          primary_name: "DETECTIVE MORGAN",
          cast_person_id: alicePersonId,
        })
        .select("id")
        .single();
      if (charErr) throw charErr;
      aliceCharacterId = character.id;

      // 7. scene_characters (confirmed tag — the breakdown gate)
      const { error: scTagErr } = await alice
        .from("scene_characters")
        .insert({
          scene_id: aliceSceneId,
          character_id: aliceCharacterId,
          status: "confirmed",
          presence_type: "speaking",
          provenance: "manual",
        });
      if (scTagErr) throw scTagErr;

      // 8. Shoot day (dated, so DOOD can fire and orderedDatedDayIds includes it)
      const { data: day, error: dayErr } = await alice
        .from("shoot_days")
        .insert({
          project_id: aliceProject,
          ordinal: 0,
          date: "2026-11-01",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (dayErr) throw dayErr;
      aliceShootDayId = day.id;

      // 9. Scene segment (required for strips)
      const { data: seg, error: segErr } = await alice
        .from("scene_segments")
        .insert({ project_id: aliceProject, scene_id: aliceSceneId, ordinal: 0, page_eighths: 8 })
        .select("id")
        .single();
      if (segErr) throw segErr;
      const aliceSegmentId = seg.id;

      // 10. Strip placing the scene segment on the shoot day
      const { error: stripErr } = await alice
        .from("strips")
        .insert({
          project_id: aliceProject,
          shoot_day_id: aliceShootDayId,
          type: "scene",
          scene_segment_id: aliceSegmentId,
          ordinal: 0,
        });
      if (stripErr) throw stripErr;

      // 11. Crew member
      const { data: crew, error: crewErr } = await alice
        .from("crew_members")
        .insert({
          project_id: aliceProject,
          name: "Bob Gaffer",
          department: "Electric",
          position: "Gaffer",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (crewErr) throw crewErr;
      aliceCrewMemberId = crew.id;

      // 12. crew_day_call (individual call override for the crew member)
      const { error: cdcErr } = await alice
        .from("crew_day_calls")
        .insert({
          shoot_day_id: aliceShootDayId,
          crew_member_id: aliceCrewMemberId,
          call_time: "07:00",
        });
      if (cdcErr) throw cdcErr;

      // --- Seed Bob's project (project-scoping isolation) ---
      const { data: bobScript, error: bobScriptErr } = await bob
        .from("scripts")
        .insert({ project_id: bobProject, title: "Bob Script" })
        .select("id")
        .single();
      if (bobScriptErr) throw bobScriptErr;
      const { data: bobScene, error: bobSceneErr } = await bob
        .from("scenes")
        .insert({
          project_id: bobProject,
          script_id: bobScript.id,
          scene_number: "1",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (bobSceneErr) throw bobSceneErr;
      const { data: bobDay, error: bobDayErr } = await bob
        .from("shoot_days")
        .insert({
          project_id: bobProject,
          ordinal: 0,
          date: "2026-11-01",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (bobDayErr) throw bobDayErr;
      const { data: bobSeg, error: bobSegErr } = await bob
        .from("scene_segments")
        .insert({ project_id: bobProject, scene_id: bobScene.id, ordinal: 0, page_eighths: 4 })
        .select("id")
        .single();
      if (bobSegErr) throw bobSegErr;
      const { error: bobStripErr } = await bob
        .from("strips")
        .insert({
          project_id: bobProject,
          shoot_day_id: bobDay.id,
          type: "scene",
          scene_segment_id: bobSeg.id,
          ordinal: 0,
        });
      if (bobStripErr) throw bobStripErr;
    });

    it("returns the scene in scenes[] with display fields", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      expect(inputs.scenes).toHaveLength(1);
      const s = inputs.scenes[0];
      expect(s.sceneNumber).toBe("42");
      expect(s.intExt).toBe("INT");
      expect(s.timeOfDay).toBe("DAY");
      expect(s.pageEighths).toBe(8);
      expect(s.synopsis).toBe("The heist begins.");
    });

    it("returns the cast person in castPeople with characterName and contact", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      // Cast person must appear — they have a working DOOD code on this date
      const castMember = inputs.castPeople.find((p) => p.personId === alicePersonId);
      expect(castMember).toBeDefined();
      expect(castMember!.characterName).toBe("DETECTIVE MORGAN");
      expect(castMember!.contactEmail).toBe("jane@example.com");
      expect(castMember!.contactPhone).toBe("555-1234");
    });

    it("returns the crew member in crewMembers", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      const found = inputs.crewMembers.find((m) => m.id === aliceCrewMemberId);
      expect(found).toBeDefined();
      expect(found!.name).toBe("Bob Gaffer");
    });

    it("returns the crew_day_call in crewDayCalls", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      const found = inputs.crewDayCalls.find((c) => c.crew_member_id === aliceCrewMemberId);
      expect(found).toBeDefined();
      expect(found!.call_time).toBe("07:00");
    });

    it("returns the call sheet header row", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      expect(inputs.callSheet).toBeDefined();
      expect(inputs.callSheet.shoot_day_id).toBe(aliceShootDayId);
    });

    it("orderedDatedDayIds contains the shoot day id", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      expect(inputs.orderedDatedDayIds).toContain(aliceShootDayId);
    });

    it("location is resolved with geo coords", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      expect(inputs.location).not.toBeNull();
      expect(inputs.location!.geo_lat).toBeCloseTo(34.0522, 3);
      expect(inputs.location!.geo_lng).toBeCloseTo(-118.2437, 3);
    });

    it("cast gate: only working-coded cast appears (person on this day via DOOD is present)", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      // Our test person has a confirmed scene on this shoot day, so DOOD derives
      // a working code (S, SW, W, WF, etc.) for them — they must appear.
      const castPersonIds = inputs.castPeople.map((p) => p.personId);
      expect(castPersonIds).toContain(alicePersonId);
    });

    it("project-scoping: Bob's data does not leak into Alice's slice", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      // All scene IDs in the result must belong to Alice's project — not Bob's.
      // We verify by checking that there is exactly 1 scene (Alice's) and not 2.
      expect(inputs.scenes).toHaveLength(1);
      // crewMembers must contain only Alice's crew, not Bob's project crew
      // (Bob has no crew members — but scene count is the reliable isolation probe)
      expect(inputs.crewMembers.every((m) => m.project_id === aliceProject)).toBe(true);
    });

    it("shootDay row has expected fields (date, day_type, project_id)", async () => {
      const inputs = await loadCallSheetInputs(alice, aliceShootDayId);
      expect(inputs.shootDay.id).toBe(aliceShootDayId);
      expect(inputs.shootDay.date).toBe("2026-11-01");
      expect(inputs.shootDay.day_type).toBe("shoot");
      expect(inputs.shootDay.project_id).toBe(aliceProject);
    });
  }
);

// ---------------------------------------------------------------------------
// Task 10: getCallSheet engine wiring (derived-on-read)
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "getCallSheet engine wiring (Task 10)",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;
    let aliceShootDayId: string;
    let alicePersonId: string;
    let aliceCrewMemberId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-t10-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);

      // --- Seed a minimal but complete call-sheet graph ---

      // 1. Script (required FK for scenes)
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: aliceProject, title: "T10 Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;

      // 2. Scene with display fields
      const { data: scene, error: sceneErr } = await alice
        .from("scenes")
        .insert({
          project_id: aliceProject,
          script_id: script.id,
          scene_number: "7",
          int_ext: "EXT",
          time_of_day: "NIGHT",
          location_slug: "ROOFTOP",
          page_eighths: 4,
          synopsis: "The confrontation.",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;

      // 3. Person (cast actor) confirmed to the scene
      const { data: person, error: personErr } = await alice
        .from("people")
        .insert({
          project_id: aliceProject,
          name: "Maria Lead",
          contact_email: "maria@studio.dev",
          contact_phone: "555-9876",
        })
        .select("id")
        .single();
      if (personErr) throw personErr;
      alicePersonId = person.id;

      // 4. Character linked to the cast person
      const { data: character, error: charErr } = await alice
        .from("characters")
        .insert({
          project_id: aliceProject,
          primary_name: "COMMANDER REY",
          cast_person_id: alicePersonId,
        })
        .select("id")
        .single();
      if (charErr) throw charErr;

      // 5. scene_characters (confirmed) — gates DOOD derivation
      const { error: scTagErr } = await alice
        .from("scene_characters")
        .insert({
          scene_id: scene.id,
          character_id: character.id,
          status: "confirmed",
          presence_type: "speaking",
          provenance: "manual",
        });
      if (scTagErr) throw scTagErr;

      // 6. Shoot day (dated — so orderedDatedDayIds includes it and DOOD fires)
      const { data: day, error: dayErr } = await alice
        .from("shoot_days")
        .insert({
          project_id: aliceProject,
          ordinal: 0,
          date: "2026-12-01",
          day_type: "shoot",
          unit: "main",
        })
        .select("id")
        .single();
      if (dayErr) throw dayErr;
      aliceShootDayId = day.id;

      // 7. Scene segment + strip placing scene on the shoot day
      const { data: seg, error: segErr } = await alice
        .from("scene_segments")
        .insert({ project_id: aliceProject, scene_id: scene.id, ordinal: 0, page_eighths: 4 })
        .select("id")
        .single();
      if (segErr) throw segErr;

      const { error: stripErr } = await alice
        .from("strips")
        .insert({
          project_id: aliceProject,
          shoot_day_id: aliceShootDayId,
          type: "scene",
          scene_segment_id: seg.id,
          ordinal: 0,
        });
      if (stripErr) throw stripErr;

      // 8. Crew member in a named department
      const { data: crew, error: crewErr } = await alice
        .from("crew_members")
        .insert({
          project_id: aliceProject,
          name: "Sam Boom",
          department: "Sound",
          position: "Boom Op",
          ordinal: 0,
        })
        .select("id")
        .single();
      if (crewErr) throw crewErr;
      aliceCrewMemberId = crew.id;

      // 9. crew_day_call — individual call-time override for the crew member
      const { error: cdcErr } = await alice
        .from("crew_day_calls")
        .insert({
          shoot_day_id: aliceShootDayId,
          crew_member_id: aliceCrewMemberId,
          call_time: "06:30",
        });
      if (cdcErr) throw cdcErr;

      // 10. Set the call sheet general_call_time via upsertCallSheetHeader
      await upsertCallSheetHeader(alice, {
        shootDayId: aliceShootDayId,
        generalCallTime: "07:00",
        weatherNote: "Clear skies",
      });
    });

    it("returns an AssembledCallSheet with correct header dayNumber and dayCount", async () => {
      const result = await getCallSheet(alice, aliceShootDayId);
      // 1 dated shoot day in this project → dayNumber=1, dayCount=1
      expect(result.header.dayNumber).toBe(1);
      expect(result.header.dayCount).toBe(1);
    });

    it("header.generalCallTime matches what was set via upsertCallSheetHeader", async () => {
      const result = await getCallSheet(alice, aliceShootDayId);
      expect(result.header.generalCallTime).toBe("07:00");
    });

    it("scenes contains the shoot day's scene with correct display fields", async () => {
      const result = await getCallSheet(alice, aliceShootDayId);
      expect(result.scenes).toHaveLength(1);
      const s = result.scenes[0];
      expect(s.sceneNumber).toBe("7");
      expect(s.intExt).toBe("EXT");
      expect(s.timeOfDay).toBe("NIGHT");
      expect(s.pageEighths).toBe(4);
    });

    it("cast contains the confirmed cast person with characterName", async () => {
      const result = await getCallSheet(alice, aliceShootDayId);
      const castRow = result.cast.find((c: CastCallRow) => c.personId === alicePersonId);
      expect(castRow).toBeDefined();
      expect(castRow!.name).toBe("Maria Lead");
      expect(castRow!.characterName).toBe("COMMANDER REY");
    });

    it("crewByDepartment contains the crew member in their department with resolved call time", async () => {
      const result = await getCallSheet(alice, aliceShootDayId);
      const soundBlock = result.crewByDepartment.find((b: CrewDepartmentBlock) => b.department === "Sound");
      expect(soundBlock).toBeDefined();
      const crewRow = soundBlock!.members.find((m) => m.crewMemberId === aliceCrewMemberId);
      expect(crewRow).toBeDefined();
      expect(crewRow!.name).toBe("Sam Boom");
      // Individual call time override (06:30) should win over general call time (07:00)
      expect(crewRow!.callTime).toBe("06:30");
    });
  }
);
