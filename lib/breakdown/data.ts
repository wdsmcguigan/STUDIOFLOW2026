// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input at the server boundary. Follows lib/scripts/data.ts style.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/db/types";
import {
  department,
  elementCategory,
  organization,
  person,
  character,
  element,
  sceneElement,
  sceneCharacter,
  tagSceneElementInput,
  tagSceneCharacterInput,
  tagStatus,
  createElementInput,
  createCharacterInput,
  createOrganizationInput,
  createPersonInput,
  mergeCharactersInput,
  job,
  type Department,
  type ElementCategory,
  type Organization,
  type Person,
  type Character,
  type Element,
  type SceneElement,
  type SceneCharacter,
  type TagSceneElementInput,
  type TagSceneCharacterInput,
  type Job,
} from "@/lib/breakdown/schema";

type DbClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Taxonomy seed data (Movie Magic / industry-standard departments + categories)
// Cast/Background are NOT element categories — they are Character presence_types.
// ---------------------------------------------------------------------------

const SEED_DEPARTMENTS = [
  "Production",
  "Camera",
  "Electrical",
  "Grip",
  "Art",
  "Set Dressing",
  "Props",
  "Wardrobe",
  "Makeup & Hair",
  "Sound",
  "Special Effects",
  "Visual Effects",
  "Stunts",
  "Transportation",
  "Animals",
  "Music",
  "Locations",
];

const SEED_CATEGORIES: Array<[name: string, dept: string]> = [
  ["Props", "Props"],
  ["Set Dressing", "Set Dressing"],
  ["Wardrobe", "Wardrobe"],
  ["Makeup/Hair", "Makeup & Hair"],
  ["Vehicles", "Transportation"],
  ["Animals", "Animals"],
  ["Stunts", "Stunts"],
  ["Special Effects", "Special Effects"],
  ["Visual Effects", "Visual Effects"],
  ["Sound", "Sound"],
  ["Camera", "Camera"],
  ["Grip/Electric", "Grip"],
  ["Special Equipment", "Production"],
  ["Music", "Music"],
  ["Notes", "Production"],
];

// ---------------------------------------------------------------------------
// Taxonomy seeding (idempotent: checks element_categories first, early-returns)
// ---------------------------------------------------------------------------

/** Seed departments + element categories for a project. Idempotent. */
export async function seedBreakdownTaxonomy(client: DbClient, projectId: string): Promise<void> {
  const { data: existing, error: readErr } = await client
    .from("element_categories")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if ((existing ?? []).length > 0) return; // already seeded — early return prevents duplicates

  const deptRows = SEED_DEPARTMENTS.map((name, i) => ({
    project_id: projectId,
    name,
    ordinal: i,
  }));
  const { data: depts, error: dErr } = await client
    .from("departments")
    .insert(deptRows)
    .select("id, name");
  if (dErr) throw new Error(dErr.message, { cause: dErr });

  const byName = new Map((depts ?? []).map((d) => [d.name, d.id]));

  const catRows = SEED_CATEGORIES.map(([name, dept], i) => ({
    project_id: projectId,
    name,
    department_id: byName.get(dept) ?? null,
    ordinal: i,
  }));
  const { error: cErr } = await client.from("element_categories").insert(catRows);
  if (cErr) throw new Error(cErr.message, { cause: cErr });
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export async function listDepartments(client: DbClient, projectId: string): Promise<Department[]> {
  const { data, error } = await client
    .from("departments")
    .select("*")
    .eq("project_id", projectId)
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => department.parse(r));
}

// ---------------------------------------------------------------------------
// Element categories
// ---------------------------------------------------------------------------

export async function listElementCategories(
  client: DbClient,
  projectId: string,
): Promise<ElementCategory[]> {
  const { data, error } = await client
    .from("element_categories")
    .select("*")
    .eq("project_id", projectId)
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => elementCategory.parse(r));
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

export async function createElement(client: DbClient, input: unknown): Promise<Element> {
  const p = createElementInput.parse(input);
  const { data, error } = await client
    .from("elements")
    .insert({
      project_id: p.projectId,
      category_id: p.categoryId,
      name: p.name,
      description: p.description,
      vendor_org_id: p.vendorOrgId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return element.parse(data);
}

export async function listElements(client: DbClient, projectId: string): Promise<Element[]> {
  const { data, error } = await client
    .from("elements")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => element.parse(r));
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export async function createCharacter(client: DbClient, input: unknown): Promise<Character> {
  const p = createCharacterInput.parse(input);
  const { data, error } = await client
    .from("characters")
    .insert({
      project_id: p.projectId,
      primary_name: p.primaryName,
      aliases: p.aliases,
      description: p.description,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return character.parse(data);
}

export async function listCharacters(client: DbClient, projectId: string): Promise<Character[]> {
  const { data, error } = await client
    .from("characters")
    .select("*")
    .eq("project_id", projectId)
    .order("primary_name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => character.parse(r));
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function createOrganization(client: DbClient, input: unknown): Promise<Organization> {
  const p = createOrganizationInput.parse(input);
  const { data, error } = await client
    .from("organizations")
    .insert({
      project_id: p.projectId,
      name: p.name,
      type: p.type,
      notes: p.notes,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return organization.parse(data);
}

export async function listOrganizations(
  client: DbClient,
  projectId: string,
): Promise<Organization[]> {
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => organization.parse(r));
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function createPerson(client: DbClient, input: unknown): Promise<Person> {
  const p = createPersonInput.parse(input);
  const { data, error } = await client
    .from("people")
    .insert({
      project_id: p.projectId,
      name: p.name,
      contact_email: p.contactEmail,
      contact_phone: p.contactPhone,
      org_id: p.orgId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return person.parse(data);
}

export async function listPeople(client: DbClient, projectId: string): Promise<Person[]> {
  const { data, error } = await client
    .from("people")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => person.parse(r));
}

// ---------------------------------------------------------------------------
// Scene tagging (upsert — idempotent on unique (scene_id, element_id) /
// (scene_id, character_id) constraints from migration 0006)
// ---------------------------------------------------------------------------

/** Upsert a scene↔element tag (idempotent on (scene_id, element_id)). */
export async function tagSceneElement(client: DbClient, input: unknown): Promise<SceneElement> {
  const p = tagSceneElementInput.parse(input);
  const { data, error } = await client
    .from("scene_elements")
    .upsert(
      {
        scene_id: p.sceneId,
        element_id: p.elementId,
        provenance: p.provenance,
        status: p.status,
        confidence: p.confidence,
        text_anchor: p.textAnchor,
        anchor_state: p.anchorState,
        quantity: p.quantity,
        notes: p.notes,
      },
      { onConflict: "scene_id,element_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneElement.parse(data);
}

/** Upsert a scene↔character tag (idempotent on (scene_id, character_id)). */
export async function tagSceneCharacter(client: DbClient, input: unknown): Promise<SceneCharacter> {
  const p = tagSceneCharacterInput.parse(input);
  const { data, error } = await client
    .from("scene_characters")
    .upsert(
      {
        scene_id: p.sceneId,
        character_id: p.characterId,
        presence_type: p.presenceType,
        provenance: p.provenance,
        status: p.status,
        confidence: p.confidence,
        text_anchor: p.textAnchor,
        anchor_state: p.anchorState,
        notes: p.notes,
      },
      { onConflict: "scene_id,character_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneCharacter.parse(data);
}

/** List all scene tags (all statuses) for a scene. */
export async function listSceneTags(
  client: DbClient,
  sceneId: string,
): Promise<{ elements: SceneElement[]; characters: SceneCharacter[] }> {
  const [{ data: els, error: e1 }, { data: chs, error: e2 }] = await Promise.all([
    client.from("scene_elements").select("*").eq("scene_id", sceneId),
    client.from("scene_characters").select("*").eq("scene_id", sceneId),
  ]);
  if (e1) throw new Error(e1.message, { cause: e1 });
  if (e2) throw new Error(e2.message, { cause: e2 });
  return {
    elements: (els ?? []).map((r) => sceneElement.parse(r)),
    characters: (chs ?? []).map((r) => sceneCharacter.parse(r)),
  };
}

/**
 * THE DOWNSTREAM GATE — schedule/budget (future phases) consume ONLY confirmed
 * links. Suggested and rejected tags are invisible to downstream consumers.
 */
export async function listConfirmedSceneTags(
  client: DbClient,
  sceneId: string,
): Promise<{ elements: SceneElement[]; characters: SceneCharacter[] }> {
  const [{ data: els, error: e1 }, { data: chs, error: e2 }] = await Promise.all([
    client.from("scene_elements").select("*").eq("scene_id", sceneId).eq("status", "confirmed"),
    client.from("scene_characters").select("*").eq("scene_id", sceneId).eq("status", "confirmed"),
  ]);
  if (e1) throw new Error(e1.message, { cause: e1 });
  if (e2) throw new Error(e2.message, { cause: e2 });
  return {
    elements: (els ?? []).map((r) => sceneElement.parse(r)),
    characters: (chs ?? []).map((r) => sceneCharacter.parse(r)),
  };
}

// ---------------------------------------------------------------------------
// Status flips (confirm / reject AI suggestions or override manual tags)
// ---------------------------------------------------------------------------

export async function setSceneElementStatus(
  client: DbClient,
  args: { id: string; status: "suggested" | "confirmed" | "rejected" },
): Promise<SceneElement> {
  const status = tagStatus.parse(args.status);
  const { data, error } = await client
    .from("scene_elements")
    .update({ status })
    .eq("id", args.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneElement.parse(data);
}

export async function setSceneCharacterStatus(
  client: DbClient,
  args: { id: string; status: "suggested" | "confirmed" | "rejected" },
): Promise<SceneCharacter> {
  const status = tagStatus.parse(args.status);
  const { data, error } = await client
    .from("scene_characters")
    .update({ status })
    .eq("id", args.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneCharacter.parse(data);
}

// ---------------------------------------------------------------------------
// Find-or-create helpers (idempotent catalog deduplication by normalized name)
// ---------------------------------------------------------------------------

/** Module-private normalizer: trim + lowercase for dedup comparisons. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Find an element by (project, category, normalized name) or create it. */
export async function findOrCreateElement(
  client: DbClient,
  args: { projectId: string; categoryId: string; name: string; description?: string | null },
): Promise<Element> {
  const existing = await listElements(client, args.projectId);
  const hit = existing.find(
    (e) => e.category_id === args.categoryId && norm(e.name) === norm(args.name),
  );
  if (hit) return hit;
  return createElement(client, {
    projectId: args.projectId,
    categoryId: args.categoryId,
    name: args.name,
    description: args.description ?? null,
    vendorOrgId: null,
  });
}

/** Find a character by normalized primary_name or any alias, else create. */
export async function findOrCreateCharacter(
  client: DbClient,
  args: { projectId: string; name: string; description?: string | null },
): Promise<Character> {
  const existing = await listCharacters(client, args.projectId);
  const n = norm(args.name);
  const hit = existing.find(
    (c) => norm(c.primary_name) === n || c.aliases.some((a) => norm(a) === n),
  );
  if (hit) return hit;
  return createCharacter(client, {
    projectId: args.projectId,
    primaryName: args.name,
    aliases: [],
    description: args.description ?? null,
  });
}

/** Map a free-text AI category to a project category id (best-effort, normalized).
 *  Falls back to "Notes" category if no exact match found. */
export async function resolveCategoryId(
  client: DbClient,
  projectId: string,
  categoryName: string,
): Promise<string | null> {
  const cats = await listElementCategories(client, projectId);
  return (
    cats.find((c) => norm(c.name) === norm(categoryName))?.id ??
    cats.find((c) => norm(c.name) === "notes")?.id ??
    null
  );
}

// ---------------------------------------------------------------------------
// Character merge (atomic RPC — re-points scene links, unions aliases, deletes absorbed)
// ---------------------------------------------------------------------------

export async function mergeCharacter(client: DbClient, input: unknown): Promise<void> {
  const p = mergeCharactersInput.parse(input);
  const { error } = await client.rpc("merge_characters", { p_survivor: p.survivorId, p_absorbed: p.absorbedId });
  if (error) throw new Error(error.message, { cause: error });
}

// ---------------------------------------------------------------------------
// Jobs (async queue panel source of truth)
// ---------------------------------------------------------------------------

export async function createJob(
  client: DbClient,
  args: {
    projectId: string;
    type: "breakdown" | "import";
    params?: Record<string, unknown>;
    total?: number | null;
    createdBy: string;
  },
): Promise<Job> {
  const { data, error } = await client
    .from("jobs")
    .insert({
      project_id: args.projectId,
      type: args.type,
      params: (args.params ?? {}) as Json,
      total: args.total ?? null,
      created_by: args.createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return job.parse(data);
}

export async function listJobs(client: DbClient, projectId: string): Promise<Job[]> {
  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => job.parse(r));
}

export async function getJob(client: DbClient, id: string): Promise<Job | null> {
  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? job.parse(data) : null;
}

export async function updateJobProgress(
  client: DbClient,
  args: { id: string; completed: number; progress: number },
): Promise<void> {
  const { error } = await client
    .from("jobs")
    .update({ completed: args.completed, progress: args.progress, status: "running" })
    .eq("id", args.id);
  if (error) throw new Error(error.message, { cause: error });
}

export async function setJobStatus(
  client: DbClient,
  args: {
    id: string;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    error?: string | null;
    workflowRunId?: string | null;
  },
): Promise<Job> {
  const patch: Database["public"]["Tables"]["jobs"]["Update"] = { status: args.status };
  if (args.error !== undefined) patch.error = args.error;
  if (args.workflowRunId !== undefined) patch.workflow_run_id = args.workflowRunId;
  const { data, error } = await client
    .from("jobs")
    .update(patch)
    .eq("id", args.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return job.parse(data);
}

export async function isJobCancelled(client: DbClient, id: string): Promise<boolean> {
  const j = await getJob(client, id);
  return j?.status === "cancelled";
}

// ---------------------------------------------------------------------------
// Scene text loading (for breakdown job input)
// Phase 2 approximation: reconstruct scene text from synopsis + header fields.
// Full body reconstruction (from scene_sources) is a Phase 1.5 / Phase 3 item.
// ---------------------------------------------------------------------------

/** Load all active scenes for a script, shaped into { id, text } for the AI engine. */
export async function listScenesForBreakdown(
  client: DbClient,
  scriptId: string,
): Promise<Array<{ id: string; text: string }>> {
  const { data, error } = await client
    .from("scenes")
    .select("id, synopsis, location_slug, int_ext, time_of_day")
    .eq("script_id", scriptId)
    .eq("status", "active")
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((s) => ({
    id: s.id,
    text:
      [s.int_ext, s.location_slug, s.time_of_day].filter(Boolean).join(". ") +
      "\n" +
      (s.synopsis ?? ""),
  }));
}
