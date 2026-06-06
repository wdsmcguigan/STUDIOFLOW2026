/**
 * Storyboard cross-module integration test — the thesis test.
 *
 * THESIS: Storyboard consumes the production graph (breakdown characters,
 * confirmed presence, location chain) without a sync step.  Changes upstream
 * — reject a cast tag, swap a location, renumber a scene — flow through
 * derived-on-read with no materialisation.  Shots key to immutable scene_id,
 * never to the mutable scene_number.  Re-boarding appends and never clobbers
 * confirmed work (non-destructive, Decision #7).
 *
 * Scope: DATA + DERIVATION only.  No live image generation; no API key needed.
 * decomposeScene and the real ImageEngine are NOT called.
 *
 * State: `it` blocks share seeded state intentionally (mutations carry forward).
 * Order matters — see the numbered assertions below.
 *
 * Guard: `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)` keeps CI
 * green when no live DB is available (identical to every other live-DB suite
 * in this codebase).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  loadRenderInputs,
  createShot,
  listShots,
  reorderShots,
  setShotStatus,
  getSceneBoard,
} from "@/lib/storyboard/data";
import {
  buildPanelPrompt,
  selectConditioningRefs,
} from "@/lib/storyboard/ai/prompt";
import type { RefImage } from "@/lib/storyboard/schema";

// ---------------------------------------------------------------------------
// Harness helpers — mirror data.test.ts exactly
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
    .insert({ title: "Storyboard Thesis Test", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Integration suite
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "storyboard thesis (cross-module)",
  () => {
    let alice: SupabaseClient<Database>;
    let projectId: string;

    // Seeded entity ids
    let locationId: string;    // locations.id — used for ref lookup + location swap
    let setId: string;         // sets.id — scene points here; swap target uses a second set
    let sceneId: string;       // scenes.id — immutable, used for shots
    let characterId: string;   // characters.id — the PRESENT character
    let sceneCharId: string;   // scene_characters.id — status flipped in assertion 3
    let charRefId: string;     // visual_references.id — locked character sheet
    let locRefId: string;      // visual_references.id — locked location plate

    // ---------------------------------------------------------------------------
    // Seed: full upstream graph in beforeAll
    //
    // location → set → scene (set_id = set.id)
    // character → confirmed scene_characters tag → locked visual_reference
    // location → locked visual_reference (plate)
    // ---------------------------------------------------------------------------

    beforeAll(async () => {
      alice = await makeUser(
        `alice-sb-thesis-${globalThis.crypto.randomUUID()}@test.dev`,
      );
      projectId = await newProject(alice);

      // ── Location + set (scene→set→location chain) ──────────────────────────
      const { data: loc, error: locErr } = await alice
        .from("locations")
        .insert({ project_id: projectId, name: "Warehouse" })
        .select("id")
        .single();
      if (locErr) throw locErr;
      locationId = loc.id;

      const { data: set, error: setErr } = await alice
        .from("sets")
        .insert({
          project_id: projectId,
          name: "INT. WAREHOUSE",
          location_id: locationId,
        })
        .select("id")
        .single();
      if (setErr) throw setErr;
      setId = set.id;

      // ── Script + scene (with header fields + set link) ──────────────────────
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: projectId, title: "Thesis Script" })
        .select("id")
        .single();
      if (scriptErr) throw scriptErr;

      const { data: scene, error: sceneErr } = await alice
        .from("scenes")
        .insert({
          project_id: projectId,
          script_id: script.id,
          ordinal: 0,
          status: "active",
          scene_number: "1",
          int_ext: "INT",
          location_slug: "WAREHOUSE",
          time_of_day: "NIGHT",
          synopsis: "The exchange goes wrong.",
          set_id: setId,
        })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;
      sceneId = scene.id;

      // ── Character + confirmed scene_characters tag ──────────────────────────
      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: projectId, primary_name: "DETECTIVE COLE" })
        .select("id")
        .single();
      if (charErr) throw charErr;
      characterId = char.id;

      const { data: scChar, error: scCharErr } = await alice
        .from("scene_characters")
        .insert({
          scene_id: sceneId,
          character_id: characterId,
          presence_type: "speaking",
          provenance: "manual",
          status: "confirmed",
          anchor_state: "anchored",
        })
        .select("id")
        .single();
      if (scCharErr) throw scCharErr;
      sceneCharId = scChar.id;

      // ── Locked primary ref for the character (character sheet) ──────────────
      const { data: cRef, error: cRefErr } = await alice
        .from("visual_references")
        .insert({
          project_id: projectId,
          subject_type: "character",
          character_id: characterId,
          is_primary: true,
          status: "locked",
          source: "ai",
          image_path: `${projectId}/references/cole.png`,
        })
        .select("id")
        .single();
      if (cRefErr) throw cRefErr;
      charRefId = cRef.id;

      // ── Locked primary ref for the location (plate) ─────────────────────────
      const { data: lRef, error: lRefErr } = await alice
        .from("visual_references")
        .insert({
          project_id: projectId,
          subject_type: "location",
          location_id: locationId,
          is_primary: true,
          status: "locked",
          source: "ai",
          image_path: `${projectId}/references/warehouse.png`,
        })
        .select("id")
        .single();
      if (lRefErr) throw lRefErr;
      locRefId = lRef.id;

      // Suppress "unused variable" warnings — ids are used in later assertions.
      void charRefId;
      void locRefId;
    }, 60_000);

    // ── Assertion 1: loadRenderInputs resolves the scene→set→location chain ───
    it(
      "Assertion 1 — loadRenderInputs: locationName resolves via set; characterRefs includes present character; locationRef is the locked plate",
      async () => {
        const inputs = await loadRenderInputs(alice, sceneId);

        // sceneMeta — resolved location via set→location chain
        expect(inputs.projectId).toBe(projectId);
        expect(inputs.sceneMeta.locationName).toBe("Warehouse");
        expect(inputs.sceneMeta.intExt).toBe("INT");
        expect(inputs.sceneMeta.timeOfDay).toBe("NIGHT");

        // characterRefs — present character's locked ref appears
        expect(inputs.characterRefs.length).toBeGreaterThanOrEqual(1);
        const cRef = inputs.characterRefs.find(
          (r) => r.label === "DETECTIVE COLE",
        );
        expect(cRef).toBeDefined();
        expect(cRef!.path).toBe(`${projectId}/references/cole.png`);
        expect(cRef!.mediaType).toBe("image/png");

        // locationRef — locked plate for the location
        expect(inputs.locationRef).not.toBeNull();
        expect(inputs.locationRef!.label).toBe("Warehouse");
        expect(inputs.locationRef!.path).toBe(
          `${projectId}/references/warehouse.png`,
        );
        expect(inputs.locationRef!.mediaType).toBe("image/png");
      },
    );

    // ── Assertion 2: buildPanelPrompt + selectConditioningRefs ────────────────
    it(
      "Assertion 2 — prompt: buildPanelPrompt mentions location name + shot action; selectConditioningRefs returns location first then character, capped",
      async () => {
        const inputs = await loadRenderInputs(alice, sceneId);

        const shot = {
          size: "MS" as const,
          angle: "eye" as const,
          movement: "static" as const,
          lens: "35mm",
          action: "Cole draws his weapon slowly.",
        };

        const prompt = buildPanelPrompt({
          sceneMeta: inputs.sceneMeta,
          shot,
          style: inputs.style,
        });

        // Prompt must mention the location name and the shot action
        expect(prompt).toContain("Warehouse");
        expect(prompt).toContain("Cole draws his weapon slowly.");

        // selectConditioningRefs: location first, then characters, capped at 6
        const charRefImages: RefImage[] = inputs.characterRefs.map((r) => ({
          signedUrl: `https://cdn.example.com/${r.path}`,
          mediaType: r.mediaType,
          label: r.label,
        }));
        const locRefImage: RefImage | null = inputs.locationRef
          ? {
              signedUrl: `https://cdn.example.com/${inputs.locationRef.path}`,
              mediaType: inputs.locationRef.mediaType,
              label: inputs.locationRef.label,
            }
          : null;

        const selected = selectConditioningRefs({
          characterRefs: charRefImages,
          locationRef: locRefImage,
        });

        // Location plate comes first
        expect(selected.length).toBeGreaterThanOrEqual(1);
        expect(selected[0].label).toBe("Warehouse");

        // Character sheet is included somewhere in the list
        const cole = selected.find((r) => r.label === "DETECTIVE COLE");
        expect(cole).toBeDefined();

        // Never exceeds the cap (default 6)
        expect(selected.length).toBeLessThanOrEqual(6);
      },
    );

    // ── Assertion 3: reject the character's presence → drops from characterRefs
    it(
      "Assertion 3 — reject presence: scene_characters.status='rejected' → characterRefs no longer includes that character",
      async () => {
        // Pre-check: character appears in characterRefs (from assertion 1 state)
        const before = await loadRenderInputs(alice, sceneId);
        expect(
          before.characterRefs.some((r) => r.label === "DETECTIVE COLE"),
        ).toBe(true);

        // Reject the confirmed scene_characters tag
        const { error: rejectErr } = await alice
          .from("scene_characters")
          .update({ status: "rejected" })
          .eq("id", sceneCharId);
        expect(rejectErr).toBeNull();

        // Re-read — derived-on-read, no sync step
        const after = await loadRenderInputs(alice, sceneId);
        expect(
          after.characterRefs.some((r) => r.label === "DETECTIVE COLE"),
        ).toBe(false);
      },
    );

    // ── Assertion 4: change the scene's location → locationName updates ────────
    it(
      "Assertion 4 — location swap: pointing scene at a different set/location → locationName reflects the new location immediately",
      async () => {
        // Create a new location + set to swap to
        const { data: newLoc, error: newLocErr } = await alice
          .from("locations")
          .insert({ project_id: projectId, name: "Rooftop" })
          .select("id")
          .single();
        if (newLocErr) throw newLocErr;

        const { data: newSet, error: newSetErr } = await alice
          .from("sets")
          .insert({
            project_id: projectId,
            name: "EXT. ROOFTOP",
            location_id: newLoc.id,
          })
          .select("id")
          .single();
        if (newSetErr) throw newSetErr;

        // Pre-check: current location is Warehouse
        const before = await loadRenderInputs(alice, sceneId);
        expect(before.sceneMeta.locationName).toBe("Warehouse");

        // Update the scene's set_id to point at the new set
        const { error: updateErr } = await alice
          .from("scenes")
          .update({ set_id: newSet.id, location_slug: "ROOFTOP" })
          .eq("id", sceneId);
        expect(updateErr).toBeNull();

        // Re-read — derived-on-read, no materialisation
        const after = await loadRenderInputs(alice, sceneId);
        expect(after.sceneMeta.locationName).toBe("Rooftop");

        // Restore original set so subsequent assertions aren't affected
        const { error: restoreErr } = await alice
          .from("scenes")
          .update({ set_id: setId, location_slug: "WAREHOUSE" })
          .eq("id", sceneId);
        expect(restoreErr).toBeNull();
      },
    );

    // ── Assertion 5: renumber the scene → shots still keyed to immutable scene_id
    it(
      "Assertion 5 — immutable scene_id: renumbering scene_number does NOT affect listShots (shots key to scene_id, not the number)",
      async () => {
        // Create two shots on this scene first
        const s1 = await createShot(alice, {
          projectId,
          sceneId,
          size: "WS",
          angle: "eye",
          movement: "static",
          action: "Establishing.",
        });
        const s2 = await createShot(alice, {
          projectId,
          sceneId,
          size: "MS",
          angle: "eye",
          movement: "static",
          action: "Two-shot.",
        });

        // Confirm both shots exist
        const before = await listShots(alice, sceneId);
        expect(before.map((s) => s.id)).toContain(s1.id);
        expect(before.map((s) => s.id)).toContain(s2.id);

        // Renumber the scene (mutable display field)
        const { error: renumberErr } = await alice
          .from("scenes")
          .update({ scene_number: "99" })
          .eq("id", sceneId);
        expect(renumberErr).toBeNull();

        // listShots still returns both shots — they key to scene_id, not scene_number
        const after = await listShots(alice, sceneId);
        expect(after.map((s) => s.id)).toContain(s1.id);
        expect(after.map((s) => s.id)).toContain(s2.id);

        // Restore original scene_number
        await alice.from("scenes").update({ scene_number: "1" }).eq("id", sceneId);
      },
    );

    // ── Assertion 6: reorderShots + getSceneBoard reflects new ordinal order ───
    it(
      "Assertion 6 — reorder + board read: reorderShots reverses two shots; getSceneBoard returns them in the new ordinal order",
      async () => {
        // Create two fresh shots for this assertion
        const sA = await createShot(alice, {
          projectId,
          sceneId,
          size: "CU",
          angle: "low",
          movement: "push_in",
          action: "Close on eyes.",
        });
        const sB = await createShot(alice, {
          projectId,
          sceneId,
          size: "ECU",
          angle: "eye",
          movement: "static",
          action: "The trigger.",
        });

        // Confirm sA comes before sB initially
        const initial = await listShots(alice, sceneId);
        const idxA = initial.findIndex((s) => s.id === sA.id);
        const idxB = initial.findIndex((s) => s.id === sB.id);
        expect(idxA).toBeLessThan(idxB);

        // Swap them: sB first, sA second (relative to one another)
        // We only pass the two shots we want to reorder — other shots in the scene
        // will have their ordinals set too; pass the full ordered array for safety
        const allBefore = await listShots(alice, sceneId);
        // Build the new desired order: sB replaces sA's position and vice-versa
        const newOrder = allBefore.map((s) => {
          if (s.id === sA.id) return sB.id;
          if (s.id === sB.id) return sA.id;
          return s.id;
        });

        await reorderShots(alice, { sceneId, orderedIds: newOrder });

        // getSceneBoard: sB must now appear before sA
        const board = await getSceneBoard(alice, sceneId);
        const boardIdxA = board.shots.findIndex((s) => s.id === sA.id);
        const boardIdxB = board.shots.findIndex((s) => s.id === sB.id);
        expect(boardIdxB).toBeLessThan(boardIdxA);

        // Ordinals are consistent with position
        expect(board.shots[boardIdxB].ordinal).toBeLessThan(
          board.shots[boardIdxA].ordinal,
        );
      },
    );

    // ── Assertion 7: non-destructive re-board (Decision #7) ──────────────────
    it(
      "Assertion 7 — non-destructive: confirmed shot survives createShot appends (re-board never clobbers confirmed work)",
      async () => {
        // Create a shot and confirm it (simulating human approval)
        const confirmed = await createShot(alice, {
          projectId,
          sceneId,
          size: "WS",
          angle: "aerial",
          movement: "crane",
          action: "God's-eye view of the heist.",
          provenance: "manual",
        });
        await setShotStatus(alice, { id: confirmed.id, status: "confirmed" });

        // Re-board: append several suggested shots (simulating AI re-decompose output)
        await createShot(alice, {
          projectId,
          sceneId,
          size: "MS",
          angle: "eye",
          movement: "static",
          action: "New AI shot 1.",
          provenance: "ai",
        });
        await createShot(alice, {
          projectId,
          sceneId,
          size: "CU",
          angle: "low",
          movement: "push_in",
          action: "New AI shot 2.",
          provenance: "ai",
        });

        // The confirmed shot must still exist with status='confirmed'
        const shots = await listShots(alice, sceneId);
        const confirmedRow = shots.find((s) => s.id === confirmed.id);
        expect(confirmedRow).toBeDefined();
        expect(confirmedRow!.status).toBe("confirmed");

        // The new suggested shots also exist (re-board appended, did not clobber)
        const suggestedIds = shots
          .filter((s) => s.status === "suggested" && s.provenance === "ai")
          .map((s) => s.id);
        expect(suggestedIds.length).toBeGreaterThanOrEqual(2);
      },
    );
  },
);
