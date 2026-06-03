import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { parseFountain } from "@/lib/scripts/fountain";
import { reconcile } from "@/lib/scripts/reconcile";
import { fuzzyMatcher } from "@/lib/scripts/reconcile";

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
    // Globally-unique emails (randomUUID, not Date.now()) so this file's users
    // never collide with another integration file's users when Vitest runs test
    // files in parallel workers (a same-millisecond Date.now() would duplicate).
    alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@test.dev`);
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

  /** Seed a script with 2 scenes (DINER unchanged target, PARKING LOT removal target). */
  async function seedTwoSceneScript(title: string) {
    const v1 = `INT. DINER - DAY

Mary sits alone.

EXT. PARKING LOT - NIGHT

A car idles.
`;
    const { data: script } = await alice
      .from("scripts")
      .insert({ project_id: aliceProject, title })
      .select("id")
      .single();
    const scriptId = script!.id as string;
    const { data: me } = await alice.auth.getUser();
    await alice.from("script_versions").insert({
      script_id: scriptId, label: "v1", source_format: "fountain", raw_source: v1, created_by: me.user!.id,
    });
    const firstRows = parseFountain(v1).map((p) => ({
      project_id: aliceProject, script_id: scriptId, ordinal: p.ordinal,
      scene_number: p.sceneNumber, int_ext: p.intExt, location_slug: p.locationSlug,
      time_of_day: p.timeOfDay, synopsis: p.synopsis, page_eighths: p.pageEighths, status: "active" as const,
    }));
    const { data: firstScenes } = await alice.from("scenes").insert(firstRows).select("id, location_slug, ordinal");
    const dinerId = firstScenes!.find((s) => s.location_slug === "DINER")!.id;
    return { scriptId, dinerId };
  }

  // Re-import: DINER unchanged, PARKING LOT removed, a new ROOFTOP scene added.
  const V2 = `INT. DINER - DAY

Mary sits alone.

INT. ROOFTOP - NIGHT

Wind howls.
`;

  it("staging a re-import snapshots the version + diff but mutates NO scenes (gate)", async () => {
    const { scriptId } = await seedTwoSceneScript("StageNoMutateTest");

    // Snapshot the live scene set before staging.
    const before = await alice
      .from("scenes")
      .select("id, location_slug, status")
      .eq("script_id", scriptId)
      .order("ordinal", { ascending: true });

    // STAGE: creates the version row + computes the diff, but writes no scenes.
    const staged = await stageReimportForTest(alice, {
      projectId: aliceProject,
      scriptId,
      rawSource: V2,
      parsed: parseFountain(V2),
    });
    expect(staged.versionId).toBeDefined();
    expect(staged.diff.length).toBeGreaterThan(0);

    // The live scene set is byte-for-byte unchanged: no new ROOFTOP, no OMITTED.
    const after = await alice
      .from("scenes")
      .select("id, location_slug, status")
      .eq("script_id", scriptId)
      .order("ordinal", { ascending: true });
    expect(after.data).toEqual(before.data);
    expect((after.data ?? []).some((s) => s.location_slug === "ROOFTOP")).toBe(false);
    expect((after.data ?? []).every((s) => s.status === "active")).toBe(true);
  });

  it("confirm (apply) preserves matched scene ids, marks removed OMITTED, and adds new scenes", async () => {
    const { scriptId, dinerId } = await seedTwoSceneScript("ReimportTest");

    // STAGE first (snapshot the version + diff; no mutation yet).
    const staged = await stageReimportForTest(alice, {
      projectId: aliceProject,
      scriptId,
      rawSource: V2,
      parsed: parseFountain(V2),
    });

    // CONFIRM → APPLY the staged version (re-reads raw_source, re-reconciles, writes).
    const result = await applyReconciledImportForTest(alice, {
      projectId: aliceProject,
      scriptId,
      scriptVersionId: staged.versionId,
    });

    // DINER kept its id.
    expect(result.matchedSceneIds).toContain(dinerId);
    // PARKING LOT is OMITTED, not deleted.
    const { data: parking } = await alice
      .from("scenes")
      .select("status, location_slug")
      .eq("script_id", scriptId)
      .eq("location_slug", "PARKING LOT")
      .single();
    expect(parking!.status).toBe("omitted");
    // ROOFTOP added as active.
    const { data: rooftop } = await alice
      .from("scenes")
      .select("status")
      .eq("script_id", scriptId)
      .eq("location_slug", "ROOFTOP")
      .single();
    expect(rooftop!.status).toBe("active");
    // A scene_source was written for the matched scene against the staged version.
    const { data: src } = await alice
      .from("scene_sources")
      .select("scene_id")
      .eq("script_version_id", staged.versionId)
      .eq("scene_id", dinerId);
    expect((src ?? []).length).toBe(1);

    // touch the imported symbols so lint doesn't flag them as unused in this test
    void reconcile; void fuzzyMatcher;
  });

  it("refuses to apply the same staged version twice (idempotency gate)", async () => {
    const { scriptId } = await seedTwoSceneScript("DoubleApplyTest");
    const staged = await stageReimportForTest(alice, {
      projectId: aliceProject,
      scriptId,
      rawSource: V2,
      parsed: parseFountain(V2),
    });

    // First apply succeeds.
    await applyReconciledImportForTest(alice, {
      projectId: aliceProject,
      scriptId,
      scriptVersionId: staged.versionId,
    });

    // Second apply of the SAME staged version is rejected (would otherwise
    // duplicate the new scene and collide on the scene_sources PK).
    await expect(
      applyReconciledImportForTest(alice, {
        projectId: aliceProject,
        scriptId,
        scriptVersionId: staged.versionId,
      }),
    ).rejects.toThrow(/already been applied/i);

    // And the scene set was not duplicated: exactly one active ROOFTOP.
    const { data: rooftops } = await alice
      .from("scenes")
      .select("id")
      .eq("script_id", scriptId)
      .eq("location_slug", "ROOFTOP")
      .eq("status", "active");
    expect((rooftops ?? []).length).toBe(1);
  });

  it("seeds the standard revision set with one active (White) and flags changed scenes on re-import", async () => {
    const { seedRevisions, listRevisions } = await import("@/lib/scripts/data");

    await seedRevisions(alice as unknown as never, aliceProject);
    const revisions = await listRevisions(alice as unknown as never, aliceProject);
    expect(revisions.map((r) => r.name)).toEqual([
      "White", "Blue", "Pink", "Yellow", "Green", "Goldenrod", "Buff", "Salmon", "Cherry", "Tan",
    ]);
    const active = revisions.filter((r) => r.active);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("White");

    // After a re-import, changed scenes get a scene_revision_changes row under the active set.
    const v1 = `INT. KITCHEN - DAY\n\nEggs fry.\n`;
    const { data: script } = await alice
      .from("scripts").insert({ project_id: aliceProject, title: "RevTest" }).select("id").single();
    const scriptId = script!.id as string;
    const { data: me } = await alice.auth.getUser();
    await alice.from("script_versions").insert({
      script_id: scriptId, label: "v1", source_format: "fountain", raw_source: v1, created_by: me.user!.id,
    });
    const rows = parseFountain(v1).map((p) => ({
      project_id: aliceProject, script_id: scriptId, ordinal: p.ordinal, scene_number: p.sceneNumber,
      int_ext: p.intExt, location_slug: p.locationSlug, time_of_day: p.timeOfDay, synopsis: p.synopsis,
      page_eighths: p.pageEighths, status: "active" as const,
    }));
    await alice.from("scenes").insert(rows);

    const v2 = `INT. KITCHEN - DAY\n\nEggs burn badly.\n`;
    const { stageReimport, reconcileAndApply } = await import("@/lib/scripts/data");
    const staged = await stageReimport(alice as unknown as never, {
      projectId: aliceProject, scriptId, rawSource: v2, parsed: parseFountain(v2),
    });
    const res = await reconcileAndApply(alice as unknown as never, {
      projectId: aliceProject, scriptId, scriptVersionId: staged.versionId,
    });
    const modifiedId = res.matchedSceneIds[0];

    const { data: changes } = await alice
      .from("scene_revision_changes")
      .select("change_kind, revision_id")
      .eq("scene_id", modifiedId);
    expect(changes!.length).toBeGreaterThanOrEqual(1);
    expect(changes!.some((c) => c.change_kind === "modified")).toBe(true);
  });

  it("in-app edit updates the scene and flags it changed in the active revision set", async () => {
    const { seedRevisions, updateSceneInApp } = await import("@/lib/scripts/data");
    await seedRevisions(alice as unknown as never, aliceProject);

    const src = `INT. BAR - NIGHT\n\nNeon hums.\n`;
    const { data: script } = await alice
      .from("scripts").insert({ project_id: aliceProject, title: "EditTest" }).select("id").single();
    const scriptId = script!.id as string;
    const { data: scene } = await alice.from("scenes").insert({
      project_id: aliceProject, script_id: scriptId, ordinal: 0, scene_number: "1",
      int_ext: "INT", location_slug: "BAR", time_of_day: "NIGHT", synopsis: "Quiet.",
      page_eighths: 8, status: "active",
    }).select("id").single();
    void src;

    await updateSceneInApp(alice as unknown as never, {
      projectId: aliceProject,
      sceneId: scene!.id,
      patch: { synopsis: "Loud and crowded.", time_of_day: "DAY" },
    });

    const { data: updated } = await alice
      .from("scenes").select("synopsis, time_of_day").eq("id", scene!.id).single();
    expect(updated!.synopsis).toBe("Loud and crowded.");
    expect(updated!.time_of_day).toBe("DAY");

    const { data: changes } = await alice
      .from("scene_revision_changes").select("change_kind").eq("scene_id", scene!.id);
    expect(changes!.some((c) => c.change_kind === "modified")).toBe(true);
  });

  it("blocks a cross-project FK escape on scene_revision_changes (migration 0004 / review I1)", async () => {
    const { seedRevisions, listRevisions } = await import("@/lib/scripts/data");
    await seedRevisions(alice as unknown as never, aliceProject); // idempotent
    const aliceRevs = await listRevisions(alice as unknown as never, aliceProject);
    const aliceRevisionId = aliceRevs[0].id;

    // Bob's own project + scene.
    const bobProject = await newProject(bob);
    const { data: bobScript } = await bob
      .from("scripts").insert({ project_id: bobProject, title: "Bob Rev" }).select("id").single();
    const { data: bobScene } = await bob
      .from("scenes")
      .insert({ project_id: bobProject, script_id: bobScript!.id, ordinal: 0, status: "active" })
      .select("id").single();

    // Bob's scene + ALICE's revision (foreign) -> blocked by 0004's two-FK with-check.
    const { error } = await bob.from("scene_revision_changes").insert({
      scene_id: bobScene!.id,
      revision_id: aliceRevisionId,
      change_kind: "modified",
    });
    expect(error).not.toBeNull();
  });

  it("a scene edited in-app AND changed in a re-imported draft is surfaced as a conflict, FD-wins, in-app kept in history", async () => {
    const { seedRevisions, updateSceneInApp, stageReimport, reconcileAndApply } = await import("@/lib/scripts/data");
    await seedRevisions(alice as unknown as never, aliceProject);

    const v1 = `INT. LAB - DAY\n\nBeakers bubble.\n`;
    const { data: script } = await alice
      .from("scripts").insert({ project_id: aliceProject, title: "ConflictTest" }).select("id").single();
    const scriptId = script!.id as string;
    const { data: me } = await alice.auth.getUser();
    await alice.from("script_versions").insert({
      script_id: scriptId, label: "v1", source_format: "fountain", raw_source: v1, created_by: me.user!.id,
    });
    const { data: scenes } = await alice.from("scenes").insert(
      parseFountain(v1).map((p) => ({
        project_id: aliceProject, script_id: scriptId, ordinal: p.ordinal, scene_number: p.sceneNumber,
        int_ext: p.intExt, location_slug: p.locationSlug, time_of_day: p.timeOfDay, synopsis: p.synopsis,
        page_eighths: p.pageEighths, status: "active" as const,
      })),
    ).select("id, location_slug");
    const labId = scenes!.find((s) => s.location_slug === "LAB")!.id;

    // In-app edit on the LAB scene.
    await updateSceneInApp(alice as unknown as never, {
      projectId: aliceProject, sceneId: labId, patch: { synopsis: "In-app: the experiment fails." },
    });

    // Re-import a draft that ALSO changes the LAB scene body: stage, then confirm/apply.
    const v2 = `INT. LAB - DAY\n\nBeakers shatter violently.\n`;
    const staged = await stageReimport(alice as unknown as never, {
      projectId: aliceProject, scriptId, rawSource: v2, parsed: parseFountain(v2),
    });
    const res = await reconcileAndApply(alice as unknown as never, {
      projectId: aliceProject, scriptId, scriptVersionId: staged.versionId,
    });

    const conflict = res.diff.find((d) => d.sceneId === labId);
    expect(conflict?.classification).toBe("conflict");

    // FD-wins: the live scene now reflects the imported draft, overwriting the
    // in-app edit ("In-app: the experiment fails.") with the v2-derived synopsis.
    const { data: live } = await alice
      .from("scenes").select("synopsis").eq("id", labId).single();
    expect(live!.synopsis).toBe("Beakers shatter violently.");
    expect(live!.synopsis).not.toBe("In-app: the experiment fails.");

    // …and the in-app edit is retained in history (scene_revision_changes row still present).
    const { data: history } = await alice
      .from("scene_revision_changes").select("scene_id").eq("scene_id", labId);
    expect(history!.length).toBeGreaterThanOrEqual(1);
  });
});

async function stageReimportForTest(
  client: SupabaseClient<Database>,
  args: { projectId: string; scriptId: string; rawSource: string; parsed: ReturnType<typeof parseFountain> },
) {
  const { stageReimport } = await import("@/lib/scripts/data");
  return stageReimport(client, args);
}

async function applyReconciledImportForTest(
  client: SupabaseClient<Database>,
  args: { projectId: string; scriptId: string; scriptVersionId: string },
) {
  // Mirror of applyReconciledImport using the test client (same logic, injected client).
  const { reconcileAndApply } = await import("@/lib/scripts/data");
  return reconcileAndApply(client, args);
}
