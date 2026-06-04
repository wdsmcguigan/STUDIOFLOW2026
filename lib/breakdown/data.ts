// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input at the server boundary. Follows lib/scripts/data.ts style.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  department,
  elementCategory,
  organization,
  person,
  character,
  element,
  createElementInput,
  createCharacterInput,
  createOrganizationInput,
  createPersonInput,
  type Department,
  type ElementCategory,
  type Organization,
  type Person,
  type Character,
  type Element,
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
