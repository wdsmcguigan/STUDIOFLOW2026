import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  seedBreakdownTaxonomy,
  listElementCategories,
  listDepartments,
  createElement,
  listElements,
  createCharacter,
  listCharacters,
  tagSceneElement,
  tagSceneCharacter,
  listSceneTags,
  listConfirmedSceneTags,
  setSceneElementStatus,
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
  const { data, error } = await client.from("projects").insert({ title: "Test Prod", owner_id: me.user!.id }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("breakdown graph RLS (0005)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>, aliceProject: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@test.dev`);
    aliceProject = await newProject(alice);
  });
  it("a user can create + read their own character; another user cannot see it", async () => {
    const { data: c, error } = await alice.from("characters").insert({ project_id: aliceProject, primary_name: "MARY" }).select("id").single();
    expect(error).toBeNull();
    const { data: bobView } = await bob.from("characters").select("*").eq("id", c!.id);
    expect(bobView ?? []).toHaveLength(0);
  });
  it("an element requires a category in the same project", async () => {
    const { data: dept } = await alice.from("departments").insert({ project_id: aliceProject, name: "Props" }).select("id").single();
    const { data: cat } = await alice.from("element_categories").insert({ project_id: aliceProject, name: "Props", department_id: dept!.id }).select("id").single();
    const { error } = await alice.from("elements").insert({ project_id: aliceProject, category_id: cat!.id, name: "chrome revolver" });
    expect(error).toBeNull();
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("breakdown data layer — catalog/people", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => { alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`); project = await newProject(alice); });

  it("seedBreakdownTaxonomy is idempotent and maps categories to departments", async () => {
    await seedBreakdownTaxonomy(alice as never, project);
    await seedBreakdownTaxonomy(alice as never, project); // second call must not duplicate
    const cats = await listElementCategories(alice as never, project);
    const depts = await listDepartments(alice as never, project);
    expect(cats.length).toBeGreaterThan(10);
    expect(depts.length).toBeGreaterThan(5);
    const props = cats.find((c) => c.name === "Props");
    expect(props?.department_id).toBeTruthy();
  });
  it("createElement validates + returns a typed row", async () => {
    const cats = await listElementCategories(alice as never, project);
    const el = await createElement(alice as never, { projectId: project, categoryId: cats[0].id, name: "chrome revolver" });
    expect(el.name).toBe("chrome revolver");
    expect((await listElements(alice as never, project)).some((e) => e.id === el.id)).toBe(true);
  });
  it("createCharacter stores aliases", async () => {
    const c = await createCharacter(alice as never, { projectId: project, primaryName: "MARY", aliases: ["MARY ANN"] });
    expect(c.aliases).toContain("MARY ANN");
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("tagging + downstream gate", () => {
  let alice: SupabaseClient<Database>, project: string, sceneId: string, elementId: string, characterId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`);
    project = await newProject(alice);
    await seedBreakdownTaxonomy(alice as never, project);
    const { data: script } = await alice.from("scripts").insert({ project_id: project, title: "S" }).select("id").single();
    const { data: scene } = await alice.from("scenes").insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active" }).select("id").single();
    sceneId = scene!.id;
    const cats = await listElementCategories(alice as never, project);
    elementId = (await createElement(alice as never, { projectId: project, categoryId: cats[0].id, name: "gun" })).id;
    characterId = (await createCharacter(alice as never, { projectId: project, primaryName: "MARY" })).id;
  });
  it("manual element tag is confirmed + anchored", async () => {
    const t = await tagSceneElement(alice as never, { projectId: project, sceneId, elementId, textAnchor: { quote: "gun", prefix: "", suffix: "", hintOffset: null } });
    expect(t.status).toBe("confirmed"); expect(t.provenance).toBe("manual"); expect(t.anchor_state).toBe("anchored");
  });
  it("character tag carries presence_type", async () => {
    const t = await tagSceneCharacter(alice as never, { projectId: project, sceneId, characterId, presenceType: "speaking" });
    expect(t.presence_type).toBe("speaking");
  });
  it("downstream gate returns only confirmed", async () => {
    const cats = await listElementCategories(alice as never, project);
    const sugEl = await createElement(alice as never, { projectId: project, categoryId: cats[0].id, name: "knife" });
    await tagSceneElement(alice as never, { projectId: project, sceneId, elementId: sugEl.id, provenance: "auto", status: "suggested", confidence: 0.7 });
    const confirmed = await listConfirmedSceneTags(alice as never, sceneId);
    expect(confirmed.elements.some((e) => e.element_id === sugEl.id)).toBe(false);
    expect(confirmed.elements.some((e) => e.element_id === elementId)).toBe(true);
  });
  it("setSceneElementStatus flips suggested → confirmed", async () => {
    const all = await listSceneTags(alice as never, sceneId);
    const sug = all.elements.find((e) => e.status === "suggested")!;
    const updated = await setSceneElementStatus(alice as never, { id: sug.id, status: "confirmed" });
    expect(updated.status).toBe("confirmed");
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("scene-link two-FK escape (0006)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
  let aliceElementId: string, aliceCharacterId: string, bobSceneId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-${crypto.randomUUID()}@test.dev`);
    const aliceProject = await newProject(alice);
    await seedBreakdownTaxonomy(alice as never, aliceProject);
    const cats = await listElementCategories(alice as never, aliceProject);
    const el = await createElement(alice as never, { projectId: aliceProject, categoryId: cats[0].id, name: "alice gun" });
    aliceElementId = el.id;
    const aliceChar = await createCharacter(alice as never, { projectId: aliceProject, primaryName: "ALICE_ONLY" });
    aliceCharacterId = aliceChar.id;
    const bobProject = await newProject(bob);
    const { data: bobScript } = await bob.from("scripts").insert({ project_id: bobProject, title: "Bob" }).select("id").single();
    const { data: bobScene } = await bob.from("scenes").insert({ project_id: bobProject, script_id: bobScript!.id, ordinal: 0, status: "active" }).select("id").single();
    bobSceneId = bobScene!.id;
  });
  it("blocks linking your own scene to another user's element", async () => {
    expect(aliceElementId).toBeTruthy();
    const { error } = await bob.from("scene_elements").insert({ scene_id: bobSceneId, element_id: aliceElementId });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501"); // RLS with-check denied it (not a 23503 FK-constraint error)
  });
  it("blocks linking your own scene to another user's character", async () => {
    expect(aliceCharacterId).toBeTruthy();
    const { error } = await bob.from("scene_characters").insert({ scene_id: bobSceneId, character_id: aliceCharacterId, presence_type: "speaking" });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});
