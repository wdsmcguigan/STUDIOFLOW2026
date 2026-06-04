import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { listScenesForBreakdown, seedBreakdownTaxonomy } from "@/lib/breakdown/data";

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
    .insert({ title: "Workflow Test Prod", owner_id: me.user!.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("listScenesForBreakdown", () => {
  let alice: SupabaseClient<Database>;
  let projectId: string;
  let scriptId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-breakdown-${globalThis.crypto.randomUUID()}@test.dev`);
    projectId = await newProject(alice);
    await seedBreakdownTaxonomy(alice as never, projectId);

    // Insert a script
    const { data: script, error: sErr } = await alice
      .from("scripts")
      .insert({ project_id: projectId, title: "Test Script" })
      .select("id")
      .single();
    if (sErr) throw sErr;
    scriptId = script.id;

    // Insert an active scene with a synopsis
    const { error: sceneErr } = await alice.from("scenes").insert({
      project_id: projectId,
      script_id: scriptId,
      ordinal: 0,
      status: "active",
      int_ext: "INT",
      location_slug: "DINER",
      time_of_day: "DAY",
      synopsis: "Two detectives argue over cold coffee.",
    });
    if (sceneErr) throw sceneErr;

    // Insert a second scene that is omitted — should be excluded
    const { error: deadSceneErr } = await alice.from("scenes").insert({
      project_id: projectId,
      script_id: scriptId,
      ordinal: 1,
      status: "omitted",
      synopsis: "This should not appear.",
    });
    if (deadSceneErr) throw deadSceneErr;
  });

  it("returns id+text per active scene", async () => {
    const scenes = await listScenesForBreakdown(alice as never, scriptId);
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0]).toHaveProperty("id");
    expect(scenes[0]).toHaveProperty("text");
    expect(scenes[0].text.length).toBeGreaterThan(0);
  });

  it("includes header fields (int_ext, location_slug, time_of_day) in text", async () => {
    const scenes = await listScenesForBreakdown(alice as never, scriptId);
    const first = scenes[0];
    expect(first.text).toContain("INT");
    expect(first.text).toContain("DINER");
    expect(first.text).toContain("DAY");
  });

  it("includes synopsis in text", async () => {
    const scenes = await listScenesForBreakdown(alice as never, scriptId);
    const first = scenes[0];
    expect(first.text).toContain("Two detectives");
  });

  it("excludes omitted scenes", async () => {
    const scenes = await listScenesForBreakdown(alice as never, scriptId);
    // Only the active scene should be present (not the deleted one)
    expect(scenes).toHaveLength(1);
    for (const s of scenes) {
      expect(s.text).not.toContain("This should not appear");
    }
  });
});
