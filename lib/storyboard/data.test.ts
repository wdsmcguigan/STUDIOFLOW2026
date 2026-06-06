import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  getVisualSettings,
  getOrCreateVisualSettings,
  updateVisualSettings,
  createVisualReference,
  listVisualReferences,
  lockReference,
  setReferenceStatus,
  getLockedReferences,
  createShot,
  listShots,
  updateShot,
  reorderShots,
  setShotStatus,
  deleteShot,
  createShotFrame,
  listShotFrames,
  selectFrame,
  setFrameStatus,
  deleteShotFrame,
  recordImageGeneration,
  getGenerationTotals,
  loadRenderInputs,
  getSceneBoard,
} from "@/lib/storyboard/data";

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
  "storyboard refs RLS (0019)",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string, bobProject: string;
    let aliceCharacterId: string, aliceLocationId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      bobProject = await newProject(bob);

      // Alice creates a character in her project
      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "HERO" })
        .select("id")
        .single();
      if (charErr) throw charErr;
      aliceCharacterId = char.id;

      // Alice creates a location in her project
      const { data: loc, error: locErr } = await alice
        .from("locations")
        .insert({ project_id: aliceProject, name: "Stage 1" })
        .select("id")
        .single();
      if (locErr) throw locErr;
      aliceLocationId = loc.id;
    });

    it("Alice can insert and select her own project_visual_settings", async () => {
      const { data, error } = await alice
        .from("project_visual_settings")
        .insert({ project_id: aliceProject })
        .select("id, style_preset, aspect_ratio")
        .single();
      expect(error).toBeNull();
      expect(data!.style_preset).toBe("storyboard_sketch");
      expect(data!.aspect_ratio).toBe("16:9");

      const { data: rows } = await alice
        .from("project_visual_settings")
        .select("id")
        .eq("project_id", aliceProject);
      expect(rows ?? []).toHaveLength(1);
    });

    it("Alice can insert and select a visual_reference for her character", async () => {
      const { data, error } = await alice
        .from("visual_references")
        .insert({
          project_id: aliceProject,
          subject_type: "character",
          character_id: aliceCharacterId,
          is_primary: true,
          source: "ai",
          status: "suggested",
        })
        .select("id, status")
        .single();
      expect(error).toBeNull();
      expect(data!.status).toBe("suggested");

      const { data: rows } = await alice
        .from("visual_references")
        .select("id")
        .eq("character_id", aliceCharacterId);
      expect((rows ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("Bob cannot see Alice's project_visual_settings (RLS blocks cross-project select)", async () => {
      const { data: rows } = await bob
        .from("project_visual_settings")
        .select("*")
        .eq("project_id", aliceProject);
      expect(rows ?? []).toHaveLength(0);
    });

    it("Bob cannot see Alice's visual_references (RLS blocks cross-project select)", async () => {
      const { data: rows } = await bob
        .from("visual_references")
        .select("*")
        .eq("project_id", aliceProject);
      expect(rows ?? []).toHaveLength(0);
    });

    it("two-FK escape: Bob cannot insert a visual_reference using Alice's character_id", async () => {
      const { data, error } = await bob
        .from("visual_references")
        .insert({
          project_id: bobProject,
          subject_type: "character",
          character_id: aliceCharacterId, // Alice's character — cross-project escape attempt
          is_primary: false,
          source: "upload",
          status: "suggested",
        })
        .select("id")
        .single();
      // RLS with-check must reject this
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501"); // RLS with-check denial, not a FK violation
      expect(data).toBeNull();
    });

    it("two-FK escape: Bob cannot insert a visual_reference using Alice's location_id", async () => {
      const { data, error } = await bob
        .from("visual_references")
        .insert({
          project_id: bobProject,
          subject_type: "location",
          location_id: aliceLocationId, // Alice's location — cross-project escape attempt
          is_primary: false,
          source: "upload",
          status: "suggested",
        })
        .select("id")
        .single();
      // RLS with-check via location_owned_by must reject this
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501"); // RLS with-check denial, not a FK violation
      expect(data).toBeNull();
    });

    it("partial-unique: two is_primary=true rows for the same character are rejected", async () => {
      // Create a fresh character so this test does not depend on rows from earlier tests.
      const { data: freshChar, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "FRESH_CHAR" })
        .select("id")
        .single();
      if (charErr) throw charErr;
      const freshCharId = freshChar.id;

      // First is_primary=true row — must succeed.
      const { error: firstErr } = await alice
        .from("visual_references")
        .insert({
          project_id: aliceProject,
          subject_type: "character",
          character_id: freshCharId,
          is_primary: true,
          source: "ai",
          status: "suggested",
        })
        .select("id")
        .single();
      expect(firstErr).toBeNull();

      // Second is_primary=true for the same character — must be rejected by unique index.
      const { error } = await alice
        .from("visual_references")
        .insert({
          project_id: aliceProject,
          subject_type: "character",
          character_id: freshCharId,
          is_primary: true,
          source: "upload",
          status: "suggested",
        })
        .select("id")
        .single();
      expect(error).not.toBeNull();
      // Postgres unique-constraint violation
      expect(error!.code).toBe("23505");
    });
  }
);

// ============================================================================
// shots/frames RLS tests (0020)
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "shots/frames RLS (0020)",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string, bobProject: string;
    let aliceSceneId: string, aliceShotId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-sf-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-sf-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      bobProject = await newProject(bob);

      // Alice needs a script to create a scene.
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: aliceProject, title: "Pilot" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;

      // Alice creates a scene (project_id + script_id + ordinal are all that's required).
      const { data: scene, error: sceneErr } = await alice
        .from("scenes")
        .insert({ project_id: aliceProject, script_id: script.id, ordinal: 1 })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;
      aliceSceneId = scene.id;

      // Alice creates a shot for her scene.
      const { data: shot, error: shotErr } = await alice
        .from("shots")
        .insert({
          project_id: aliceProject,
          scene_id: aliceSceneId,
          ordinal: 1,
          status: "suggested",
          provenance: "ai",
        })
        .select("id")
        .single();
      if (shotErr) throw shotErr;
      aliceShotId = shot.id;
    });

    it("Alice can insert a frame for her shot and select it back", async () => {
      const { data, error } = await alice
        .from("shot_frames")
        .insert({
          project_id: aliceProject,
          shot_id: aliceShotId,
          image_path: "storyboards/test/frame1.jpg",
          source: "ai",
          status: "suggested",
          ordinal: 0,
        })
        .select("id, status")
        .single();
      expect(error).toBeNull();
      expect(data!.status).toBe("suggested");

      // Confirm it's selectable.
      const { data: rows } = await alice
        .from("shot_frames")
        .select("id")
        .eq("shot_id", aliceShotId);
      expect((rows ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("Bob sees 0 of Alice's shots", async () => {
      const { data: rows } = await bob
        .from("shots")
        .select("*")
        .eq("project_id", aliceProject);
      expect(rows ?? []).toHaveLength(0);
    });

    it("Bob sees 0 of Alice's shot_frames", async () => {
      const { data: rows } = await bob
        .from("shot_frames")
        .select("*")
        .eq("project_id", aliceProject);
      expect(rows ?? []).toHaveLength(0);
    });

    it("two-FK escape: Bob cannot insert a shot with bobProject + Alice's scene_id", async () => {
      const { data, error } = await bob
        .from("shots")
        .insert({
          project_id: bobProject,
          scene_id: aliceSceneId, // cross-project escape
          ordinal: 1,
          status: "suggested",
          provenance: "manual",
        })
        .select("id")
        .single();
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501");
      expect(data).toBeNull();
    });

    it("two-FK escape: Bob cannot insert a frame with bobProject + Alice's shot_id", async () => {
      const { data, error } = await bob
        .from("shot_frames")
        .insert({
          project_id: bobProject,
          shot_id: aliceShotId, // cross-project escape
          image_path: "storyboards/bob/frame.jpg",
          source: "upload",
          status: "suggested",
          ordinal: 0,
        })
        .select("id")
        .single();
      expect(error).not.toBeNull();
      expect(error!.code).toBe("42501");
      expect(data).toBeNull();
    });

    it("shot_frames_one_selected: two is_selected=true rows for one shot are rejected (23505)", async () => {
      // Create a fresh shot so this test is self-contained.
      const { data: script2, error: s2Err } = await alice
        .from("scripts")
        .insert({ project_id: aliceProject, title: "Pilot2" })
        .select("id")
        .single();
      if (s2Err) throw s2Err;
      const { data: scene2, error: sc2Err } = await alice
        .from("scenes")
        .insert({ project_id: aliceProject, script_id: script2.id, ordinal: 1 })
        .select("id")
        .single();
      if (sc2Err) throw sc2Err;
      const { data: shot2, error: sh2Err } = await alice
        .from("shots")
        .insert({
          project_id: aliceProject,
          scene_id: scene2.id,
          ordinal: 1,
          status: "suggested",
          provenance: "ai",
        })
        .select("id")
        .single();
      if (sh2Err) throw sh2Err;

      // First is_selected=true frame — must succeed.
      const { error: firstErr } = await alice
        .from("shot_frames")
        .insert({
          project_id: aliceProject,
          shot_id: shot2.id,
          image_path: "storyboards/test/frameA.jpg",
          source: "ai",
          status: "selected",
          is_selected: true,
          ordinal: 0,
        })
        .select("id")
        .single();
      expect(firstErr).toBeNull();

      // Second is_selected=true for the same shot — must be rejected by partial unique index.
      const { error: secondErr } = await alice
        .from("shot_frames")
        .insert({
          project_id: aliceProject,
          shot_id: shot2.id,
          image_path: "storyboards/test/frameB.jpg",
          source: "ai",
          status: "selected",
          is_selected: true,
          ordinal: 1,
        })
        .select("id")
        .single();
      expect(secondErr).not.toBeNull();
      expect(secondErr!.code).toBe("23505");
    });
  }
);

// ============================================================================
// Data layer tests — live DB
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "storyboard settings+refs data layer",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;
    let aliceCharacterId: string;
    let aliceLocationId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-dl-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);

      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "DL_HERO" })
        .select("id")
        .single();
      if (charErr) throw charErr;
      aliceCharacterId = char.id;

      const { data: loc, error: locErr } = await alice
        .from("locations")
        .insert({ project_id: aliceProject, name: "DL_Stage" })
        .select("id")
        .single();
      if (locErr) throw locErr;
      aliceLocationId = loc.id;
    });

    // -------------------------------------------------------------------------
    // getVisualSettings — pure read; returns null when no row exists yet,
    // returns the row after creation. Safe under RLS (no write).
    // -------------------------------------------------------------------------

    it("getVisualSettings: returns null when no settings row exists for project", async () => {
      // Fresh project with NO settings row yet
      const freshProject = await newProject(alice);
      const result = await getVisualSettings(alice, freshProject);
      expect(result).toBeNull();
    });

    it("getVisualSettings: returns the row after it is created by getOrCreateVisualSettings", async () => {
      // Use a separate fresh project so this test is self-contained
      const freshProject = await newProject(alice);

      // Nothing yet — should be null
      const before = await getVisualSettings(alice, freshProject);
      expect(before).toBeNull();

      // Create the row via getOrCreateVisualSettings (simulates first owner action)
      const created = await getOrCreateVisualSettings(alice, freshProject);
      expect(created.project_id).toBe(freshProject);

      // Now getVisualSettings must return the same row
      const after = await getVisualSettings(alice, freshProject);
      expect(after).not.toBeNull();
      expect(after!.id).toBe(created.id);
      expect(after!.style_preset).toBe("storyboard_sketch");
      expect(after!.aspect_ratio).toBe("16:9");
      expect(after!.custom_style_prompt).toBeNull();
    });

    // -------------------------------------------------------------------------
    // getOrCreateVisualSettings — idempotent get-or-create
    // -------------------------------------------------------------------------

    it("getOrCreateVisualSettings: idempotent — two calls return the same id", async () => {
      const first = await getOrCreateVisualSettings(alice, aliceProject);
      const second = await getOrCreateVisualSettings(alice, aliceProject);
      expect(first.id).toBe(second.id);
      expect(first.project_id).toBe(aliceProject);
      // Defaults from migration
      expect(first.style_preset).toBe("storyboard_sketch");
      expect(first.aspect_ratio).toBe("16:9");
    });

    // -------------------------------------------------------------------------
    // updateVisualSettings — partial update, read-back confirms change
    // -------------------------------------------------------------------------

    it("updateVisualSettings: patches fields and read-back confirms", async () => {
      // Ensure the settings row exists first
      await getOrCreateVisualSettings(alice, aliceProject);

      const updated = await updateVisualSettings(alice, {
        projectId: aliceProject,
        stylePreset: "graphic_novel_ink",
        aspectRatio: "2.39:1",
        customStylePrompt: "ink wash, high contrast",
      });

      expect(updated.style_preset).toBe("graphic_novel_ink");
      expect(updated.aspect_ratio).toBe("2.39:1");
      expect(updated.custom_style_prompt).toBe("ink wash, high contrast");
    });

    // -------------------------------------------------------------------------
    // createVisualReference + listVisualReferences
    // -------------------------------------------------------------------------

    it("createVisualReference + listVisualReferences: created ref appears in list", async () => {
      const ref = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "character",
        characterId: aliceCharacterId,
        source: "ai",
        status: "suggested",
      });

      expect(ref.project_id).toBe(aliceProject);
      expect(ref.character_id).toBe(aliceCharacterId);
      expect(ref.subject_type).toBe("character");

      const refs = await listVisualReferences(alice, aliceProject);
      const found = refs.find((r) => r.id === ref.id);
      expect(found).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // lockReference — clears prior primary, sets new primary, no 23505
    // -------------------------------------------------------------------------

    it("lockReference: lock first ref, then lock second — only second is_primary, no 23505", async () => {
      // Two refs for the same character (both non-primary to start)
      const refA = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "character",
        characterId: aliceCharacterId,
        source: "ai",
        status: "suggested",
        isPrimary: false,
      });
      const refB = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "character",
        characterId: aliceCharacterId,
        source: "upload",
        status: "suggested",
        isPrimary: false,
      });

      // Lock refA first — it becomes primary+locked
      const lockedA = await lockReference(alice, { id: refA.id });
      expect(lockedA.status).toBe("locked");
      expect(lockedA.is_primary).toBe(true);

      // Lock refB next — refA must lose is_primary, no 23505
      const lockedB = await lockReference(alice, { id: refB.id });
      expect(lockedB.status).toBe("locked");
      expect(lockedB.is_primary).toBe(true);

      // Confirm refA is no longer primary
      const { data: rereadA } = await alice
        .from("visual_references")
        .select("is_primary, status")
        .eq("id", refA.id)
        .single();
      expect(rereadA!.is_primary).toBe(false);
    });

    // -------------------------------------------------------------------------
    // lockReference — idempotent re-lock of an already-primary reference
    // -------------------------------------------------------------------------

    it("lockReference: re-locking the current primary is idempotent — no 23505, stays locked+primary", async () => {
      // Fresh character so this test is self-contained.
      const { data: freshChar, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "RELOCK_CHAR" })
        .select("id")
        .single();
      if (charErr) throw charErr;

      // Create a ref and lock it — it becomes the primary.
      const ref = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "character",
        characterId: freshChar.id,
        source: "ai",
        status: "suggested",
        isPrimary: false,
      });
      const firstLock = await lockReference(alice, { id: ref.id });
      expect(firstLock.status).toBe("locked");
      expect(firstLock.is_primary).toBe(true);

      // Call lockReference again on the same ref — the .neq("id", id) filter on
      // the clear step means it won't clear itself, so no 23505 from attempting
      // to set is_primary=true when it's already true on the unique index.
      const secondLock = await lockReference(alice, { id: ref.id });
      expect(secondLock.status).toBe("locked");
      expect(secondLock.is_primary).toBe(true);

      // Confirm the row in DB still reflects the correct state.
      const { data: reread } = await alice
        .from("visual_references")
        .select("is_primary, status")
        .eq("id", ref.id)
        .single();
      expect(reread!.status).toBe("locked");
      expect(reread!.is_primary).toBe(true);
    });

    // -------------------------------------------------------------------------
    // setReferenceStatus — changes status field
    // -------------------------------------------------------------------------

    it("setReferenceStatus: updates status field", async () => {
      const ref = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "location",
        locationId: aliceLocationId,
        source: "upload",
        status: "suggested",
      });

      const updated = await setReferenceStatus(alice, { id: ref.id, status: "rejected" });
      expect(updated.status).toBe("rejected");
    });

    // -------------------------------------------------------------------------
    // getLockedReferences — returns only locked primaries
    // -------------------------------------------------------------------------

    it("getLockedReferences: returns locked primaries, not suggested/rejected", async () => {
      // Create a fresh character to isolate this test
      const { data: freshChar, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "GRL_CHAR" })
        .select("id")
        .single();
      if (charErr) throw charErr;

      // Create a fresh location to isolate this test
      const { data: freshLoc, error: locErr } = await alice
        .from("locations")
        .insert({ project_id: aliceProject, name: "GRL_LOC" })
        .select("id")
        .single();
      if (locErr) throw locErr;

      // Suggested ref (should NOT appear in getLockedReferences)
      await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "character",
        characterId: freshChar.id,
        source: "ai",
        status: "suggested",
        isPrimary: false,
      });

      // Locked primary character ref
      const charRef = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "character",
        characterId: freshChar.id,
        source: "ai",
        status: "suggested",
        isPrimary: false,
      });
      await lockReference(alice, { id: charRef.id });

      // Locked primary location ref
      const locRef = await createVisualReference(alice, {
        projectId: aliceProject,
        subjectType: "location",
        locationId: freshLoc.id,
        source: "upload",
        status: "suggested",
        isPrimary: false,
      });
      await lockReference(alice, { id: locRef.id });

      const locked = await getLockedReferences(alice, aliceProject);

      // Both locked primaries must appear
      const charEntry = locked.find((r) => r.id === charRef.id);
      const locEntry = locked.find((r) => r.id === locRef.id);
      expect(charEntry).toBeDefined();
      expect(locEntry).toBeDefined();

      // All returned rows must be locked primaries
      for (const r of locked) {
        expect(r.status).toBe("locked");
        expect(r.is_primary).toBe(true);
      }
    });
  }
);

// ============================================================================
// Data layer tests — shots + shot_frames
// ============================================================================

// Helper: seed a scene (requires a project with a script) for shot tests
async function seedScene(client: SupabaseClient<Database>, projectId: string) {
  const { data: script, error: scriptErr } = await client
    .from("scripts")
    .insert({ project_id: projectId, title: `Script-${globalThis.crypto.randomUUID()}` })
    .select("id")
    .single();
  if (scriptErr) throw scriptErr;

  const { data: scene, error: sceneErr } = await client
    .from("scenes")
    .insert({ project_id: projectId, script_id: script.id, ordinal: 1 })
    .select("id")
    .single();
  if (sceneErr) throw sceneErr;
  return scene.id as string;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "storyboard shots + frames data layer",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-shots-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
    });

    // -------------------------------------------------------------------------
    // createShot — ordinal auto-increments
    // -------------------------------------------------------------------------

    it("createShot: first shot gets ordinal 0, second gets ordinal 1", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const shot1 = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Hero enters frame.",
      });
      expect(shot1.ordinal).toBe(0);

      const shot2 = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "CU",
        angle: "low",
        movement: "push_in",
        action: "Close on face.",
      });
      expect(shot2.ordinal).toBe(1);
    });

    // -------------------------------------------------------------------------
    // createShot — default status vs explicit status
    // -------------------------------------------------------------------------

    it("createShot: default insert (no status) → status is 'suggested'", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Default status test.",
        provenance: "ai",
      });
      expect(shot.status).toBe("suggested");
    });

    it("createShot: with status:'confirmed' → status is 'confirmed'", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "MS",
        angle: "eye",
        movement: "static",
        action: "Manual shot — pre-confirmed.",
        provenance: "manual",
        status: "confirmed",
      });
      expect(shot.status).toBe("confirmed");
    });

    // -------------------------------------------------------------------------
    // listShots — ordered by ordinal
    // -------------------------------------------------------------------------

    it("listShots: returns shots ordered by ordinal ascending", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "First.",
      });
      await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "MS",
        angle: "eye",
        movement: "static",
        action: "Second.",
      });
      await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "CU",
        angle: "high",
        movement: "tilt",
        action: "Third.",
      });

      const shots = await listShots(alice, sceneId);
      expect(shots.length).toBe(3);
      expect(shots[0].ordinal).toBeLessThan(shots[1].ordinal);
      expect(shots[1].ordinal).toBeLessThan(shots[2].ordinal);
    });

    // -------------------------------------------------------------------------
    // updateShot — patches metadata fields
    // -------------------------------------------------------------------------

    it("updateShot: updates size, angle, movement, action and reads back", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Original action.",
      });

      const updated = await updateShot(alice, {
        id: shot.id,
        size: "MCU",
        angle: "dutch",
        movement: "handheld",
        action: "Updated action.",
        lens: "50mm",
      });

      expect(updated.size).toBe("MCU");
      expect(updated.angle).toBe("dutch");
      expect(updated.movement).toBe("handheld");
      expect(updated.action).toBe("Updated action.");
      expect(updated.lens).toBe("50mm");
    });

    // -------------------------------------------------------------------------
    // reorderShots — new ordinals match array position
    // -------------------------------------------------------------------------

    it("reorderShots: reversing order — ordinals reflect new positions", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const s1 = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "A",
      });
      const s2 = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "MS",
        angle: "eye",
        movement: "static",
        action: "B",
      });
      const s3 = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "CU",
        angle: "high",
        movement: "tilt",
        action: "C",
      });

      // Verify original order
      expect(s1.ordinal).toBe(0);
      expect(s2.ordinal).toBe(1);
      expect(s3.ordinal).toBe(2);

      // Reverse order: s3 → 0, s2 → 1, s1 → 2
      await reorderShots(alice, { sceneId, orderedIds: [s3.id, s2.id, s1.id] });

      const shots = await listShots(alice, sceneId);
      const byId = Object.fromEntries(shots.map((s) => [s.id, s]));
      expect(byId[s3.id].ordinal).toBe(0);
      expect(byId[s2.id].ordinal).toBe(1);
      expect(byId[s1.id].ordinal).toBe(2);
    });

    // -------------------------------------------------------------------------
    // setShotStatus — updates status field
    // -------------------------------------------------------------------------

    it("setShotStatus: changes status and reads back", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Status test.",
      });

      const updated = await setShotStatus(alice, { id: shot.id, status: "confirmed" });
      expect(updated.status).toBe("confirmed");
    });

    // -------------------------------------------------------------------------
    // deleteShot — row is gone after delete
    // -------------------------------------------------------------------------

    it("deleteShot: shot is no longer returned by listShots", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "To be deleted.",
      });

      await deleteShot(alice, { id: shot.id });

      const shots = await listShots(alice, sceneId);
      expect(shots.find((s) => s.id === shot.id)).toBeUndefined();
    });

    // -------------------------------------------------------------------------
    // createShotFrame — first frame is selected, subsequent are not
    // -------------------------------------------------------------------------

    it("createShotFrame: first frame is_selected=true, second is_selected=false", async () => {
      const sceneId = await seedScene(alice, aliceProject);
      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Frame test.",
      });

      const frame1 = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/test/frame1.jpg",
        source: "ai",
      });
      expect(frame1.is_selected).toBe(true);
      expect(frame1.status).toBe("selected");

      const frame2 = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/test/frame2.jpg",
        source: "ai",
      });
      expect(frame2.is_selected).toBe(false);
      expect(frame2.status).toBe("suggested");
    });

    // -------------------------------------------------------------------------
    // listShotFrames — ordered by ordinal
    // -------------------------------------------------------------------------

    it("listShotFrames: returns frames ordered by ordinal", async () => {
      const sceneId = await seedScene(alice, aliceProject);
      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "List frames.",
      });

      await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/test/fA.jpg",
        source: "ai",
      });
      await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/test/fB.jpg",
        source: "ai",
      });

      const frames = await listShotFrames(alice, shot.id);
      expect(frames.length).toBe(2);
      expect(frames[0].ordinal).toBeLessThanOrEqual(frames[1].ordinal);
    });

    // -------------------------------------------------------------------------
    // selectFrame — clears prior selected, sets target, no 23505
    // -------------------------------------------------------------------------

    it("selectFrame: select second frame — only second is_selected, first reverts to suggested", async () => {
      const sceneId = await seedScene(alice, aliceProject);
      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "MS",
        angle: "eye",
        movement: "static",
        action: "Select frame test.",
      });

      // First frame is auto-selected
      const frameA = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/select/a.jpg",
        source: "ai",
      });
      expect(frameA.is_selected).toBe(true);

      // Second frame is not selected
      const frameB = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/select/b.jpg",
        source: "ai",
      });
      expect(frameB.is_selected).toBe(false);

      // Select frame B — no 23505 collision, A must revert
      const selected = await selectFrame(alice, { shotId: shot.id, frameId: frameB.id });
      expect(selected.is_selected).toBe(true);
      expect(selected.status).toBe("selected");

      // Verify A is no longer selected
      const frames = await listShotFrames(alice, shot.id);
      const a = frames.find((f) => f.id === frameA.id)!;
      const b = frames.find((f) => f.id === frameB.id)!;
      expect(a.is_selected).toBe(false);
      expect(a.status).toBe("suggested");
      expect(b.is_selected).toBe(true);
      expect(b.status).toBe("selected");
    });

    // -------------------------------------------------------------------------
    // setFrameStatus — updates status without changing is_selected
    // -------------------------------------------------------------------------

    it("setFrameStatus: updates status field on a frame", async () => {
      const sceneId = await seedScene(alice, aliceProject);
      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Frame status.",
      });

      const frame = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/status/f.jpg",
        source: "ai",
      });

      const updated = await setFrameStatus(alice, { id: frame.id, status: "rejected" });
      expect(updated.status).toBe("rejected");
    });

    // -------------------------------------------------------------------------
    // deleteShotFrame — frame is gone after delete
    // -------------------------------------------------------------------------

    it("deleteShotFrame: frame is no longer returned by listShotFrames", async () => {
      const sceneId = await seedScene(alice, aliceProject);
      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Delete frame.",
      });

      const frame = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: "storyboards/delete/f.jpg",
        source: "ai",
      });

      await deleteShotFrame(alice, { id: frame.id });

      const frames = await listShotFrames(alice, shot.id);
      expect(frames.find((f) => f.id === frame.id)).toBeUndefined();
    });
  }
);

// ============================================================================
// image_generations RLS tests (0021) — append-only ledger
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "image_generations RLS (0021)",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-ig-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-ig-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      // Bob does NOT need access to Alice's project — intentional.
    });

    it("Alice can insert and select her own image_generations rows", async () => {
      const { data, error } = await alice
        .from("image_generations")
        .insert({
          project_id: aliceProject,
          kind: "render",
          model: "gemini-2.5-flash-image",
          image_count: 4,
          est_cost: 0.156,
        })
        .select("id, image_count, est_cost")
        .single();
      expect(error).toBeNull();
      expect(data!.image_count).toBe(4);

      const { data: rows } = await alice
        .from("image_generations")
        .select("id")
        .eq("project_id", aliceProject);
      expect((rows ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("Bob sees 0 of Alice's image_generations rows (RLS blocks cross-project select)", async () => {
      const { data: rows } = await bob
        .from("image_generations")
        .select("*")
        .eq("project_id", aliceProject);
      expect(rows ?? []).toHaveLength(0);
    });

    it("ledger is append-only: Alice's UPDATE attempt affects 0 rows (no update policy)", async () => {
      // Insert a row Alice owns
      const { data: row, error: insertErr } = await alice
        .from("image_generations")
        .insert({
          project_id: aliceProject,
          kind: "reference",
          model: "gemini-2.5-flash-image",
          image_count: 2,
          est_cost: 0.078,
        })
        .select("id")
        .single();
      expect(insertErr).toBeNull();

      // There is no UPDATE policy — the update call should affect 0 rows
      // (Supabase returns { count: null, data: [], error: null } when RLS
      // filters out the target — it is not an error, just a no-op).
      const { data: updated, error: updateErr } = await alice
        .from("image_generations")
        .update({ image_count: 999 })
        .eq("id", row!.id)
        .select("id, image_count");
      // No error is thrown (RLS no-op, not a 42501 in this grant model)
      expect(updateErr).toBeNull();
      // But the update must not have taken effect
      expect((updated ?? []).length).toBe(0);

      // Re-read to confirm the value is still 2, not 999
      const { data: reread } = await alice
        .from("image_generations")
        .select("image_count")
        .eq("id", row!.id)
        .single();
      expect(reread!.image_count).toBe(2);
    });
  }
);

// ============================================================================
// image_generations data layer tests (0021)
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "image_generations data layer",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-igdl-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
    });

    it("recordImageGeneration: inserts a row and returns parsed ImageGeneration", async () => {
      const row = await recordImageGeneration(alice, {
        projectId: aliceProject,
        kind: "render",
        model: "gemini-2.5-flash-image",
        imageCount: 6,
        estCost: 0.234,
      });
      expect(row.project_id).toBe(aliceProject);
      expect(row.kind).toBe("render");
      expect(row.model).toBe("gemini-2.5-flash-image");
      expect(row.image_count).toBe(6);
      expect(typeof row.est_cost).toBe("number");
      expect(row.est_cost).toBeCloseTo(0.234, 5);
      expect(row.job_id).toBeNull();
    });

    it("getGenerationTotals: sums image_count and est_cost across all rows", async () => {
      // Start from a fresh project so totals are predictable
      const freshProject = await newProject(alice);

      await recordImageGeneration(alice, {
        projectId: freshProject,
        kind: "render",
        model: "gemini-2.5-flash-image",
        imageCount: 4,
        estCost: 0.156,
      });
      await recordImageGeneration(alice, {
        projectId: freshProject,
        kind: "reference",
        model: "gemini-2.5-flash-image",
        imageCount: 2,
        estCost: 0.078,
      });

      const totals = await getGenerationTotals(alice, freshProject);
      expect(totals.imageCount).toBe(6);
      expect(totals.estCost).toBeCloseTo(0.234, 5);
    });

    it("getGenerationTotals: returns zero totals for a project with no rows", async () => {
      const emptyProject = await newProject(alice);
      const totals = await getGenerationTotals(alice, emptyProject);
      expect(totals.imageCount).toBe(0);
      expect(totals.estCost).toBe(0);
    });
  }
);

// ============================================================================
// loadRenderInputs — assembles the render graph slice (sceneMeta + locked refs)
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "loadRenderInputs",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;
    let sceneId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-lri-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);

      // Location + set (so the scene resolves a location_id).
      const { data: loc, error: locErr } = await alice
        .from("locations")
        .insert({ project_id: aliceProject, name: "Rooftop" })
        .select("id")
        .single();
      if (locErr) throw locErr;
      const locationId = loc.id;

      const { data: set, error: setErr } = await alice
        .from("sets")
        .insert({ project_id: aliceProject, name: "EXT. ROOFTOP", location_id: locationId })
        .select("id")
        .single();
      if (setErr) throw setErr;

      // Script + scene with header fields + set link.
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: aliceProject, title: "LRI Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;

      const { data: scene, error: sceneErr } = await alice
        .from("scenes")
        .insert({
          project_id: aliceProject,
          script_id: script.id,
          ordinal: 0,
          status: "active",
          int_ext: "EXT",
          location_slug: "ROOFTOP",
          time_of_day: "DUSK",
          synopsis: "Standoff at the edge.",
          set_id: set.id,
        })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;
      sceneId = scene.id;

      // Character present (confirmed) in the scene.
      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "VILLAIN" })
        .select("id")
        .single();
      if (charErr) throw charErr;
      const characterId = char.id;

      const { error: scErr } = await alice.from("scene_characters").insert({
        scene_id: sceneId,
        character_id: characterId,
        presence_type: "speaking",
        provenance: "manual",
        status: "confirmed",
        anchor_state: "anchored",
      });
      if (scErr) throw scErr;

      // A second character that is NOT present — must NOT appear in characterRefs.
      const { data: absent, error: absentErr } = await alice
        .from("characters")
        .insert({ project_id: aliceProject, primary_name: "BYSTANDER" })
        .select("id")
        .single();
      if (absentErr) throw absentErr;
      await alice.from("visual_references").insert({
        project_id: aliceProject,
        subject_type: "character",
        character_id: absent.id,
        is_primary: true,
        status: "locked",
        source: "ai",
        image_path: `${aliceProject}/references/bystander.png`,
      });

      // Locked primary refs for the present character + the location.
      const { error: cRefErr } = await alice.from("visual_references").insert({
        project_id: aliceProject,
        subject_type: "character",
        character_id: characterId,
        is_primary: true,
        status: "locked",
        source: "ai",
        image_path: `${aliceProject}/references/villain.png`,
      });
      if (cRefErr) throw cRefErr;

      const { error: lRefErr } = await alice.from("visual_references").insert({
        project_id: aliceProject,
        subject_type: "location",
        location_id: locationId,
        is_primary: true,
        status: "locked",
        source: "ai",
        image_path: `${aliceProject}/references/rooftop.png`,
      });
      if (lRefErr) throw lRefErr;
    });

    it("returns sceneMeta from the scene row + resolved location", async () => {
      const inputs = await loadRenderInputs(alice, sceneId);
      expect(inputs.projectId).toBe(aliceProject);
      expect(inputs.sceneMeta.intExt).toBe("EXT");
      expect(inputs.sceneMeta.timeOfDay).toBe("DUSK");
      expect(inputs.sceneMeta.locationName).toBe("Rooftop"); // resolved via set→location
      expect(inputs.sceneMeta.synopsis).toBe("Standoff at the edge.");
      // style from getOrCreateVisualSettings defaults
      expect(inputs.style.stylePreset).toBe("storyboard_sketch");
      expect(inputs.style.aspectRatio).toBe("16:9");
    });

    it("returns the present character's locked ref and excludes absent characters", async () => {
      const inputs = await loadRenderInputs(alice, sceneId);
      expect(inputs.characterRefs.length).toBe(1);
      expect(inputs.characterRefs[0].label).toBe("VILLAIN");
      expect(inputs.characterRefs[0].path).toBe(`${aliceProject}/references/villain.png`);
      expect(inputs.characterRefs[0].mediaType).toBe("image/png");
    });

    it("returns the scene's locked location ref", async () => {
      const inputs = await loadRenderInputs(alice, sceneId);
      expect(inputs.locationRef).not.toBeNull();
      expect(inputs.locationRef!.label).toBe("Rooftop");
      expect(inputs.locationRef!.path).toBe(`${aliceProject}/references/rooftop.png`);
      expect(inputs.locationRef!.mediaType).toBe("image/png");
    });
  }
);

// ============================================================================
// getSceneBoard — signed URLs via owner client (Task 11)
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "getSceneBoard",
  () => {
    let alice: SupabaseClient<Database>;
    let aliceProject: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-gsb-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
    });

    it("shot with one uploaded frame: signedUrl is a non-empty string and selectedUrl is set", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      // Create a shot
      const shot = await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "WS",
        angle: "eye",
        movement: "static",
        action: "Board test.",
      });

      // Upload a tiny 1×1 PNG to the real storage path using alice's client.
      // Minimal valid PNG (67 bytes): 1×1 transparent pixel.
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // width=1, height=1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bitDepth=8, colorType=2, CRC
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk length + type
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, // IDAT compressed data
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, // IDAT CRC
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk length + type
        0x44, 0xae, 0x42, 0x60, 0x82,                   // IEND data + CRC
      ]);
      const frameUuid = globalThis.crypto.randomUUID();
      const storagePath = `${aliceProject}/shots/${shot.id}/${frameUuid}.png`;

      const { error: uploadErr } = await alice.storage
        .from("storyboards")
        .upload(storagePath, pngBytes, { contentType: "image/png" });
      // If upload fails (e.g. bucket policy), the test will throw here — that's intentional.
      expect(uploadErr).toBeNull();

      // Insert the shot_frames row pointing at the uploaded path (is_selected=true).
      const frame = await createShotFrame(alice, {
        projectId: aliceProject,
        shotId: shot.id,
        imagePath: storagePath,
        source: "upload",
      });
      expect(frame.is_selected).toBe(true);

      // Call getSceneBoard and assert the signed URL + selectedUrl.
      const board = await getSceneBoard(alice, sceneId);
      expect(board.sceneId).toBe(sceneId);
      expect(board.shots.length).toBe(1);

      const boardShot = board.shots[0];
      expect(boardShot.id).toBe(shot.id);
      expect(boardShot.status).toBe("suggested"); // default status on createShot
      expect(boardShot.provenance).toBe("manual"); // default provenance on createShot
      expect(boardShot.frames.length).toBe(1);

      const boardFrame = boardShot.frames[0];
      expect(boardFrame.id).toBe(frame.id);
      expect(boardFrame.signedUrl).toBeTruthy(); // non-empty string
      expect(boardFrame.isSelected).toBe(true);
      expect(boardShot.selectedUrl).toBe(boardFrame.signedUrl);
    });

    it("shot with NO frames yields frames: [] and selectedUrl: null", async () => {
      const sceneId = await seedScene(alice, aliceProject);

      await createShot(alice, {
        projectId: aliceProject,
        sceneId,
        size: "MS",
        angle: "high",
        movement: "pan",
        action: "Empty shot.",
      });

      const board = await getSceneBoard(alice, sceneId);
      expect(board.sceneId).toBe(sceneId);
      expect(board.shots.length).toBe(1);

      const boardShot = board.shots[0];
      expect(boardShot.status).toBe("suggested");
      expect(boardShot.provenance).toBe("manual");
      expect(boardShot.frames).toHaveLength(0);
      expect(boardShot.selectedUrl).toBeNull();
    });
  }
);

// ============================================================================
// Storage RLS isolation — `storyboards` private bucket
// ============================================================================

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "storyboards Storage bucket RLS isolation",
  () => {
    let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
    let aliceProject: string;
    let alicePath: string;

    // Minimal valid PNG bytes — 1×1 transparent pixel (same pattern used above).
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
      0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    beforeAll(async () => {
      alice = await makeUser(`alice-stor-${globalThis.crypto.randomUUID()}@test.dev`);
      bob = await makeUser(`bob-stor-${globalThis.crypto.randomUUID()}@test.dev`);
      aliceProject = await newProject(alice);
      await newProject(bob); // Bob needs a project so his session is valid

      alicePath = `${aliceProject}/refs/test.png`;

      // Alice uploads a small object into her project prefix.
      const { error: uploadErr } = await alice.storage
        .from("storyboards")
        .upload(alicePath, pngBytes, { contentType: "image/png" });
      if (uploadErr) throw new Error(`Alice upload failed: ${uploadErr.message}`);
    });

    it("Alice can upload to her own project prefix (positive control)", async () => {
      // Upload already happened in beforeAll — just verify the signed URL works.
      const { data, error } = await alice.storage
        .from("storyboards")
        .createSignedUrl(alicePath, 60);
      expect(error).toBeNull();
      expect(data?.signedUrl).toBeTruthy();
    });

    it("Bob cannot createSignedUrl for Alice's object (RLS denies)", async () => {
      const { data, error } = await bob.storage
        .from("storyboards")
        .createSignedUrl(alicePath, 60);
      // Storage RLS: either an error OR the returned URL is null/empty.
      const denied = error !== null || !data?.signedUrl;
      expect(denied).toBe(true);
    });

    it("Bob cannot download Alice's object (RLS denies)", async () => {
      const { data, error } = await bob.storage
        .from("storyboards")
        .download(alicePath);
      // RLS-blocked download returns an error or null data.
      const denied = error !== null || data === null;
      expect(denied).toBe(true);
    });

    it("Bob cannot upload to Alice's project prefix (RLS denies)", async () => {
      const crossPath = `${aliceProject}/refs/bob-inject.png`;
      const { error } = await bob.storage
        .from("storyboards")
        .upload(crossPath, pngBytes, { contentType: "image/png" });
      // RLS must block Bob from writing under Alice's project prefix.
      expect(error).not.toBeNull();
    });
  }
);
