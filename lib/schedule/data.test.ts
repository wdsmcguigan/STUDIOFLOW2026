import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  createLocation,
  listLocations,
  createSet,
  listSets,
  getOrCreateDefaultSegment,
  splitSegment,
  ensureSetForSlug,
  createShootDay,
  listShootDays,
  createStrip,
  listStrips,
  reorderStrips,
  deleteStrip,
  setCastOverride,
  listCastOverrides,
  loadScheduleGraph,
  getStripboard,
  getConflicts,
  getDOOD,
  getCalendar,
} from "@/lib/schedule/data";

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

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("schedule: locations/sets RLS (0009)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>, project: string;
  beforeAll(async () => { alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@t.dev`); bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@t.dev`); project = await newProject(alice); });
  it("owner creates a location+set; another user can't see them", async () => {
    const { data: loc } = await alice.from("locations").insert({ project_id: project, name: "Diner Bldg", timezone: "America/New_York" }).select("id").single();
    const { data: set } = await alice.from("sets").insert({ project_id: project, location_id: loc!.id, name: "DINER" }).select("id").single();
    expect((await bob.from("sets").select("*").eq("id", set!.id)).data ?? []).toHaveLength(0);
  });
  it("blocks pointing your scene's set_id at another user's set (hardened scenes UPDATE)", async () => {
    const { data: aliceSet } = await alice.from("sets").insert({ project_id: project, name: "ALICE SET" }).select("id").single();
    const bobProject = await newProject(bob);
    const { data: bobScript } = await bob.from("scripts").insert({ project_id: bobProject, title: "B" }).select("id").single();
    const { data: bobScene } = await bob.from("scenes").insert({ project_id: bobProject, script_id: bobScript!.id, ordinal: 0, status: "active" }).select("id").single();
    const { error } = await bob.from("scenes").update({ set_id: aliceSet!.id }).eq("id", bobScene!.id);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("scene_segments RLS (0010)", () => {
  it("a segment requires a scene in the caller's project", async () => {
    const alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@t.dev`); const project = await newProject(alice);
    const { data: script } = await alice.from("scripts").insert({ project_id: project, title: "S" }).select("id").single();
    const { data: scene } = await alice.from("scenes").insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active", page_eighths: 8 }).select("id").single();
    const { data: seg, error } = await alice.from("scene_segments").insert({ project_id: project, scene_id: scene!.id, ordinal: 0, page_eighths: 8 }).select("id").single();
    expect(error).toBeNull(); expect(seg!.id).toBeTruthy();
  });

  it("blocks inserting a segment whose scene_id belongs to another user's project", async () => {
    // Alice seeds a scene in her project
    const alice = await makeUser(`alice-seg-${globalThis.crypto.randomUUID()}@t.dev`);
    const aliceProject = await newProject(alice);
    const { data: aliceScript } = await alice.from("scripts").insert({ project_id: aliceProject, title: "A" }).select("id").single();
    const { data: aliceScene } = await alice.from("scenes").insert({ project_id: aliceProject, script_id: aliceScript!.id, ordinal: 0, status: "active", page_eighths: 8 }).select("id").single();

    // Bob has his own project but tries to insert a segment pointing at Alice's scene
    const bob = await makeUser(`bob-seg-${globalThis.crypto.randomUUID()}@t.dev`);
    const bobProject = await newProject(bob);
    const { error } = await bob.from("scene_segments").insert({ project_id: bobProject, scene_id: aliceScene!.id, ordinal: 0, page_eighths: 8 }).select("id").single();
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("shoot_days/strips RLS (0011)", () => {
  it("a strip cannot reference another user's scene_segment (two-FK with-check)", async () => {
    const alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@t.dev`);
    const bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@t.dev`);
    const aProject = await newProject(alice);
    const { data: aScript } = await alice.from("scripts").insert({ project_id: aProject, title: "A" }).select("id").single();
    const { data: aScene } = await alice.from("scenes").insert({ project_id: aProject, script_id: aScript!.id, ordinal: 0, status: "active", page_eighths: 8 }).select("id").single();
    const { data: aSeg } = await alice.from("scene_segments").insert({ project_id: aProject, scene_id: aScene!.id, ordinal: 0, page_eighths: 8 }).select("id").single();
    const bProject = await newProject(bob);
    const { data: bDay } = await bob.from("shoot_days").insert({ project_id: bProject, ordinal: 0 }).select("id").single();
    const { error } = await bob.from("strips").insert({ project_id: bProject, shoot_day_id: bDay!.id, ordinal: 0, type: "scene", scene_segment_id: aSeg!.id });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
  it("owner can create a day_break strip (no scene_segment) and a scene strip on their own day", async () => {
    const alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@t.dev`);
    const project = await newProject(alice);
    const { data: day } = await alice.from("shoot_days").insert({ project_id: project, ordinal: 0 }).select("id").single();
    const { error: dbErr } = await alice.from("strips").insert({ project_id: project, shoot_day_id: day!.id, ordinal: 0, type: "day_break" });
    expect(dbErr).toBeNull();
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("cast_day_statuses RLS (0012)", () => {
  it("owner upserts an override for their own person; another user can't see it", async () => {
    const alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@t.dev`);
    const bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@t.dev`);
    const project = await newProject(alice);
    const { data: person } = await alice.from("people").insert({ project_id: project, name: "Jane Doe" }).select("id").single();
    const { data: row, error } = await alice.from("cast_day_statuses").insert({ project_id: project, person_id: person!.id, date: "2026-07-01", status: "hold" }).select("id").single();
    expect(error).toBeNull();
    expect((await bob.from("cast_day_statuses").select("*").eq("id", row!.id)).data ?? []).toHaveLength(0);
  });
  it("an override cannot reference another user's person (two-FK with-check)", async () => {
    const alice = await makeUser(`alice-${globalThis.crypto.randomUUID()}@t.dev`);
    const bob = await makeUser(`bob-${globalThis.crypto.randomUUID()}@t.dev`);
    const aProject = await newProject(alice);
    const { data: aPerson } = await alice.from("people").insert({ project_id: aProject, name: "Alice Person" }).select("id").single();
    const bProject = await newProject(bob);
    const { error } = await bob.from("cast_day_statuses").insert({ project_id: bProject, person_id: aPerson!.id, date: "2026-07-01", status: "hold" });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});

// ---------------------------------------------------------------------------
// Data-layer function tests (Task 6)
// ---------------------------------------------------------------------------

/** Seed a script + scene for a project. Returns { scriptId, sceneId }. */
async function seedScene(
  client: SupabaseClient<Database>,
  projectId: string,
  opts?: { page_eighths?: number },
) {
  const { data: script, error: se } = await client
    .from("scripts")
    .insert({ project_id: projectId, title: "Test Script" })
    .select("id")
    .single();
  if (se) throw se;
  const { data: scene, error: sce } = await client
    .from("scenes")
    .insert({
      project_id: projectId,
      script_id: script!.id,
      ordinal: 0,
      status: "active",
      page_eighths: opts?.page_eighths ?? null,
    })
    .select("id")
    .single();
  if (sce) throw sce;
  return { scriptId: script!.id, sceneId: scene!.id };
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("createLocation / listLocations (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-loc-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
  });

  it("round-trips a location", async () => {
    const loc = await createLocation(alice, {
      projectId: project,
      name: "Pinewood Studios",
      address: "Pinewood Rd, UK",
      timezone: "Europe/London",
    });
    expect(loc.id).toBeTruthy();
    expect(loc.name).toBe("Pinewood Studios");
    expect(loc.timezone).toBe("Europe/London");

    const all = await listLocations(alice, project);
    expect(all.some((l) => l.id === loc.id)).toBe(true);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("createSet / listSets (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-set-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
  });

  it("round-trips a set without a location", async () => {
    const s = await createSet(alice, { projectId: project, name: "DINER", locationId: null });
    expect(s.id).toBeTruthy();
    expect(s.name).toBe("DINER");
    expect(s.location_id).toBeNull();

    const all = await listSets(alice, project);
    expect(all.some((x) => x.id === s.id)).toBe(true);
  });

  it("round-trips a set linked to a location", async () => {
    const loc = await createLocation(alice, { projectId: project, name: "Warehouse", address: null, timezone: null });
    const s = await createSet(alice, { projectId: project, name: "WAREHOUSE INT", locationId: loc.id });
    expect(s.location_id).toBe(loc.id);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("getOrCreateDefaultSegment (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-seg-default-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
  });

  it("getOrCreateDefaultSegment is idempotent and uses the scene's eighths", async () => {
    const { sceneId } = await seedScene(alice, project, { page_eighths: 8 });
    const seg1 = await getOrCreateDefaultSegment(alice, { projectId: project, sceneId });
    const seg2 = await getOrCreateDefaultSegment(alice, { projectId: project, sceneId });
    expect(seg1.id).toBe(seg2.id);
    expect(seg1.page_eighths).toBe(8);
  });

  it("defaults page_eighths to 0 when scene has null eighths", async () => {
    const { sceneId } = await seedScene(alice, project, { page_eighths: undefined });
    const seg = await getOrCreateDefaultSegment(alice, { projectId: project, sceneId });
    expect(seg.page_eighths).toBe(0);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("splitSegment (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-split-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
  });

  it("replaces segments with N rows summing to the scene's page_eighths", async () => {
    const { sceneId } = await seedScene(alice, project, { page_eighths: 8 });
    const segs = await splitSegment(alice, { projectId: project, sceneId, eighths: [3, 5] });
    expect(segs).toHaveLength(2);
    expect(segs[0].page_eighths + segs[1].page_eighths).toBe(8);
    expect(segs[0].ordinal).toBe(0);
    expect(segs[1].ordinal).toBe(1);
  });

  it("rejects a partition that doesn't sum to the scene's page_eighths", async () => {
    const { sceneId } = await seedScene(alice, project, { page_eighths: 8 });
    await expect(
      splitSegment(alice, { projectId: project, sceneId, eighths: [3, 3] }),
    ).rejects.toThrow("segment split must sum to the scene's page_eighths");
  });

  it("replaces an existing default segment when split is called", async () => {
    const { sceneId } = await seedScene(alice, project, { page_eighths: 6 });
    // create the default first
    await getOrCreateDefaultSegment(alice, { projectId: project, sceneId });
    const segs = await splitSegment(alice, { projectId: project, sceneId, eighths: [2, 4] });
    expect(segs).toHaveLength(2);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("ensureSetForSlug (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-slug-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
  });

  it("ensureSetForSlug creates one Set per distinct slug and assigns scene.set_id", async () => {
    const { sceneId } = await seedScene(alice, project);
    const s = await ensureSetForSlug(alice, { projectId: project, sceneId, slug: "DINER" });
    expect(s.name).toBe("DINER");

    // read the scene back — set_id should be assigned
    const { data: sceneRow } = await alice.from("scenes").select("set_id").eq("id", sceneId).single();
    expect(sceneRow!.set_id).toBe(s.id);

    // calling again with the same slug reuses the same Set
    const again = await ensureSetForSlug(alice, { projectId: project, sceneId, slug: "DINER" });
    expect(again.id).toBe(s.id);
  });

  it("creates distinct Sets for distinct slugs", async () => {
    const { sceneId: s1 } = await seedScene(alice, project);
    const { sceneId: s2 } = await seedScene(alice, project);
    const set1 = await ensureSetForSlug(alice, { projectId: project, sceneId: s1, slug: "KITCHEN" });
    const set2 = await ensureSetForSlug(alice, { projectId: project, sceneId: s2, slug: "OFFICE" });
    expect(set1.id).not.toBe(set2.id);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("createShootDay / listShootDays (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-day-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
  });

  it("round-trips a shoot day with defaults unit='main', day_type='shoot'", async () => {
    const day = await createShootDay(alice, { projectId: project, ordinal: 0 });
    expect(day.id).toBeTruthy();
    expect(day.unit).toBe("main");
    expect(day.day_type).toBe("shoot");
    expect(day.date).toBeNull();

    const all = await listShootDays(alice, project);
    expect(all.some((d) => d.id === day.id)).toBe(true);
  });

  it("respects explicit date and day_type", async () => {
    const day = await createShootDay(alice, {
      projectId: project,
      ordinal: 1,
      date: "2026-07-15",
      dayType: "prep",
      unit: "second",
    });
    expect(day.date).toBe("2026-07-15");
    expect(day.day_type).toBe("prep");
    expect(day.unit).toBe("second");
  });

  it("listShootDays returns days ordered by ordinal", async () => {
    const p2 = await newProject(alice);
    await createShootDay(alice, { projectId: p2, ordinal: 2 });
    await createShootDay(alice, { projectId: p2, ordinal: 0 });
    await createShootDay(alice, { projectId: p2, ordinal: 1 });
    const days = await listShootDays(alice, p2);
    expect(days[0].ordinal).toBe(0);
    expect(days[1].ordinal).toBe(1);
    expect(days[2].ordinal).toBe(2);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("createStrip / listStrips / reorderStrips / deleteStrip (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string, dayId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-strip-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
    const day = await createShootDay(alice, { projectId: project, ordinal: 0 });
    dayId = day.id;
  });

  it("creates a day_break strip (no scene_segment)", async () => {
    const s = await createStrip(alice, {
      projectId: project,
      shootDayId: dayId,
      type: "day_break",
      ordinal: 0,
    });
    expect(s.id).toBeTruthy();
    expect(s.type).toBe("day_break");
    expect(s.scene_segment_id).toBeNull();
  });

  it("creates a scene strip with a scene_segment_id", async () => {
    const { sceneId } = await seedScene(alice, project, { page_eighths: 8 });
    const seg = await getOrCreateDefaultSegment(alice, { projectId: project, sceneId });
    const s = await createStrip(alice, {
      projectId: project,
      shootDayId: dayId,
      type: "scene",
      sceneSegmentId: seg.id,
      ordinal: 1,
    });
    expect(s.scene_segment_id).toBe(seg.id);
    expect(s.type).toBe("scene");
  });

  it("listStrips returns strips ordered by ordinal", async () => {
    const p2 = await newProject(alice);
    const day2 = await createShootDay(alice, { projectId: p2, ordinal: 0 });
    await createStrip(alice, { projectId: p2, shootDayId: day2.id, type: "day_break", ordinal: 2 });
    await createStrip(alice, { projectId: p2, shootDayId: day2.id, type: "day_break", ordinal: 0 });
    await createStrip(alice, { projectId: p2, shootDayId: day2.id, type: "day_break", ordinal: 1 });
    const strips = await listStrips(alice, { projectId: p2 });
    expect(strips[0].ordinal).toBe(0);
    expect(strips[1].ordinal).toBe(1);
    expect(strips[2].ordinal).toBe(2);
  });

  it("reorderStrips reassigns ordinals to match index position", async () => {
    const p3 = await newProject(alice);
    const day3 = await createShootDay(alice, { projectId: p3, ordinal: 0 });
    const a = await createStrip(alice, { projectId: p3, shootDayId: day3.id, type: "day_break", ordinal: 0 });
    const b = await createStrip(alice, { projectId: p3, shootDayId: day3.id, type: "day_break", ordinal: 1 });
    // Reverse the order
    await reorderStrips(alice, [b.id, a.id]);
    const strips = await listStrips(alice, { projectId: p3 });
    expect(strips[0].id).toBe(b.id);
    expect(strips[1].id).toBe(a.id);
  });

  it("deleteStrip removes the strip", async () => {
    const p4 = await newProject(alice);
    const day4 = await createShootDay(alice, { projectId: p4, ordinal: 0 });
    const s = await createStrip(alice, { projectId: p4, shootDayId: day4.id, type: "day_break", ordinal: 0 });
    await deleteStrip(alice, s.id);
    const remaining = await listStrips(alice, { projectId: p4 });
    expect(remaining.find((x) => x.id === s.id)).toBeUndefined();
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("setCastOverride / listCastOverrides (data layer)", () => {
  let alice: SupabaseClient<Database>, project: string, personId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-cast-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);
    const { data: p } = await alice
      .from("people")
      .insert({ project_id: project, name: "Jane Actor" })
      .select("id")
      .single();
    personId = p!.id;
  });

  it("upserts a cast override and returns it", async () => {
    const row = await setCastOverride(alice, {
      projectId: project,
      personId,
      date: "2026-08-01",
      status: "hold",
      note: "Pending confirmation",
    });
    expect(row.id).toBeTruthy();
    expect(row.status).toBe("hold");
    expect(row.note).toBe("Pending confirmation");
  });

  it("upserts on (person_id, date) — second call updates, not duplicates", async () => {
    await setCastOverride(alice, { projectId: project, personId, date: "2026-08-02", status: "hold", note: null });
    await setCastOverride(alice, { projectId: project, personId, date: "2026-08-02", status: "work", note: "Confirmed" });
    const all = await listCastOverrides(alice, project);
    const matching = all.filter((x) => x.person_id === personId && x.date === "2026-08-02");
    expect(matching).toHaveLength(1);
    expect(matching[0].status).toBe("work");
  });

  it("listCastOverrides returns all overrides for the project", async () => {
    const all = await listCastOverrides(alice, project);
    expect(all.every((x) => x.project_id === project)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// loadScheduleGraph (Task 7)
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("loadScheduleGraph (Task 7)", () => {
  let alice: SupabaseClient<Database>;
  let project: string;
  // seeded ids for concrete assertions
  let sceneAId: string;
  let sceneBId: string;
  let charId: string;
  let personId: string;
  let elementId: string;
  let confirmedSceneCharId: string; // the confirmed sc row id (not the shape id, but the character id)
  let segmentId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-graph-${globalThis.crypto.randomUUID()}@t.dev`);
    project = await newProject(alice);

    // Script + 2 scenes
    const { data: script } = await alice
      .from("scripts")
      .insert({ project_id: project, title: "Graph Script" })
      .select("id")
      .single();

    const { data: sceneA } = await alice
      .from("scenes")
      .insert({
        project_id: project,
        script_id: script!.id,
        ordinal: 0,
        status: "active",
        page_eighths: 8,
        location_slug: "DINER",
      })
      .select("id")
      .single();
    sceneAId = sceneA!.id;

    const { data: sceneB } = await alice
      .from("scenes")
      .insert({
        project_id: project,
        script_id: script!.id,
        ordinal: 1,
        status: "active",
        page_eighths: 4,
      })
      .select("id")
      .single();
    sceneBId = sceneB!.id;

    // Scene segment for scene A
    const { data: seg } = await alice
      .from("scene_segments")
      .insert({ project_id: project, scene_id: sceneAId, ordinal: 0, page_eighths: 8 })
      .select("id")
      .single();
    segmentId = seg!.id;

    // Shoot day + strip referencing the segment
    const { data: day } = await alice
      .from("shoot_days")
      .insert({ project_id: project, ordinal: 0 })
      .select("id")
      .single();

    await alice
      .from("strips")
      .insert({
        project_id: project,
        shoot_day_id: day!.id,
        type: "scene",
        scene_segment_id: segmentId,
        ordinal: 0,
      });

    // Person + character with cast assignment
    const { data: person } = await alice
      .from("people")
      .insert({ project_id: project, name: "Actor One" })
      .select("id")
      .single();
    personId = person!.id;

    const { data: char } = await alice
      .from("characters")
      .insert({ project_id: project, primary_name: "DETECTIVE", cast_person_id: personId })
      .select("id")
      .single();
    charId = char!.id;

    // scene_characters: confirmed on scene A, suggested on scene B (same character)
    await alice.from("scene_characters").insert({
      scene_id: sceneAId,
      character_id: charId,
      status: "confirmed",
      presence_type: "speaking",
      provenance: "manual",
    });
    confirmedSceneCharId = charId; // track the character id for assertion

    await alice.from("scene_characters").insert({
      scene_id: sceneBId,
      character_id: charId,
      status: "suggested",
      presence_type: "speaking",
      provenance: "ai",
    });

    // Element — requires category_id → element_categories → elements
    const { data: cat } = await alice
      .from("element_categories")
      .insert({ project_id: project, name: "Props", ordinal: 0 })
      .select("id")
      .single();

    const { data: el } = await alice
      .from("elements")
      .insert({
        project_id: project,
        category_id: cat!.id,
        name: "Coffee Cup",
      })
      .select("id")
      .single();
    elementId = el!.id;

    // scene_elements: confirmed on scene A, rejected on scene B
    // anchor_state must be one of 'anchored','needs_review','orphaned'
    await alice.from("scene_elements").insert({
      scene_id: sceneAId,
      element_id: elementId,
      status: "confirmed",
      provenance: "manual",
      anchor_state: "anchored",
    });
    await alice.from("scene_elements").insert({
      scene_id: sceneBId,
      element_id: elementId,
      status: "rejected",
      provenance: "manual",
      anchor_state: "anchored",
    });
  });

  it("returns a graph with expected top-level shape", async () => {
    const g = await loadScheduleGraph(alice, project);
    expect(g).toHaveProperty("shootDays");
    expect(g).toHaveProperty("strips");
    expect(g).toHaveProperty("segments");
    expect(g).toHaveProperty("scenes");
    expect(g).toHaveProperty("sets");
    expect(g).toHaveProperty("locations");
    expect(g).toHaveProperty("sceneCharactersConfirmed");
    expect(g).toHaveProperty("characters");
    expect(g).toHaveProperty("sceneElementsConfirmed");
    expect(g).toHaveProperty("castOverrides");
  });

  it("sceneCharactersConfirmed contains only confirmed rows (excludes suggested)", async () => {
    const g = await loadScheduleGraph(alice, project);
    // Only 1 confirmed row was seeded (scene A); the suggested one on scene B must be absent
    expect(g.sceneCharactersConfirmed.every((sc) => sc.scene_id === sceneAId)).toBe(true);
    expect(g.sceneCharactersConfirmed).toHaveLength(1);
    expect(g.sceneCharactersConfirmed[0].character_id).toBe(confirmedSceneCharId);
    // The suggested entry (scene B) must not appear
    const hasSuggested = g.sceneCharactersConfirmed.some((sc) => sc.scene_id === sceneBId);
    expect(hasSuggested).toBe(false);
  });

  it("sceneElementsConfirmed contains only confirmed rows (excludes rejected)", async () => {
    const g = await loadScheduleGraph(alice, project);
    // Only 1 confirmed element row was seeded
    expect(g.sceneElementsConfirmed).toHaveLength(1);
    expect(g.sceneElementsConfirmed[0].scene_id).toBe(sceneAId);
    expect(g.sceneElementsConfirmed[0].element_id).toBe(elementId);
    // The rejected entry must not appear
    const hasRejected = g.sceneElementsConfirmed.some((se) => se.scene_id === sceneBId);
    expect(hasRejected).toBe(false);
  });

  it("characters includes cast_person_id", async () => {
    const g = await loadScheduleGraph(alice, project);
    const found = g.characters.find((c) => c.id === charId);
    expect(found).toBeDefined();
    expect(found!.cast_person_id).toBe(personId);
  });

  it("scenes include both scenes with correct fields", async () => {
    const g = await loadScheduleGraph(alice, project);
    const sceneIds = g.scenes.map((s) => s.id);
    expect(sceneIds).toContain(sceneAId);
    expect(sceneIds).toContain(sceneBId);
    const scA = g.scenes.find((s) => s.id === sceneAId)!;
    expect(scA.page_eighths).toBe(8);
    expect(scA.location_slug).toBe("DINER");
  });

  it("project scoping: another user's confirmed scene_character does not appear in alice's graph", async () => {
    // Seed a second user with their own project + confirmed scene_character
    const carol = await makeUser(`carol-graph-${globalThis.crypto.randomUUID()}@t.dev`);
    const carolProject = await newProject(carol);
    const { data: carolScript } = await carol
      .from("scripts")
      .insert({ project_id: carolProject, title: "Carol Script" })
      .select("id")
      .single();
    const { data: carolScene } = await carol
      .from("scenes")
      .insert({ project_id: carolProject, script_id: carolScript!.id, ordinal: 0, status: "active" })
      .select("id")
      .single();
    const { data: carolChar } = await carol
      .from("characters")
      .insert({ project_id: carolProject, primary_name: "CAROL CHAR" })
      .select("id")
      .single();
    await carol.from("scene_characters").insert({
      scene_id: carolScene!.id,
      character_id: carolChar!.id,
      status: "confirmed",
      presence_type: "speaking",
      provenance: "manual",
    });

    // Alice's graph must not contain carol's confirmed scene_character
    const g = await loadScheduleGraph(alice, project);
    const carolSceneIdInAliceGraph = g.sceneCharactersConfirmed.some(
      (sc) => sc.scene_id === carolScene!.id,
    );
    expect(carolSceneIdInAliceGraph).toBe(false);
    const carolCharInAliceChars = g.characters.some((c) => c.id === carolChar!.id);
    expect(carolCharInAliceChars).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 12: engine-wiring read functions
// ---------------------------------------------------------------------------

/**
 * Seed a self-contained stripboard scenario for Task 12 tests.
 *
 * Layout:
 *   - Day 1 (2026-08-01, main unit, ordinal 0): scene strip for sceneA (8 eighths)
 *   - Day 2 (2026-08-02, second unit, ordinal 1): scene strip for sceneB (4 eighths)
 *
 * For conflict seeding we add a SECOND strip on Day 1 via a SECOND scene (sceneC)
 * that is also confirmed to the same character (charA) — same date, same person —
 * producing a same-date cast conflict. (The cross-unit / unit:null variant is the
 * dedicated ⭐ thesis assertion in lib/schedule/integration.test.ts, Task 17.)
 *
 * Returns ids needed for assertions.
 */
async function seedStripboardFixture(alice: SupabaseClient<Database>, projectId: string) {
  // Script
  const { data: script, error: se } = await alice
    .from("scripts")
    .insert({ project_id: projectId, title: "Phase3 Script" })
    .select("id")
    .single();
  if (se) throw se;

  // Location + Set (for moves detection)
  const { data: locRow, error: le } = await alice
    .from("locations")
    .insert({ project_id: projectId, name: "Studio A" })
    .select("id")
    .single();
  if (le) throw le;
  const { data: setRow, error: ste } = await alice
    .from("sets")
    .insert({ project_id: projectId, name: "STAGE 5", location_id: locRow!.id })
    .select("id")
    .single();
  if (ste) throw ste;

  // Scene A — 8 eighths, linked to the set
  const { data: sceneA, error: scAe } = await alice
    .from("scenes")
    .insert({
      project_id: projectId,
      script_id: script!.id,
      ordinal: 0,
      status: "active",
      page_eighths: 8,
      location_slug: "STAGE 5",
      set_id: setRow!.id,
    })
    .select("id")
    .single();
  if (scAe) throw scAe;

  // Scene B — 4 eighths (no set, different day)
  const { data: sceneB, error: scBe } = await alice
    .from("scenes")
    .insert({
      project_id: projectId,
      script_id: script!.id,
      ordinal: 1,
      status: "active",
      page_eighths: 4,
    })
    .select("id")
    .single();
  if (scBe) throw scBe;

  // Scene C — 4 eighths — SAME DATE as Day 1, for conflict seeding
  const { data: sceneC, error: scCe } = await alice
    .from("scenes")
    .insert({
      project_id: projectId,
      script_id: script!.id,
      ordinal: 2,
      status: "active",
      page_eighths: 4,
    })
    .select("id")
    .single();
  if (scCe) throw scCe;

  // Segments
  const { data: segA, error: segAe } = await alice
    .from("scene_segments")
    .insert({ project_id: projectId, scene_id: sceneA!.id, ordinal: 0, page_eighths: 8 })
    .select("id")
    .single();
  if (segAe) throw segAe;

  const { data: segB, error: segBe } = await alice
    .from("scene_segments")
    .insert({ project_id: projectId, scene_id: sceneB!.id, ordinal: 0, page_eighths: 4 })
    .select("id")
    .single();
  if (segBe) throw segBe;

  const { data: segC, error: segCe } = await alice
    .from("scene_segments")
    .insert({ project_id: projectId, scene_id: sceneC!.id, ordinal: 0, page_eighths: 4 })
    .select("id")
    .single();
  if (segCe) throw segCe;

  // Shoot days
  // Day 1: dated 2026-08-01, main unit
  const { data: day1, error: d1e } = await alice
    .from("shoot_days")
    .insert({ project_id: projectId, ordinal: 0, date: "2026-08-01", unit: "main", day_type: "shoot" })
    .select("id")
    .single();
  if (d1e) throw d1e;

  // Day 2: dated 2026-08-02, main unit
  const { data: day2, error: d2e } = await alice
    .from("shoot_days")
    .insert({ project_id: projectId, ordinal: 1, date: "2026-08-02", unit: "main", day_type: "shoot" })
    .select("id")
    .single();
  if (d2e) throw d2e;

  // Strips: sceneA on day1 ordinal 0; sceneC on day1 ordinal 1 (both on 2026-08-01 = conflict date)
  const { data: stripA, error: stAe } = await alice
    .from("strips")
    .insert({
      project_id: projectId,
      shoot_day_id: day1!.id,
      type: "scene",
      scene_segment_id: segA!.id,
      ordinal: 0,
    })
    .select("id")
    .single();
  if (stAe) throw stAe;

  const { data: stripC, error: stCe } = await alice
    .from("strips")
    .insert({
      project_id: projectId,
      shoot_day_id: day1!.id,
      type: "scene",
      scene_segment_id: segC!.id,
      ordinal: 1,
    })
    .select("id")
    .single();
  if (stCe) throw stCe;

  // sceneB on day2
  await alice.from("strips").insert({
    project_id: projectId,
    shoot_day_id: day2!.id,
    type: "scene",
    scene_segment_id: segB!.id,
    ordinal: 0,
  });

  // Person + character
  const { data: personRow, error: pe } = await alice
    .from("people")
    .insert({ project_id: projectId, name: "Lead Actor" })
    .select("id")
    .single();
  if (pe) throw pe;

  const { data: charRow, error: ce } = await alice
    .from("characters")
    .insert({ project_id: projectId, primary_name: "HERO", cast_person_id: personRow!.id })
    .select("id")
    .single();
  if (ce) throw ce;

  // scene_characters: HERO confirmed on both sceneA and sceneC (both on day1 = conflict)
  await alice.from("scene_characters").insert({
    scene_id: sceneA!.id,
    character_id: charRow!.id,
    status: "confirmed",
    presence_type: "speaking",
    provenance: "manual",
  });
  await alice.from("scene_characters").insert({
    scene_id: sceneC!.id,
    character_id: charRow!.id,
    status: "confirmed",
    presence_type: "speaking",
    provenance: "manual",
  });
  // Also confirmed on sceneB (day2) so the actor has multi-day span for DOOD
  await alice.from("scene_characters").insert({
    scene_id: sceneB!.id,
    character_id: charRow!.id,
    status: "confirmed",
    presence_type: "speaking",
    provenance: "manual",
  });

  return {
    scriptId: script!.id,
    locationId: locRow!.id,
    setId: setRow!.id,
    sceneAId: sceneA!.id,
    sceneBId: sceneB!.id,
    sceneCId: sceneC!.id,
    segAId: segA!.id,
    segBId: segB!.id,
    segCId: segC!.id,
    day1Id: day1!.id,
    day2Id: day2!.id,
    stripAId: stripA!.id,
    stripCId: stripC!.id,
    personId: personRow!.id,
    charId: charRow!.id,
  };
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("getStripboard (Task 12)", () => {
  let alice: SupabaseClient<Database>;
  let projectId: string;
  let fixture: Awaited<ReturnType<typeof seedStripboardFixture>>;

  beforeAll(async () => {
    alice = await makeUser(`alice-stripboard-${globalThis.crypto.randomUUID()}@t.dev`);
    projectId = await newProject(alice);
    fixture = await seedStripboardFixture(alice, projectId);
  });

  it("returns shootDays ordered by ordinal", async () => {
    const result = await getStripboard(alice, projectId);
    expect(result.shootDays.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < result.shootDays.length; i++) {
      expect(result.shootDays[i].ordinal).toBeGreaterThanOrEqual(result.shootDays[i - 1].ordinal);
    }
  });

  it("stripsByDay groups the scene strip under its shoot day", async () => {
    const result = await getStripboard(alice, projectId);
    const stripsOnDay1 = result.stripsByDay[fixture.day1Id];
    expect(stripsOnDay1).toBeDefined();
    const ids = stripsOnDay1.map((s) => s.id);
    expect(ids).toContain(fixture.stripAId);
    expect(ids).toContain(fixture.stripCId);
  });

  it("eighths rollup includes day1 with 8 eighths (sceneA segment)", async () => {
    const result = await getStripboard(alice, projectId);
    const day1Entry = result.eighths.find((e) => e.shootDayId === fixture.day1Id);
    expect(day1Entry).toBeDefined();
    // sceneA=8 + sceneC=4 both on day1
    expect(day1Entry!.eighths).toBe(12);
  });

  it("moves is an array (may be empty for sets without locations wired end-to-end)", async () => {
    const result = await getStripboard(alice, projectId);
    expect(Array.isArray(result.moves)).toBe(true);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("getConflicts (Task 12)", () => {
  let alice: SupabaseClient<Database>;
  let projectId: string;
  let fixture: Awaited<ReturnType<typeof seedStripboardFixture>>;

  beforeAll(async () => {
    alice = await makeUser(`alice-conflicts-${globalThis.crypto.randomUUID()}@t.dev`);
    projectId = await newProject(alice);
    fixture = await seedStripboardFixture(alice, projectId);
  });

  it("detects cast conflict for the person appearing in two strips on the same date", async () => {
    const conflicts = await getConflicts(alice, projectId);
    const castConflicts = conflicts.filter((c) => c.type === "cast");
    // The HERO (personId) works both sceneA and sceneC on 2026-08-01 → 1 cast conflict
    expect(castConflicts.length).toBeGreaterThanOrEqual(1);
    const personConflict = castConflicts.find((c) => c.resourceId === fixture.personId);
    expect(personConflict).toBeDefined();
    expect(personConflict!.date).toBe("2026-08-01");
    expect(personConflict!.segmentIds).toContain(fixture.segAId);
    expect(personConflict!.segmentIds).toContain(fixture.segCId);
  });

  it("returns Conflict[] (array)", async () => {
    const conflicts = await getConflicts(alice, projectId);
    expect(Array.isArray(conflicts)).toBe(true);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("getDOOD (Task 12)", () => {
  let alice: SupabaseClient<Database>;
  let projectId: string;
  let fixture: Awaited<ReturnType<typeof seedStripboardFixture>>;

  beforeAll(async () => {
    alice = await makeUser(`alice-dood-${globalThis.crypto.randomUUID()}@t.dev`);
    projectId = await newProject(alice);
    fixture = await seedStripboardFixture(alice, projectId);
  });

  it("returns DoodEntry[] for the seeded cast member", async () => {
    const entries = await getDOOD(alice, projectId);
    expect(Array.isArray(entries)).toBe(true);
    const personEntries = entries.filter((e) => e.personId === fixture.personId);
    // Actor works 2026-08-01 and 2026-08-02 — at minimum those two dates
    expect(personEntries.length).toBeGreaterThanOrEqual(2);
    const dates = personEntries.map((e) => e.date);
    expect(dates).toContain("2026-08-01");
    expect(dates).toContain("2026-08-02");
  });

  it("first work day is coded SW (start+work) for a multi-day span", async () => {
    const entries = await getDOOD(alice, projectId);
    const personEntries = entries.filter((e) => e.personId === fixture.personId);
    const firstDay = personEntries.find((e) => e.date === "2026-08-01");
    expect(firstDay).toBeDefined();
    expect(firstDay!.code).toBe("SW");
  });

  it("last work day is coded WF (work+finish) for a multi-day span", async () => {
    const entries = await getDOOD(alice, projectId);
    const personEntries = entries.filter((e) => e.personId === fixture.personId);
    const lastDay = personEntries.find((e) => e.date === "2026-08-02");
    expect(lastDay).toBeDefined();
    expect(lastDay!.code).toBe("WF");
  });

  it("all entries have source=derived (no overrides seeded)", async () => {
    const entries = await getDOOD(alice, projectId);
    const personEntries = entries.filter((e) => e.personId === fixture.personId);
    expect(personEntries.every((e) => e.source === "derived")).toBe(true);
  });

  it("accepts optional config (empty call uses defaults)", async () => {
    const entries = await getDOOD(alice, projectId, { allowHoldDays: false });
    expect(Array.isArray(entries)).toBe(true);
  });
});

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("getCalendar (Task 12)", () => {
  let alice: SupabaseClient<Database>;
  let projectId: string;

  beforeAll(async () => {
    alice = await makeUser(`alice-calendar-${globalThis.crypto.randomUUID()}@t.dev`);
    projectId = await newProject(alice);
    // Seed the standard fixture (dates 2026-08-01 and 2026-08-02 are what we assert on).
    await seedStripboardFixture(alice, projectId);
  });

  it("returns only dated shoot days", async () => {
    // Add an undated day
    await alice.from("shoot_days").insert({ project_id: projectId, ordinal: 99 });
    const days = await getCalendar(alice, projectId);
    expect(days.every((d) => d.date !== null)).toBe(true);
  });

  it("includes the dated days seeded by the fixture", async () => {
    const days = await getCalendar(alice, projectId);
    const dates = days.map((d) => d.date);
    expect(dates).toContain("2026-08-01");
    expect(dates).toContain("2026-08-02");
  });

  it("returns ShootDay[] ordered by ordinal", async () => {
    const days = await getCalendar(alice, projectId);
    for (let i = 1; i < days.length; i++) {
      expect(days[i].ordinal).toBeGreaterThanOrEqual(days[i - 1].ordinal);
    }
  });
});
