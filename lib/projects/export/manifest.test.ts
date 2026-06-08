import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  PROJECT_EXPORT_MANIFEST,
  EXPORT_IGNORE_TABLES,
} from "@/lib/projects/export/manifest";
import { exportProject } from "@/lib/projects/export/export-project";

/**
 * Derive the set of project-scoped public tables straight from the migration SQL.
 * A table is project-scoped if it has a `project_id` column or (transitively) a
 * foreign key into another project-scoped table. Hermetic — no DB required.
 */
function projectScopedTablesFromMigrations(): Set<string> {
  const dir = join(process.cwd(), "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n")
    .toLowerCase();

  // Per-table SQL fragments: the create-table body plus any later alter-table bodies.
  const fragments = new Map<string, string>();
  const add = (name: string, body: string) =>
    fragments.set(name, (fragments.get(name) ?? "") + "\n" + body);

  // `;` only terminates statements (never appears inside a create/alter body here),
  // so a non-greedy match up to `;` captures exactly one statement body.
  const createRe = /create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
  for (let m; (m = createRe.exec(sql)); ) add(m[1], m[2]);

  const alterRe = /alter table (?:if exists )?(?:only )?(?:public\.)?(\w+)([\s\S]*?);/gi;
  for (let m; (m = alterRe.exec(sql)); ) add(m[1], m[2]);

  const parentsOf = (body: string): string[] =>
    [...body.matchAll(/references (?:public\.)?(\w+)/gi)].map((m) => m[1]);

  // Seed: tables with project_id or a direct FK to projects. Then close transitively.
  const scoped = new Set<string>();
  for (const [name, body] of fragments) {
    if (body.includes("project_id") || parentsOf(body).includes("projects")) scoped.add(name);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const [name, body] of fragments) {
      if (scoped.has(name)) continue;
      if (parentsOf(body).some((p) => scoped.has(p))) {
        scoped.add(name);
        changed = true;
      }
    }
  }

  for (const t of EXPORT_IGNORE_TABLES) scoped.delete(t);
  scoped.delete("projects");
  return scoped;
}

describe("PROJECT_EXPORT_MANIFEST completeness (anti-drift guard)", () => {
  const manifestTables = new Set(PROJECT_EXPORT_MANIFEST.map((t) => t.table));

  it("registers every project-scoped table defined by the migrations", () => {
    const scoped = projectScopedTablesFromMigrations();
    const missing = [...scoped].filter((t) => !manifestTables.has(t)).sort();
    expect(
      missing,
      `These project-scoped tables are missing from PROJECT_EXPORT_MANIFEST — ` +
        `add an entry (and they'd otherwise be silently dropped from exports): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("does not register any table absent from the schema", () => {
    const scoped = projectScopedTablesFromMigrations();
    const extra = [...manifestTables].filter((t) => !scoped.has(t)).sort();
    expect(extra, `Manifest lists tables not found as project-scoped: ${extra.join(", ")}`).toEqual(
      [],
    );
  });

  it("orders parents before children (topological)", () => {
    const seen = new Set<string>();
    for (const desc of PROJECT_EXPORT_MANIFEST) {
      if (desc.link.via === "parent") {
        expect(
          seen.has(desc.link.parentTable),
          `${desc.table} is exported before its parent ${desc.link.parentTable}`,
        ).toBe(true);
      }
      seen.add(desc.table);
    }
  });
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string) {
  const password = globalThis.crypto.randomUUID();
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const client = createClient(url, anon, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return client;
}

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("exportProject", () => {
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let projectId: string;

  beforeAll(async () => {
    alice = await makeUser(`export-${Date.now()}@test.dev`);
    const { data: me } = await alice.auth.getUser();
    const { data: proj } = await alice
      .from("projects")
      .insert({ title: "Export Me", status: "production", owner_id: me.user!.id })
      .select("id")
      .single();
    projectId = proj!.id;
    await alice.from("locations").insert([
      { project_id: projectId, name: "Stage A" },
      { project_id: projectId, name: "Stage B" },
    ]);
  });

  it("assembles a versioned, round-trip-ready envelope of the project's rows", async () => {
    const archive = await exportProject(alice as never, projectId, "2026-06-08T00:00:00.000Z");

    expect(archive.manifest.schemaVersion).toBe("0022");
    expect(archive.manifest.format).toBe(1);
    expect(archive.manifest.projectId).toBe(projectId);
    expect(archive.project.id).toBe(projectId);
    expect(archive.tables.locations).toHaveLength(2);
    // FK metadata present so the future importer can remap identity, not display values.
    expect(archive.manifest.fkColumns.sets).toContain("location_id");
    // Empty project-scoped tables still appear as empty arrays (complete envelope).
    expect(archive.tables.scenes).toEqual([]);
  });

  it("does not export another user's project", async () => {
    const bob = await makeUser(`export-bob-${Date.now()}@test.dev`);
    await expect(exportProject(bob as never, projectId, "2026-06-08T00:00:00.000Z")).rejects.toThrow();
  });
});
