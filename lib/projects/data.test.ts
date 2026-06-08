import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  listProjects,
  archiveProject,
  unarchiveProject,
  softDeleteProject,
  restoreProject,
  purgeProject,
  updateProject,
} from "@/lib/projects/data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string) {
  const password = globalThis.crypto.randomUUID();
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const client = createClient(url, anon, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return client;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("projects RLS", () => {
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;

  // Users are intentionally not cleaned up; this test targets a local, disposable Supabase instance.
  beforeAll(async () => {
    alice = await makeUser(`alice-${Date.now()}@test.dev`);
    bob = await makeUser(`bob-${Date.now()}@test.dev`);
  });

  it("a user can create and read their own project", async () => {
    const { data: me } = await alice.auth.getUser();
    const { error } = await alice
      .from("projects")
      .insert({ title: "Alice Film", owner_id: me.user!.id });
    expect(error).toBeNull();

    const { data } = await alice.from("projects").select("*");
    expect(data?.some((p) => p.title === "Alice Film")).toBe(true);
  });

  it("a user cannot see another user's project", async () => {
    const { data } = await bob.from("projects").select("*");
    expect(data?.some((p) => p.title === "Alice Film")).toBe(false);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("project lifecycle", () => {
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;
  let aliceId: string;

  beforeAll(async () => {
    alice = await makeUser(`life-alice-${Date.now()}@test.dev`);
    bob = await makeUser(`life-bob-${Date.now()}@test.dev`);
    const { data } = await alice.auth.getUser();
    aliceId = data.user!.id;
  });

  async function newProject(title: string, status = "production"): Promise<string> {
    const { data, error } = await alice
      .from("projects")
      .insert({ title, status, owner_id: aliceId })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  it("archive sets archived_at and leaves status untouched", async () => {
    const id = await newProject("Archive Me", "post");
    await archiveProject(alice as never, id);

    const { data } = await alice.from("projects").select("*").eq("id", id).single();
    expect(data?.archived_at).not.toBeNull();
    expect(data?.status).toBe("post"); // workflow stage preserved through archive

    await unarchiveProject(alice as never, id);
    const { data: after } = await alice
      .from("projects")
      .select("archived_at")
      .eq("id", id)
      .single();
    expect(after?.archived_at).toBeNull();
  });

  it("soft-delete sets deleted_at; restore clears it", async () => {
    const id = await newProject("Trash Me");
    await softDeleteProject(alice as never, id);
    const { data } = await alice.from("projects").select("deleted_at").eq("id", id).single();
    expect(data?.deleted_at).not.toBeNull();

    await restoreProject(alice as never, id);
    const { data: after } = await alice
      .from("projects")
      .select("deleted_at")
      .eq("id", id)
      .single();
    expect(after?.deleted_at).toBeNull();
  });

  it("rename updates the title", async () => {
    const id = await newProject("Old Name");
    const renamed = await updateProject(alice as never, id, { title: "New Name" });
    expect(renamed.title).toBe("New Name");
  });

  it("purge removes the project and cascades to child rows", async () => {
    const id = await newProject("Purge Me");
    // A project-scoped child row (locations cascades on project_id).
    const { error: locErr } = await alice
      .from("locations")
      .insert({ project_id: id, name: "Stage A" });
    expect(locErr).toBeNull();

    await purgeProject(alice as never, id);

    const { data: gone } = await alice.from("projects").select("id").eq("id", id).maybeSingle();
    expect(gone).toBeNull();
    const { data: child } = await alice
      .from("locations")
      .select("id")
      .eq("project_id", id);
    expect(child?.length ?? 0).toBe(0); // CASCADE removed the child
  });

  it("listProjects scopes active / archived / trashed correctly", async () => {
    const activeId = await newProject("Scope Active");
    const archId = await newProject("Scope Archived");
    const trashId = await newProject("Scope Trashed");
    await archiveProject(alice as never, archId);
    await softDeleteProject(alice as never, trashId);

    const active = await listProjects(alice as never, "active");
    const archived = await listProjects(alice as never, "archived");
    const trashed = await listProjects(alice as never, "trashed");

    expect(active.some((p) => p.id === activeId)).toBe(true);
    expect(active.some((p) => p.id === archId)).toBe(false);
    expect(active.some((p) => p.id === trashId)).toBe(false);

    expect(archived.some((p) => p.id === archId)).toBe(true);
    expect(archived.some((p) => p.id === trashId)).toBe(false);

    expect(trashed.some((p) => p.id === trashId)).toBe(true);
    expect(trashed.some((p) => p.id === archId)).toBe(false);
  });

  it("RLS: a non-owner cannot archive, trash, or purge another user's project", async () => {
    const id = await newProject("Bob Keep Out");

    // Under RLS, Bob's UPDATE/DELETE match zero rows — no error, but no effect.
    await archiveProject(bob as never, id);
    await softDeleteProject(bob as never, id);
    await purgeProject(bob as never, id);

    const { data } = await alice.from("projects").select("*").eq("id", id).single();
    expect(data?.archived_at).toBeNull();
    expect(data?.deleted_at).toBeNull();
    expect(data?.id).toBe(id); // still exists — purge by Bob was a no-op
  });
});
