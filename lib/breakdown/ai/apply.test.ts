import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { applyBreakdownSuggestions } from "@/lib/breakdown/ai/apply";
import { listSceneTags, seedBreakdownTaxonomy, setSceneElementStatus } from "@/lib/breakdown/data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string) {
  const password = crypto.randomUUID();
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const c = createClient<Database>(url, anon, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password });
  return c;
}

async function newProject(c: SupabaseClient<Database>) {
  const { data: me } = await c.auth.getUser();
  const { data } = await c
    .from("projects")
    .insert({ title: "P", owner_id: me.user!.id })
    .select("id")
    .single();
  return data!.id as string;
}

const OUTPUT = {
  schemaVersion: 1 as const,
  items: [
    {
      kind: "element" as const,
      category: "Props",
      name: "chrome revolver",
      description: null,
      confidence: 0.9,
      quote: "chrome revolver",
      prefix: "a ",
      suffix: ".",
    },
    {
      kind: "character" as const,
      name: "MARY",
      presenceType: "speaking" as const,
      description: null,
      aliasOf: null,
      confidence: 0.95,
      quote: "Mary",
      prefix: "",
      suffix: " draws",
    },
  ],
};

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("applyBreakdownSuggestions", () => {
  let alice: SupabaseClient<Database>, project: string, sceneId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`);
    project = await newProject(alice);
    await seedBreakdownTaxonomy(alice as never, project);
    const { data: script } = await alice
      .from("scripts")
      .insert({ project_id: project, title: "S" })
      .select("id")
      .single();
    const { data: scene } = await alice
      .from("scenes")
      .insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active" })
      .select("id")
      .single();
    sceneId = scene!.id;
  });

  it("creates auto/suggested tags + is idempotent on re-run", async () => {
    await applyBreakdownSuggestions(alice as never, {
      projectId: project,
      sceneId,
      output: OUTPUT,
    });
    // re-run: no dupes
    await applyBreakdownSuggestions(alice as never, {
      projectId: project,
      sceneId,
      output: OUTPUT,
    });
    const tags = await listSceneTags(alice as never, sceneId);
    expect(tags.elements).toHaveLength(1);
    expect(tags.elements[0].provenance).toBe("auto");
    expect(tags.elements[0].status).toBe("suggested");
    expect(tags.characters).toHaveLength(1);
    expect(tags.characters[0].presence_type).toBe("speaking");
  });

  it("never demotes a confirmed tag on AI re-run", async () => {
    const before = await listSceneTags(alice as never, sceneId);
    await setSceneElementStatus(alice as never, {
      id: before.elements[0].id,
      status: "confirmed",
    });
    await applyBreakdownSuggestions(alice as never, {
      projectId: project,
      sceneId,
      output: OUTPUT,
    });
    const after = await listSceneTags(alice as never, sceneId);
    expect(after.elements[0].status).toBe("confirmed");
  });
});
