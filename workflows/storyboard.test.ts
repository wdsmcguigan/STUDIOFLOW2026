/**
 * Live-DB workflow test for renderSceneWorkflow.
 *
 * Drives the WDK workflow function DIRECTLY (the `"use workflow"`/`"use step"`
 * directives are build-time markers for the WDK bundler — in vitest they are
 * inert string statements, so the orchestrator + its steps execute inline as
 * plain async functions). This is the same shape breakdown.test.ts would use to
 * exercise its workflow; here we run end-to-end against the local Supabase.
 *
 * STORYBOARD_FAKE_ENGINE=1 selects the deterministic FakeImageEngine (no network,
 * returns a 1×1 PNG), so no AI API key is needed.
 *
 * server-only is mocked because the workflow transitively imports modules that
 * guard with `import "server-only"` (engine.ts, storage/storyboards.ts); the
 * guard only fires in a real client bundle, never in this test runtime.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

vi.mock("server-only", () => ({}));

import { renderSceneWorkflow, referenceWorkflow } from "@/workflows/storyboard";
import { createJob, getJob } from "@/lib/breakdown/data";

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
    .insert({ title: "Render WF Prod", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// Service-role client for the assertions that need to read across the writes the
// workflow makes (the workflow itself uses the service client internally).
const adminDb = () =>
  createClient<Database>(url, service, { auth: { persistSession: false } });

// Minimal valid 1×1 PNG header — uploaded so signStoryboardUrl can sign the
// locked-ref paths the workflow conditions on (createSignedUrl errors if the
// object does not exist).
const STUB_PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
async function putStub(path: string) {
  const { error } = await adminDb()
    .storage.from("storyboards")
    .upload(path, STUB_PNG, { contentType: "image/png", upsert: true });
  if (error) throw error;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "renderSceneWorkflow (fake engine)",
  () => {
    let alice: SupabaseClient<Database>;
    let projectId: string;
    let sceneId: string;
    const shotIds: string[] = [];

    beforeAll(async () => {
      alice = await makeUser(`alice-renderwf-${globalThis.crypto.randomUUID()}@test.dev`);
      projectId = await newProject(alice);

      // Location + set so the scene resolves a location_id.
      const { data: loc, error: locErr } = await alice
        .from("locations")
        .insert({ project_id: projectId, name: "Warehouse" })
        .select("id")
        .single();
      if (locErr) throw locErr;
      const locationId = loc.id;

      const { data: set, error: setErr } = await alice
        .from("sets")
        .insert({ project_id: projectId, name: "INT. WAREHOUSE", location_id: locationId })
        .select("id")
        .single();
      if (setErr) throw setErr;

      // Script + scene (with header fields + set link).
      const { data: script, error: scriptErr } = await alice
        .from("scripts")
        .insert({ project_id: projectId, title: "Render Pilot" })
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
          int_ext: "INT",
          location_slug: "WAREHOUSE",
          time_of_day: "NIGHT",
          synopsis: "Hero confronts the smuggler.",
          set_id: set.id,
        })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;
      sceneId = scene.id;

      // A character, present (confirmed) in the scene.
      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: projectId, primary_name: "HERO" })
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

      // Locked primary refs for the character and the location.
      // Upload stub objects first so signStoryboardUrl can sign these paths.
      const heroRefPath = `${projectId}/references/hero.png`;
      const warehouseRefPath = `${projectId}/references/warehouse.png`;
      await putStub(heroRefPath);
      await putStub(warehouseRefPath);

      const { error: cRefErr } = await alice.from("visual_references").insert({
        project_id: projectId,
        subject_type: "character",
        character_id: characterId,
        is_primary: true,
        status: "locked",
        source: "ai",
        image_path: heroRefPath,
      });
      if (cRefErr) throw cRefErr;

      const { error: lRefErr } = await alice.from("visual_references").insert({
        project_id: projectId,
        subject_type: "location",
        location_id: locationId,
        is_primary: true,
        status: "locked",
        source: "ai",
        image_path: warehouseRefPath,
      });
      if (lRefErr) throw lRefErr;

      // Two shots for the scene.
      for (let i = 0; i < 2; i++) {
        const { data: shot, error: shotErr } = await alice
          .from("shots")
          .insert({
            project_id: projectId,
            scene_id: sceneId,
            ordinal: i,
            size: i === 0 ? "WS" : "CU",
            angle: "eye",
            movement: "static",
            action: i === 0 ? "Hero enters." : "Close on hero's eyes.",
            status: "confirmed",
            provenance: "ai",
          })
          .select("id")
          .single();
        if (shotErr) throw shotErr;
        shotIds.push(shot.id);
      }
    });

    it("renders a frame per shot, records ledger rows, job finishes succeeded", async () => {
      // Enqueue a job (under the user's RLS — proves ownership).
      const job = await createJob(alice as never, {
        projectId,
        type: "storyboard_render",
        params: { sceneId, shotIds },
        total: shotIds.length,
        createdBy: (await alice.auth.getUser()).data.user!.id,
      });

      const result = await renderSceneWorkflow({
        jobId: job.id,
        projectId,
        sceneId,
        shotIds,
      });
      expect(result.cancelled).toBe(false);
      expect(result.completed).toBe(shotIds.length);

      const db = adminDb();

      // Each shot got exactly one shot_frames row, source='ai', is_selected (first frame).
      for (const shotId of shotIds) {
        const { data: frames, error } = await db
          .from("shot_frames")
          .select("source, is_selected, status")
          .eq("shot_id", shotId);
        expect(error).toBeNull();
        expect((frames ?? []).length).toBe(1);
        expect(frames![0].source).toBe("ai");
        expect(frames![0].is_selected).toBe(true);
        expect(frames![0].status).toBe("selected");
      }

      // The job ended succeeded.
      const finished = await getJob(alice as never, job.id);
      expect(finished?.status).toBe("succeeded");

      // image_generations rows appended (kind='render'), one per shot.
      const { data: gens, error: genErr } = await db
        .from("image_generations")
        .select("kind, job_id, image_count")
        .eq("project_id", projectId)
        .eq("job_id", job.id);
      expect(genErr).toBeNull();
      expect((gens ?? []).length).toBe(shotIds.length);
      for (const g of gens ?? []) {
        expect(g.kind).toBe("render");
      }
    });
  },
);

// ---------------------------------------------------------------------------
// referenceWorkflow happy-path
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "referenceWorkflow (fake engine)",
  () => {
    let alice: SupabaseClient<Database>;
    let projectId: string;
    let characterId: string;

    beforeAll(async () => {
      alice = await makeUser(`alice-refwf-${globalThis.crypto.randomUUID()}@test.dev`);
      projectId = await newProject(alice);

      // A character for which we'll generate references.
      const { data: char, error: charErr } = await alice
        .from("characters")
        .insert({ project_id: projectId, primary_name: "VILLAIN" })
        .select("id")
        .single();
      if (charErr) throw charErr;
      characterId = char.id;
    });

    it("creates N visual_references with source='ai', status='suggested', job succeeds", async () => {
      const n = 2;
      const db = adminDb();

      const job = await createJob(alice as never, {
        projectId,
        type: "storyboard_reference",
        params: { subjectType: "character", subjectId: characterId, n },
        total: n,
        createdBy: (await alice.auth.getUser()).data.user!.id,
      });

      const result = await referenceWorkflow({
        jobId: job.id,
        projectId,
        subjectType: "character",
        subjectId: characterId,
        subjectName: "VILLAIN",
        n,
      });

      expect(result.cancelled).toBe(false);
      expect(result.completed).toBe(n);

      // N visual_references rows created with source='ai', status='suggested'.
      const { data: refs, error: refsErr } = await db
        .from("visual_references")
        .select("source, status, character_id")
        .eq("project_id", projectId)
        .eq("character_id", characterId);
      expect(refsErr).toBeNull();
      expect((refs ?? []).length).toBe(n);
      for (const r of refs ?? []) {
        expect(r.source).toBe("ai");
        expect(r.status).toBe("suggested");
        expect(r.character_id).toBe(characterId);
      }

      // Job finished succeeded.
      const finished = await getJob(alice as never, job.id);
      expect(finished?.status).toBe("succeeded");

      // One image_generations ledger row with kind='reference'.
      const { data: gens, error: gensErr } = await db
        .from("image_generations")
        .select("kind, image_count")
        .eq("project_id", projectId)
        .eq("job_id", job.id);
      expect(gensErr).toBeNull();
      expect((gens ?? []).length).toBe(1);
      expect(gens![0].kind).toBe("reference");
      expect(gens![0].image_count).toBe(n);
    });
  },
);
