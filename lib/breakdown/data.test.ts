import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

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
