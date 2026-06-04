import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { reanchorSceneTags } from "@/lib/breakdown/reanchor";
import { tagSceneElement, listSceneTags, seedBreakdownTaxonomy, listElementCategories, createElement } from "@/lib/breakdown/data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
async function makeUser(email: string) { const password = crypto.randomUUID(); const admin = createClient(url, service, { auth: { persistSession: false } }); await admin.auth.admin.createUser({ email, password, email_confirm: true }); const c = createClient<Database>(url, anon, { auth: { persistSession: false } }); await c.auth.signInWithPassword({ email, password }); return c; }
async function newProject(c: SupabaseClient<Database>) { const { data: me } = await c.auth.getUser(); const { data } = await c.from("projects").insert({ title: "P", owner_id: me.user!.id }).select("id").single(); return data!.id as string; }

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("reanchorSceneTags", () => {
  let alice: SupabaseClient<Database>, project: string, sceneId: string, elementId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`); project = await newProject(alice);
    await seedBreakdownTaxonomy(alice as never, project);
    const { data: script } = await alice.from("scripts").insert({ project_id: project, title: "S" }).select("id").single();
    const { data: scene } = await alice.from("scenes").insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active" }).select("id").single();
    sceneId = scene!.id;
    const cats = await listElementCategories(alice as never, project);
    elementId = (await createElement(alice as never, { projectId: project, categoryId: cats[0].id, name: "chrome revolver" })).id;
    await tagSceneElement(alice as never, { projectId: project, sceneId, elementId, status: "confirmed", textAnchor: { quote: "chrome revolver", prefix: "down a ", suffix: ". Outside", hintOffset: null } });
  });
  it("preserves confirmed status and flags orphaned when text is gone", async () => {
    await reanchorSceneTags(alice as never, sceneId, "The room is empty and silent.");
    const tags = await listSceneTags(alice as never, sceneId);
    const t = tags.elements.find((e) => e.element_id === elementId)!;
    expect(t.status).toBe("confirmed");      // never silently demoted
    expect(t.anchor_state).toBe("orphaned");  // re-located → orphaned
  });
  it("re-attaches (anchored) when the quote is still present, status preserved", async () => {
    await reanchorSceneTags(alice as never, sceneId, "He sets down a chrome revolver. Outside it rains.");
    const tags = await listSceneTags(alice as never, sceneId);
    const t = tags.elements.find((e) => e.element_id === elementId)!;
    expect(t.status).toBe("confirmed");
    expect(t.anchor_state).toBe("anchored");
  });
});
