import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { parseFountain } from "@/lib/scripts/fountain";

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

const SCRIPT = `INT. DINER - DAY

Mary sits alone.

EXT. PARKING LOT - NIGHT

A car idles.
`;

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("scripts/scenes data layer + RLS", () => {
  let alice: SupabaseClient<Database>;
  let bob: SupabaseClient<Database>;
  let aliceProject: string;
  let createdScriptId: string;
  let aliceVersionId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-${Date.now()}@test.dev`);
    bob = await makeUser(`bob-${Date.now()}@test.dev`);
    aliceProject = await newProject(alice);
  });

  it("first import creates a script, version snapshot, and all-new scenes", async () => {
    const parsed = parseFountain(SCRIPT);
    const { data: me } = await alice.auth.getUser();

    const { data: script } = await alice
      .from("scripts")
      .insert({ project_id: aliceProject, title: "Pilot" })
      .select("id")
      .single();
    createdScriptId = script!.id;

    const { data: version } = await alice
      .from("script_versions")
      .insert({
        script_id: createdScriptId,
        label: "v1",
        source_format: "fountain",
        raw_source: SCRIPT,
        created_by: me.user!.id,
      })
      .select("id")
      .single();

    aliceVersionId = version!.id;

    const rows = parsed.map((p) => ({
      project_id: aliceProject,
      script_id: createdScriptId,
      ordinal: p.ordinal,
      scene_number: p.sceneNumber,
      int_ext: p.intExt,
      location_slug: p.locationSlug,
      time_of_day: p.timeOfDay,
      synopsis: p.synopsis,
      page_eighths: p.pageEighths,
      status: "active" as const,
    }));
    const { data: scenes, error } = await alice.from("scenes").insert(rows).select("*");
    expect(error).toBeNull();
    expect(scenes).toHaveLength(2);
    expect(scenes!.map((s) => s.int_ext).sort()).toEqual(["EXT", "INT"]);
    expect(version!.id).toBeDefined();
  });

  it("a second user cannot see the first user's scenes", async () => {
    const { data } = await bob.from("scenes").select("*").eq("script_id", createdScriptId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a second user cannot see the first user's script", async () => {
    const { data } = await bob.from("scripts").select("*").eq("id", createdScriptId);
    expect(data ?? []).toHaveLength(0);
  });

  it("blocks a cross-project FK escape: cannot link your scene to another user's version (migration 0004 / review I1)", async () => {
    // Guard: ensure the foreign version id is actually populated by the first-import
    // test above. Without this, a missing aliceVersionId would make the insert fail
    // on the FK constraint rather than RLS — passing this test for the wrong reason.
    expect(aliceVersionId).toBeTruthy();

    // Bob builds his own project + script + scene.
    const bobProject = await newProject(bob);
    const { data: bobScript } = await bob
      .from("scripts").insert({ project_id: bobProject, title: "Bob's Pilot" })
      .select("id").single();
    const { data: bobScene } = await bob
      .from("scenes")
      .insert({ project_id: bobProject, script_id: bobScript!.id, ordinal: 0, status: "active" })
      .select("id").single();

    // Attempt to attach Bob's own scene to ALICE's script version (a foreign project).
    // 0003 only checked the scene side of scene_sources; 0004 also requires the
    // referenced script_version to belong to the caller's project.
    const { error } = await bob.from("scene_sources").insert({
      scene_id: bobScene!.id,
      script_version_id: aliceVersionId,
      content_hash: "deadbeef",
      text_anchor_start: 0,
      text_anchor_end: 1,
    });
    expect(error).not.toBeNull(); // RLS with-check denies the foreign version FK
  });
});
