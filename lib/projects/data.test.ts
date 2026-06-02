import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string) {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
  });
  const client = createClient(url, anon, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: "password123" });
  return client;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("projects RLS", () => {
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;

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
