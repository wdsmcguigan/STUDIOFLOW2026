# Phase 2 — Breakdown & AI Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag scenes with breakdown Elements + Characters — manually first, then AI-assisted (non-destructive, human-confirmed) — backed by a shared project graph, an async job system, and re-anchoring that survives script rewrites.

**Architecture:** Project-scoped Postgres tables under Phase 1's owner-based RLS (the single security boundary). One typed Zod↔DB contract; the only Supabase queries for the domain live in `lib/breakdown/data.ts`. The AI breakdown *engine* is a pure, model-injected, mock-testable service; Vercel Workflow (WDK) is a thin durable wrapper. Re-anchoring is composed at the action layer so `lib/scripts` and `lib/breakdown` stay decoupled.

**Tech Stack:** Next.js 16 (App Router, React 19), Supabase (Postgres + Auth + RLS), Zod v4, AI SDK v6 (`ai@^6.0.196`) + `@ai-sdk/google@^3.0.80` (Gemini `gemini-2.5-flash`), Vercel Workflow (`workflow@^4.3.1`), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-phase-2-breakdown-ai-design.md` (Finalized 2026-06-04).

---

## Conventions (apply to every task)

- **Parse-on-read / parse-at-boundary.** Every data-layer read returns Zod-validated domain types; every write parses its input; every server action re-parses `FormData` with a Zod schema before calling the data layer (non-negotiable #4).
- **`"use server"` hygiene.** An actions module exports ONLY locally-defined async actions — never re-export an imported function (corrupts the action manifest; a green build does NOT catch it).
- **RLS pattern.** Mirror Phase 1 exactly: project-scoped tables use `exists (select 1 from public.projects p where p.id = <t>.project_id and p.owner_id = auth.uid())`; junction tables validate BOTH FK targets' ownership in insert AND update with-check (the 0004 lesson).
- **Tests against local Supabase.** Run with `npx dotenv -e .env.local -- npm test`. RLS/live-DB suites are guarded `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)`.
- **Type regen after every migration:** `npx supabase migration up && npx supabase gen types typescript --local > lib/db/types.ts`.
- **Commit after each green step.** Conventional commits, scope `phase-2`.
- **Two-user RLS harness** lives in `lib/scripts/data.test.ts` (`makeUser`, `newProject`). New RLS tests reuse the same helper shape.

---

## File Structure

**Migrations (forward-only):**
- `supabase/migrations/0005_breakdown_graph.sql` — departments, element_categories, organizations, people, characters, elements + RLS + indexes + `updated_at` triggers.
- `supabase/migrations/0006_scene_links.sql` — scene_elements, scene_characters (two-FK RLS) + indexes + triggers.
- `supabase/migrations/0007_character_merge_rpc.sql` — `merge_characters(survivor, absorbed)` plpgsql (atomic, security invoker).
- `supabase/migrations/0008_jobs.sql` — jobs + RLS + index + trigger.

**Domain (server-side, testable):**
- `lib/breakdown/schema.ts` (+ `.test.ts`) — enums, row schemas, write inputs, `text_anchor` schema, AI output schema (discriminated + versioned).
- `lib/breakdown/data.ts` (+ `.test.ts`) — the only place breakdown Supabase queries live: catalog/org/person/character/element CRUD, `seedBreakdownTaxonomy`, tagging, `mergeCharacter`, downstream gate, job CRUD.
- `lib/breakdown/anchor.ts` (+ `.test.ts`) — pure re-anchor engine.
- `lib/breakdown/reanchor.ts` (+ `.test.ts`) — `reanchorSceneTags` orchestration.
- `lib/breakdown/ai/prompt.ts` — prompt builder (catalog-as-context).
- `lib/breakdown/ai/engine.ts` (+ `.test.ts`) — `runBreakdown({ model, sceneText, catalog })` (pure, model-injected).
- `lib/breakdown/ai/apply.ts` (+ `.test.ts`) — `applyBreakdownSuggestions` (idempotent upsert).
- `lib/breakdown/ai/model.ts` — production model factory (`@ai-sdk/google`), the composition root.

**Jobs / workflow:**
- `workflows/breakdown.ts` — `breakdownWorkflow` (`"use workflow"`) + `breakdownSceneStep` (`"use step"`).
- `next.config.ts` — wrap with `withWorkflow`.

**App (routes + actions + UI):**
- `app/dashboard/[projectId]/breakdown/page.tsx` — catalog/characters/people/orgs + job-queue panel.
- `app/dashboard/[projectId]/breakdown/actions.ts` — all breakdown server actions (Zod-parsed).
- `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx` — extend with tagging + suggestion review.
- `components/breakdown/*` — UI ported from `legacy/` parts bin onto the design system.

**Phase 1 retrofit:**
- `lib/scripts/schema.ts` — add `editSceneInput`, `stageReimportInput`, `confirmReimportInput`.
- `app/dashboard/[projectId]/import/actions.ts`, `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/actions.ts` — parse at boundary.

---

## Task 0: Install dependencies + wire WDK

**Files:** Modify `package.json`, `next.config.ts`, `.env.example`.

- [ ] **Step 1: Install runtime deps**

```bash
npm i ai@^6.0.196 @ai-sdk/google@^3.0.80 workflow@^4.3.1
```

- [ ] **Step 2: Verify the mock-model export name (flagged uncertain in research)**

```bash
node -e "const t=require('ai/test'); console.log(Object.keys(t).filter(k=>k.startsWith('MockLanguageModel')))"
```
Expected: prints the mock class name(s), e.g. `[ 'MockLanguageModelV2' ]` or `[ 'MockLanguageModelV3' ]`. **Record the exact name** — every AI test import below must use it. Wherever this plan writes `MockLanguageModelV2`, substitute the printed name.

- [ ] **Step 3: Wrap next.config with WDK**

`next.config.ts` — wrap the existing default export:
```ts
import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ...keep existing config...
};

export default withWorkflow(nextConfig);
```

- [ ] **Step 4: Document the AI env var**

Append to `.env.example`:
```
# AI breakdown (Phase 2) — Google AI Studio key. Server/test only.
# Tests use a mock model and do NOT need this. Live AI runs do.
GOOGLE_GENERATIVE_AI_API_KEY=
```

- [ ] **Step 5: Verify baseline still green**

Run: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`
Expected: lint clean, typecheck clean, all existing tests pass (70).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts .env.example
git commit -m "chore(phase-2): add ai sdk v6 + google provider + workflow (WDK); wire next.config"
```

---

## Task 1: Phase 1 Zod-parse retrofit (fold-in #1)

**Files:**
- Modify `lib/scripts/schema.ts`
- Test `lib/scripts/schema.test.ts`
- Modify `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/actions.ts`
- Modify `app/dashboard/[projectId]/import/actions.ts`

- [ ] **Step 1: Write failing schema tests**

Append to `lib/scripts/schema.test.ts`:
```ts
import { editSceneInput, stageReimportInput, confirmReimportInput } from "@/lib/scripts/schema";

describe("Phase 1 action input schemas", () => {
  it("editSceneInput coerces empty strings to null and trims", () => {
    const r = editSceneInput.parse({ int_ext: "INT", location_slug: "", time_of_day: "DAY", synopsis: "", script_day: "" });
    expect(r).toEqual({ int_ext: "INT", location_slug: null, time_of_day: "DAY", synopsis: null, script_day: null });
  });
  it("editSceneInput rejects an invalid int_ext", () => {
    expect(editSceneInput.safeParse({ int_ext: "INTERIOR" }).success).toBe(false);
  });
  it("stageReimportInput requires non-empty source", () => {
    expect(stageReimportInput.safeParse({ source: "   " }).success).toBe(false);
    expect(stageReimportInput.parse({ source: "INT. X - DAY\n" }).source).toContain("INT.");
  });
  it("confirmReimportInput requires a uuid version id", () => {
    expect(confirmReimportInput.safeParse({ scriptVersionId: "nope" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx dotenv -e .env.local -- npm test -- lib/scripts/schema.test.ts`
Expected: FAIL — `editSceneInput is not exported`.

- [ ] **Step 3: Add schemas to `lib/scripts/schema.ts`**

```ts
// ---- Phase 1 action input schemas (parse-at-boundary; fold-in #1) ----------
const emptyToNull = z.string().trim().transform((s) => (s.length ? s : null)).nullable();

export const editSceneInput = z.object({
  int_ext: z.preprocess((v) => (v === "" || v == null ? null : v), intExt.nullable()).default(null),
  location_slug: emptyToNull.default(null),
  time_of_day: emptyToNull.default(null),
  synopsis: emptyToNull.default(null),
  script_day: emptyToNull.default(null),
});
export type EditSceneInput = z.infer<typeof editSceneInput>;

export const stageReimportInput = z.object({
  source: z.string().min(1).refine((s) => s.trim().length > 0, "source is required"),
});
export type StageReimportInput = z.infer<typeof stageReimportInput>;

export const confirmReimportInput = z.object({
  scriptVersionId: z.uuid(),
});
export type ConfirmReimportInput = z.infer<typeof confirmReimportInput>;
```

- [ ] **Step 4: Run, verify pass**

Run: `npx dotenv -e .env.local -- npm test -- lib/scripts/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Parse at the edit-scene action boundary**

Replace the body of `editSceneAction` in `.../scenes/[sceneId]/actions.ts` so the patch is Zod-parsed (keep the `try/catch` + `revalidatePath`):
```ts
import { editSceneInput } from "@/lib/scripts/schema";
// ...
  const parsed = editSceneInput.safeParse({
    int_ext: formData.get("int_ext") ?? "",
    location_slug: formData.get("location_slug") ?? "",
    time_of_day: formData.get("time_of_day") ?? "",
    synopsis: formData.get("synopsis") ?? "",
    script_day: formData.get("script_day") ?? "",
  });
  if (!parsed.success) {
    console.error("[editSceneAction] invalid input", parsed.error.flatten());
    return;
  }
  try {
    const supabase = await createClient();
    await updateSceneInApp(supabase as unknown as never, {
      projectId: ctx.projectId, sceneId: ctx.sceneId, patch: parsed.data,
    });
  } // ...catch + revalidate unchanged
```

- [ ] **Step 6: Parse at the re-import action boundaries**

In `app/dashboard/[projectId]/import/actions.ts`, replace the loose `String(formData.get(...))` reads in `stageReimportAction` and `confirmReimportAction` with parsed input:
```ts
import { stageReimportInput, confirmReimportInput } from "@/lib/scripts/schema";
// stageReimportAction:
  const parsed = stageReimportInput.safeParse({ source: String(formData.get("source") ?? "") });
  if (!parsed.success) return;
  const source = parsed.data.source;
// confirmReimportAction:
  const parsed = confirmReimportInput.safeParse({ scriptVersionId: String(formData.get("scriptVersionId") ?? "") });
  if (!parsed.success) return;
  const scriptVersionId = parsed.data.scriptVersionId;
```
(Leave `importScriptAction` as-is — `createScript` already parses; the title/source guard stays.)

- [ ] **Step 7: Verify full suite + lint + typecheck green**

Run: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`
Expected: all green (74+).

- [ ] **Step 8: Commit**

```bash
git add lib/scripts/schema.ts lib/scripts/schema.test.ts "app/dashboard/[projectId]/import/actions.ts" "app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/actions.ts"
git commit -m "fix(phase-1): Zod-parse FormData at edit/re-import action boundaries (fold-in #1)"
```

---

## Task 2: Migration 0005 — graph entities + RLS

**Files:**
- Create `supabase/migrations/0005_breakdown_graph.sql`
- Modify `lib/db/types.ts` (generated)
- Test `lib/breakdown/data.test.ts` (new — RLS smoke for these tables)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_breakdown_graph.sql`. Each table: project-scoped, RLS enabled, four per-op policies (select/insert/update/delete), grants to `authenticated`, FK indexes, `updated_at` trigger.

```sql
-- ============================================================================
-- Phase 2: Breakdown graph entities (project-scoped, owner-based RLS mirroring
-- Phase 1). Characters + people + orgs + element catalog + the dept/category hinge.
-- ============================================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  code text,
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.element_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  code text,
  department_id uuid references public.departments(id) on delete set null,
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null default 'vendor'
    check (type in ('production_company','agency','vendor','payroll','insurer','other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  org_id uuid references public.organizations(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  primary_name text not null,
  aliases text[] not null default '{}',
  description text,
  cast_person_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.elements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.element_categories(id) on delete restrict,
  name text not null,
  description text,
  vendor_org_id uuid references public.organizations(id) on delete set null,
  estimated_cost numeric, -- dormant budget seam (Phase 4); not surfaced in Phase 2 UI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes on FKs / hot paths
create index departments_project_id_idx on public.departments(project_id);
create index element_categories_project_id_idx on public.element_categories(project_id);
create index element_categories_department_id_idx on public.element_categories(department_id);
create index organizations_project_id_idx on public.organizations(project_id);
create index people_project_id_idx on public.people(project_id);
create index people_org_id_idx on public.people(org_id);
create index characters_project_id_idx on public.characters(project_id);
create index characters_cast_person_id_idx on public.characters(cast_person_id);
create index elements_project_id_idx on public.elements(project_id);
create index elements_category_id_idx on public.elements(category_id);
create index elements_vendor_org_id_idx on public.elements(vendor_org_id);

-- RLS: project-scoped (owner-based), four policies each.
do $$
declare t text;
begin
  foreach t in array array['departments','element_categories','organizations','people','characters','elements']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$create policy "%1$s - select" on public.%1$I for select using (exists (select 1 from public.projects p where p.id = %1$I.project_id and p.owner_id = auth.uid()));$f$, t);
    execute format($f$create policy "%1$s - insert" on public.%1$I for insert with check (exists (select 1 from public.projects p where p.id = %1$I.project_id and p.owner_id = auth.uid()));$f$, t);
    execute format($f$create policy "%1$s - update" on public.%1$I for update using (exists (select 1 from public.projects p where p.id = %1$I.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = %1$I.project_id and p.owner_id = auth.uid()));$f$, t);
    execute format($f$create policy "%1$s - delete" on public.%1$I for delete using (exists (select 1 from public.projects p where p.id = %1$I.project_id and p.owner_id = auth.uid()));$f$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
    execute format('create trigger %I before update on public.%I for each row execute function extensions.moddatetime(updated_at);', t || '_set_updated_at', t);
  end loop;
end $$;
```

> Note: the `do $$ ... $$` block keeps the migration DRY across six structurally-identical tables. If the reviewer prefers explicit policies (as in 0003), expand them — behavior must be identical: four per-op policies per table, all owner-scoped.

- [ ] **Step 2: Apply + regenerate types**

Run: `npx supabase migration up && npx supabase gen types typescript --local > lib/db/types.ts`
Expected: migration `0005` applies; `lib/db/types.ts` now includes `departments`, `elements`, etc.

- [ ] **Step 3: Write an RLS smoke test (new file)**

Create `lib/breakdown/data.test.ts` with the two-user harness (mirror `lib/scripts/data.test.ts` lines 1-30) and a first isolation test:
```ts
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
```

- [ ] **Step 4: Run, verify pass**

Run: `npx dotenv -e .env.local -- npm test -- lib/breakdown/data.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
```bash
git add supabase/migrations/0005_breakdown_graph.sql lib/db/types.ts lib/breakdown/data.test.ts
git commit -m "feat(phase-2): migration 0005 breakdown graph entities + owner-RLS + types"
```

---

## Task 3: `lib/breakdown/schema.ts` — the typed contract

**Files:** Create `lib/breakdown/schema.ts`, `lib/breakdown/schema.test.ts`.

- [ ] **Step 1: Write failing tests**

`lib/breakdown/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { textAnchor, presenceType, tagStatus, provenance, anchorState, createElementInput, character, sceneElement } from "@/lib/breakdown/schema";

describe("breakdown schema", () => {
  it("textAnchor defaults prefix/suffix and allows null hint", () => {
    expect(textAnchor.parse({ quote: "chrome revolver" })).toEqual({ quote: "chrome revolver", prefix: "", suffix: "", hintOffset: null });
  });
  it("enums reject junk", () => {
    expect(presenceType.safeParse("lead").success).toBe(false);
    expect(tagStatus.safeParse("maybe").success).toBe(false);
    expect(provenance.safeParse("ai").success).toBe(false);
    expect(anchorState.safeParse("lost").success).toBe(false);
  });
  it("createElementInput requires project + category + name", () => {
    expect(createElementInput.safeParse({ projectId: crypto.randomUUID(), categoryId: crypto.randomUUID(), name: "Knife" }).success).toBe(true);
    expect(createElementInput.safeParse({ name: "" }).success).toBe(false);
  });
  it("character row parses aliases array", () => {
    const c = character.parse({ id: crypto.randomUUID(), project_id: crypto.randomUUID(), primary_name: "BOB", aliases: ["ROBERT"], description: null, cast_person_id: null, created_at: "t", updated_at: "t" });
    expect(c.aliases).toEqual(["ROBERT"]);
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npx dotenv -e .env.local -- npm test -- lib/breakdown/schema.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/breakdown/schema.ts`**

```ts
import { z } from "zod";

// ---- Enums (text + CHECK in DB; strict on write) --------------------------
export const provenance = z.enum(["manual", "auto"]);
export const tagStatus = z.enum(["suggested", "confirmed", "rejected"]);
export const anchorState = z.enum(["anchored", "needs_review", "orphaned"]);
export const presenceType = z.enum(["speaking", "silent_featured", "background", "voice_only"]);
export const orgType = z.enum(["production_company", "agency", "vendor", "payroll", "insurer", "other"]);
export const jobType = z.enum(["breakdown", "import"]);
export const jobStatus = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);

// ---- text_anchor: robust quote + context ----------------------------------
export const textAnchor = z.object({
  quote: z.string(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  hintOffset: z.number().int().nullable().default(null),
});
export type TextAnchor = z.infer<typeof textAnchor>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) ------
export const department = z.object({ id: z.uuid(), project_id: z.uuid(), name: z.string(), code: z.string().nullable(), ordinal: z.number().int(), created_at: z.string(), updated_at: z.string() });
export const elementCategory = z.object({ id: z.uuid(), project_id: z.uuid(), name: z.string(), code: z.string().nullable(), department_id: z.uuid().nullable(), ordinal: z.number().int(), created_at: z.string(), updated_at: z.string() });
export const organization = z.object({ id: z.uuid(), project_id: z.uuid(), name: z.string(), type: z.string(), notes: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export const person = z.object({ id: z.uuid(), project_id: z.uuid(), name: z.string(), contact_email: z.string().nullable(), contact_phone: z.string().nullable(), org_id: z.uuid().nullable(), notes: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export const character = z.object({ id: z.uuid(), project_id: z.uuid(), primary_name: z.string(), aliases: z.array(z.string()), description: z.string().nullable(), cast_person_id: z.uuid().nullable(), created_at: z.string(), updated_at: z.string() });
export const element = z.object({ id: z.uuid(), project_id: z.uuid(), category_id: z.uuid(), name: z.string(), description: z.string().nullable(), vendor_org_id: z.uuid().nullable(), estimated_cost: z.number().nullable(), created_at: z.string(), updated_at: z.string() });

const linkBase = {
  id: z.uuid(), scene_id: z.uuid(),
  provenance: z.string(), confidence: z.number().nullable(),
  status: z.string(), text_anchor: textAnchor.nullable(),
  anchor_state: z.string(), segment_id: z.uuid().nullable(),
  notes: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
};
export const sceneElement = z.object({ ...linkBase, element_id: z.uuid(), quantity: z.number().int().nullable() });
export const sceneCharacter = z.object({ ...linkBase, character_id: z.uuid(), presence_type: z.string() });

export type Department = z.infer<typeof department>;
export type ElementCategory = z.infer<typeof elementCategory>;
export type Organization = z.infer<typeof organization>;
export type Person = z.infer<typeof person>;
export type Character = z.infer<typeof character>;
export type Element = z.infer<typeof element>;
export type SceneElement = z.infer<typeof sceneElement>;
export type SceneCharacter = z.infer<typeof sceneCharacter>;

// ---- Write inputs (parse-at-boundary) -------------------------------------
export const createElementInput = z.object({ projectId: z.uuid(), categoryId: z.uuid(), name: z.string().trim().min(1).max(200), description: z.string().trim().max(2000).nullable().default(null), vendorOrgId: z.uuid().nullable().default(null) });
export const createCharacterInput = z.object({ projectId: z.uuid(), primaryName: z.string().trim().min(1).max(200), aliases: z.array(z.string().trim().min(1)).default([]), description: z.string().trim().max(2000).nullable().default(null) });
export const createOrganizationInput = z.object({ projectId: z.uuid(), name: z.string().trim().min(1).max(200), type: orgType.default("vendor"), notes: z.string().trim().max(2000).nullable().default(null) });
export const createPersonInput = z.object({ projectId: z.uuid(), name: z.string().trim().min(1).max(200), contactEmail: z.string().trim().email().nullable().default(null), contactPhone: z.string().trim().max(50).nullable().default(null), orgId: z.uuid().nullable().default(null) });
export const tagSceneElementInput = z.object({ projectId: z.uuid(), sceneId: z.uuid(), elementId: z.uuid(), provenance: provenance.default("manual"), status: tagStatus.default("confirmed"), confidence: z.number().min(0).max(1).nullable().default(null), textAnchor: textAnchor.nullable().default(null), anchorState: anchorState.default("anchored"), quantity: z.number().int().positive().nullable().default(null), notes: z.string().trim().max(2000).nullable().default(null) });
export const tagSceneCharacterInput = z.object({ projectId: z.uuid(), sceneId: z.uuid(), characterId: z.uuid(), presenceType, provenance: provenance.default("manual"), status: tagStatus.default("confirmed"), confidence: z.number().min(0).max(1).nullable().default(null), textAnchor: textAnchor.nullable().default(null), anchorState: anchorState.default("anchored"), notes: z.string().trim().max(2000).nullable().default(null) });
export const mergeCharactersInput = z.object({ projectId: z.uuid(), survivorId: z.uuid(), absorbedId: z.uuid() }).refine((v) => v.survivorId !== v.absorbedId, "cannot merge a character into itself");

export type CreateElementInput = z.infer<typeof createElementInput>;
export type TagSceneElementInput = z.infer<typeof tagSceneElementInput>;
export type TagSceneCharacterInput = z.infer<typeof tagSceneCharacterInput>;

// ---- AI structured output (F2: discriminated + versioned) ------------------
const aiAnchor = z.object({ quote: z.string(), prefix: z.string().default(""), suffix: z.string().default("") });
export const aiBreakdownItem = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("element"), category: z.string(), name: z.string(), description: z.string().nullable().default(null), confidence: z.number().min(0).max(1) }).extend(aiAnchor.shape),
  z.object({ kind: z.literal("character"), name: z.string(), presenceType, description: z.string().nullable().default(null), aliasOf: z.string().nullable().default(null), confidence: z.number().min(0).max(1) }).extend(aiAnchor.shape),
]);
export const aiBreakdownOutput = z.object({ schemaVersion: z.literal(1), items: z.array(aiBreakdownItem) });
export type AiBreakdownItem = z.infer<typeof aiBreakdownItem>;
export type AiBreakdownOutput = z.infer<typeof aiBreakdownOutput>;
```

- [ ] **Step 4: Run, verify pass.** → PASS.
- [ ] **Step 5: Typecheck + commit.**
```bash
npm run typecheck
git add lib/breakdown/schema.ts lib/breakdown/schema.test.ts
git commit -m "feat(phase-2): breakdown Zod contract (rows, inputs, text_anchor, AI output schema)"
```

---

## Task 4: `lib/breakdown/data.ts` — catalog/people CRUD + seeding

**Files:** Create `lib/breakdown/data.ts`; extend `lib/breakdown/data.test.ts`.

- [ ] **Step 1: Write failing tests** (append to `lib/breakdown/data.test.ts`)

```ts
import { seedBreakdownTaxonomy, listElementCategories, listDepartments, createElement, listElements, createCharacter, listCharacters } from "@/lib/breakdown/data";

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
```

- [ ] **Step 2: Run, verify fail.** → FAIL (module not found).

- [ ] **Step 3: Implement `lib/breakdown/data.ts`** (CRUD + seed). Mirror `lib/scripts/data.ts` style (`DbClient` type, parse-on-read).

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  department, elementCategory, organization, person, character, element,
  createElementInput, createCharacterInput, createOrganizationInput, createPersonInput,
  type Department, type ElementCategory, type Organization, type Person, type Character, type Element,
  type CreateElementInput,
} from "@/lib/breakdown/schema";

type DbClient = SupabaseClient<Database>;

// Seed taxonomy: departments + element categories (MM-aligned). Cast/Background
// are NOT categories — they are Character presence_types.
const SEED_DEPARTMENTS = ["Production","Camera","Electrical","Grip","Art","Set Dressing","Props","Wardrobe","Makeup & Hair","Sound","Special Effects","Visual Effects","Stunts","Transportation","Animals","Music","Locations"];
const SEED_CATEGORIES: Array<[name: string, dept: string]> = [
  ["Props","Props"],["Set Dressing","Set Dressing"],["Wardrobe","Wardrobe"],["Makeup/Hair","Makeup & Hair"],
  ["Vehicles","Transportation"],["Animals","Animals"],["Stunts","Stunts"],["Special Effects","Special Effects"],
  ["Visual Effects","Visual Effects"],["Sound","Sound"],["Camera","Camera"],["Grip/Electric","Grip"],
  ["Special Equipment","Production"],["Music","Music"],["Notes","Production"],
];

export async function seedBreakdownTaxonomy(client: DbClient, projectId: string): Promise<void> {
  const { data: existing, error: readErr } = await client.from("element_categories").select("id").eq("project_id", projectId).limit(1);
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if ((existing ?? []).length > 0) return; // already seeded

  const deptRows = SEED_DEPARTMENTS.map((name, i) => ({ project_id: projectId, name, ordinal: i }));
  const { data: depts, error: dErr } = await client.from("departments").insert(deptRows).select("id, name");
  if (dErr) throw new Error(dErr.message, { cause: dErr });
  const byName = new Map((depts ?? []).map((d) => [d.name, d.id]));

  const catRows = SEED_CATEGORIES.map(([name, dept], i) => ({ project_id: projectId, name, department_id: byName.get(dept) ?? null, ordinal: i }));
  const { error: cErr } = await client.from("element_categories").insert(catRows);
  if (cErr) throw new Error(cErr.message, { cause: cErr });
}

export async function listDepartments(client: DbClient, projectId: string): Promise<Department[]> {
  const { data, error } = await client.from("departments").select("*").eq("project_id", projectId).order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => department.parse(r));
}
export async function listElementCategories(client: DbClient, projectId: string): Promise<ElementCategory[]> {
  const { data, error } = await client.from("element_categories").select("*").eq("project_id", projectId).order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => elementCategory.parse(r));
}
export async function createElement(client: DbClient, input: CreateElementInput): Promise<Element> {
  const p = createElementInput.parse(input);
  const { data, error } = await client.from("elements").insert({ project_id: p.projectId, category_id: p.categoryId, name: p.name, description: p.description, vendor_org_id: p.vendorOrgId }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return element.parse(data);
}
export async function listElements(client: DbClient, projectId: string): Promise<Element[]> {
  const { data, error } = await client.from("elements").select("*").eq("project_id", projectId).order("created_at");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => element.parse(r));
}
export async function createCharacter(client: DbClient, input: unknown): Promise<Character> {
  const p = createCharacterInput.parse(input);
  const { data, error } = await client.from("characters").insert({ project_id: p.projectId, primary_name: p.primaryName, aliases: p.aliases, description: p.description }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return character.parse(data);
}
export async function listCharacters(client: DbClient, projectId: string): Promise<Character[]> {
  const { data, error } = await client.from("characters").select("*").eq("project_id", projectId).order("primary_name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => character.parse(r));
}
export async function createOrganization(client: DbClient, input: unknown): Promise<Organization> {
  const p = createOrganizationInput.parse(input);
  const { data, error } = await client.from("organizations").insert({ project_id: p.projectId, name: p.name, type: p.type, notes: p.notes }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return organization.parse(data);
}
export async function listOrganizations(client: DbClient, projectId: string): Promise<Organization[]> {
  const { data, error } = await client.from("organizations").select("*").eq("project_id", projectId).order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => organization.parse(r));
}
export async function createPerson(client: DbClient, input: unknown): Promise<Person> {
  const p = createPersonInput.parse(input);
  const { data, error } = await client.from("people").insert({ project_id: p.projectId, name: p.name, contact_email: p.contactEmail, contact_phone: p.contactPhone, org_id: p.orgId }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return person.parse(data);
}
export async function listPeople(client: DbClient, projectId: string): Promise<Person[]> {
  const { data, error } = await client.from("people").select("*").eq("project_id", projectId).order("name");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => person.parse(r));
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.
- [ ] **Step 5: Typecheck + commit.**
```bash
npm run typecheck
git add lib/breakdown/data.ts lib/breakdown/data.test.ts
git commit -m "feat(phase-2): breakdown data layer — catalog/people/org/character CRUD + idempotent seed"
```

---

## Task 5: Migration 0006 — scene-link tables (two-FK RLS)

**Files:** Create `supabase/migrations/0006_scene_links.sql`; modify `lib/db/types.ts`; extend `lib/breakdown/data.test.ts`.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- Phase 2: Scene↔Element and Scene↔Character link (junction) tables.
-- Both FKs validated in insert/update with-check (the 0004 lesson).
-- ============================================================================
create table public.scene_elements (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  element_id uuid not null references public.elements(id) on delete cascade,
  provenance text not null default 'manual' check (provenance in ('manual','auto')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'confirmed' check (status in ('suggested','confirmed','rejected')),
  text_anchor jsonb,
  anchor_state text not null default 'anchored' check (anchor_state in ('anchored','needs_review','orphaned')),
  segment_id uuid, -- null until Phase 3 (SceneSegment)
  quantity int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scene_id, element_id)
);

create table public.scene_characters (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  presence_type text not null check (presence_type in ('speaking','silent_featured','background','voice_only')),
  provenance text not null default 'manual' check (provenance in ('manual','auto')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'confirmed' check (status in ('suggested','confirmed','rejected')),
  text_anchor jsonb,
  anchor_state text not null default 'anchored' check (anchor_state in ('anchored','needs_review','orphaned')),
  segment_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scene_id, character_id)
);

create index scene_elements_scene_id_idx on public.scene_elements(scene_id);
create index scene_elements_element_id_idx on public.scene_elements(element_id);
create index scene_elements_status_idx on public.scene_elements(status);
create index scene_characters_scene_id_idx on public.scene_characters(scene_id);
create index scene_characters_character_id_idx on public.scene_characters(character_id);
create index scene_characters_status_idx on public.scene_characters(status);

alter table public.scene_elements enable row level security;
alter table public.scene_characters enable row level security;

-- scene_elements: BOTH scene_id and element_id must belong to the caller's project.
create policy "scene_elements - select" on public.scene_elements for select using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid()));
create policy "scene_elements - insert" on public.scene_elements for insert with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.elements e join public.projects p2 on p2.id = e.project_id where e.id = scene_elements.element_id and p2.owner_id = auth.uid()));
create policy "scene_elements - update" on public.scene_elements for update using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.elements e join public.projects p2 on p2.id = e.project_id where e.id = scene_elements.element_id and p2.owner_id = auth.uid()));
create policy "scene_elements - delete" on public.scene_elements for delete using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_elements.scene_id and p.owner_id = auth.uid()));

-- scene_characters: BOTH scene_id and character_id must belong to the caller's project.
create policy "scene_characters - select" on public.scene_characters for select using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid()));
create policy "scene_characters - insert" on public.scene_characters for insert with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.characters ch join public.projects p2 on p2.id = ch.project_id where ch.id = scene_characters.character_id and p2.owner_id = auth.uid()));
create policy "scene_characters - update" on public.scene_characters for update using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid())
  and exists (select 1 from public.characters ch join public.projects p2 on p2.id = ch.project_id where ch.id = scene_characters.character_id and p2.owner_id = auth.uid()));
create policy "scene_characters - delete" on public.scene_characters for delete using (
  exists (select 1 from public.scenes sc join public.projects p on p.id = sc.project_id where sc.id = scene_characters.scene_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.scene_elements to authenticated;
grant select, insert, update, delete on public.scene_characters to authenticated;

create trigger scene_elements_set_updated_at before update on public.scene_elements for each row execute function extensions.moddatetime(updated_at);
create trigger scene_characters_set_updated_at before update on public.scene_characters for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2: Apply + regen types.** `npx supabase migration up && npx supabase gen types typescript --local > lib/db/types.ts`

- [ ] **Step 3: Write the two-FK escape test** (append to `lib/breakdown/data.test.ts`, in a block that also seeds a scene for Alice). Mirror `lib/scripts/data.test.ts:111-138`:
```ts
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("scene-link two-FK escape (0006)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>;
  let aliceElementId: string, bobSceneId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`);
    bob = await makeUser(`bob-${crypto.randomUUID()}@test.dev`);
    const aliceProject = await newProject(alice);
    await seedBreakdownTaxonomy(alice as never, aliceProject);
    const cats = await listElementCategories(alice as never, aliceProject);
    const el = await createElement(alice as never, { projectId: aliceProject, categoryId: cats[0].id, name: "alice gun" });
    aliceElementId = el.id;
    // Bob makes his own project + script + scene.
    const bobProject = await newProject(bob);
    const { data: bobScript } = await bob.from("scripts").insert({ project_id: bobProject, title: "Bob" }).select("id").single();
    const { data: bobScene } = await bob.from("scenes").insert({ project_id: bobProject, script_id: bobScript!.id, ordinal: 0, status: "active" }).select("id").single();
    bobSceneId = bobScene!.id;
  });
  it("blocks linking your own scene to another user's element", async () => {
    expect(aliceElementId).toBeTruthy();
    const { error } = await bob.from("scene_elements").insert({ scene_id: bobSceneId, element_id: aliceElementId });
    expect(error).not.toBeNull(); // RLS with-check denies the foreign element FK
  });
});
```

- [ ] **Step 4: Run, verify pass.** → PASS.
- [ ] **Step 5: Typecheck + commit.**
```bash
git add supabase/migrations/0006_scene_links.sql lib/db/types.ts lib/breakdown/data.test.ts
git commit -m "feat(phase-2): migration 0006 scene-link tables + two-FK RLS + escape test"
```

---

## Task 6: Tagging + downstream gate (data layer)

**Files:** Modify `lib/breakdown/data.ts`; extend `lib/breakdown/data.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { tagSceneElement, tagSceneCharacter, listSceneTags, listConfirmedSceneTags, setSceneElementStatus } from "@/lib/breakdown/data";

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
    // add a suggested element tag, then assert the gate excludes it
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
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement tagging + gate** in `lib/breakdown/data.ts`:
```ts
import { sceneElement, sceneCharacter, tagSceneElementInput, tagSceneCharacterInput, tagStatus, type SceneElement, type SceneCharacter, type TagSceneElementInput, type TagSceneCharacterInput } from "@/lib/breakdown/schema";

/** Upsert a scene↔element tag (idempotent on (scene_id, element_id)). */
export async function tagSceneElement(client: DbClient, input: TagSceneElementInput): Promise<SceneElement> {
  const p = tagSceneElementInput.parse(input);
  const { data, error } = await client.from("scene_elements").upsert({
    scene_id: p.sceneId, element_id: p.elementId, provenance: p.provenance, status: p.status,
    confidence: p.confidence, text_anchor: p.textAnchor, anchor_state: p.anchorState, quantity: p.quantity, notes: p.notes,
  }, { onConflict: "scene_id,element_id" }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneElement.parse(data);
}
export async function tagSceneCharacter(client: DbClient, input: TagSceneCharacterInput): Promise<SceneCharacter> {
  const p = tagSceneCharacterInput.parse(input);
  const { data, error } = await client.from("scene_characters").upsert({
    scene_id: p.sceneId, character_id: p.characterId, presence_type: p.presenceType, provenance: p.provenance,
    status: p.status, confidence: p.confidence, text_anchor: p.textAnchor, anchor_state: p.anchorState, notes: p.notes,
  }, { onConflict: "scene_id,character_id" }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneCharacter.parse(data);
}
export async function listSceneTags(client: DbClient, sceneId: string): Promise<{ elements: SceneElement[]; characters: SceneCharacter[] }> {
  const [{ data: els, error: e1 }, { data: chs, error: e2 }] = await Promise.all([
    client.from("scene_elements").select("*").eq("scene_id", sceneId),
    client.from("scene_characters").select("*").eq("scene_id", sceneId),
  ]);
  if (e1) throw new Error(e1.message, { cause: e1 });
  if (e2) throw new Error(e2.message, { cause: e2 });
  return { elements: (els ?? []).map((r) => sceneElement.parse(r)), characters: (chs ?? []).map((r) => sceneCharacter.parse(r)) };
}
/** THE DOWNSTREAM GATE: schedule/budget consume only confirmed links. */
export async function listConfirmedSceneTags(client: DbClient, sceneId: string) {
  const [{ data: els, error: e1 }, { data: chs, error: e2 }] = await Promise.all([
    client.from("scene_elements").select("*").eq("scene_id", sceneId).eq("status", "confirmed"),
    client.from("scene_characters").select("*").eq("scene_id", sceneId).eq("status", "confirmed"),
  ]);
  if (e1) throw new Error(e1.message, { cause: e1 });
  if (e2) throw new Error(e2.message, { cause: e2 });
  return { elements: (els ?? []).map((r) => sceneElement.parse(r)), characters: (chs ?? []).map((r) => sceneCharacter.parse(r)) };
}
export async function setSceneElementStatus(client: DbClient, args: { id: string; status: "suggested" | "confirmed" | "rejected" }): Promise<SceneElement> {
  const status = tagStatus.parse(args.status);
  const { data, error } = await client.from("scene_elements").update({ status }).eq("id", args.id).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneElement.parse(data);
}
export async function setSceneCharacterStatus(client: DbClient, args: { id: string; status: "suggested" | "confirmed" | "rejected" }): Promise<SceneCharacter> {
  const status = tagStatus.parse(args.status);
  const { data, error } = await client.from("scene_characters").update({ status }).eq("id", args.id).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return sceneCharacter.parse(data);
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.
- [ ] **Step 5: Typecheck + commit.**
```bash
git add lib/breakdown/data.ts lib/breakdown/data.test.ts
git commit -m "feat(phase-2): scene tagging (upsert) + confirmed-only downstream gate + status flips"
```

---

## Task 7: Migration 0007 — atomic character merge RPC + data wrapper

**Files:** Create `supabase/migrations/0007_character_merge_rpc.sql`; modify `lib/db/types.ts`, `lib/breakdown/data.ts`, `lib/breakdown/data.test.ts`.

- [ ] **Step 1: Write the RPC migration** (single transaction; `security invoker` so RLS applies to the caller)
```sql
-- ============================================================================
-- Phase 2: Atomic character merge. Re-points all scene_characters from the
-- absorbed character to the survivor (dedupe on (scene_id, character_id) by
-- keeping the survivor's existing link), unions aliases (+ absorbed primary_name),
-- then deletes the absorbed character. One statement-set, one transaction.
-- security invoker (default) → the caller's RLS still gates every row touched.
-- ============================================================================
create or replace function public.merge_characters(p_survivor uuid, p_absorbed uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if p_survivor = p_absorbed then
    raise exception 'cannot merge a character into itself';
  end if;

  -- Re-point links that don't collide with an existing survivor link in the same scene.
  update public.scene_characters sc
     set character_id = p_survivor
   where sc.character_id = p_absorbed
     and not exists (
       select 1 from public.scene_characters s2
        where s2.scene_id = sc.scene_id and s2.character_id = p_survivor);

  -- Drop the absorbed's now-duplicate links (survivor already present in that scene).
  delete from public.scene_characters where character_id = p_absorbed;

  -- Union aliases (+ the absorbed primary_name) into the survivor.
  update public.characters s
     set aliases = (
       select array(
         select distinct x from unnest(
           s.aliases || a.aliases || array[a.primary_name]
         ) as x where x is not null and x <> ''
       ))
    from public.characters a
   where s.id = p_survivor and a.id = p_absorbed;

  delete from public.characters where id = p_absorbed;
end $$;

grant execute on function public.merge_characters(uuid, uuid) to authenticated;
```

- [ ] **Step 2: Apply + regen types.** `npx supabase migration up && npx supabase gen types typescript --local > lib/db/types.ts`

- [ ] **Step 3: Write failing test**
```ts
import { mergeCharacter } from "@/lib/breakdown/data";

describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("character merge (0007)", () => {
  let alice: SupabaseClient<Database>, project: string, sceneId: string;
  beforeAll(async () => {
    alice = await makeUser(`alice-${crypto.randomUUID()}@test.dev`);
    project = await newProject(alice);
    const { data: script } = await alice.from("scripts").insert({ project_id: project, title: "S" }).select("id").single();
    const { data: scene } = await alice.from("scenes").insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active" }).select("id").single();
    sceneId = scene!.id;
  });
  it("re-points links + unions aliases + deletes absorbed", async () => {
    const bob = await createCharacter(alice as never, { projectId: project, primaryName: "BOB", aliases: ["BOBBY"] });
    const robert = await createCharacter(alice as never, { projectId: project, primaryName: "ROBERT" });
    await tagSceneCharacter(alice as never, { projectId: project, sceneId, characterId: robert.id, presenceType: "speaking" });
    await mergeCharacter(alice as never, { projectId: project, survivorId: bob.id, absorbedId: robert.id });
    const chars = await listCharacters(alice as never, project);
    expect(chars.some((c) => c.id === robert.id)).toBe(false);
    const survivor = chars.find((c) => c.id === bob.id)!;
    expect(survivor.aliases).toEqual(expect.arrayContaining(["BOBBY", "ROBERT"]));
    const tags = await listSceneTags(alice as never, sceneId);
    expect(tags.characters.some((t) => t.character_id === bob.id)).toBe(true);
    expect(tags.characters.some((t) => t.character_id === robert.id)).toBe(false);
  });
});
```

- [ ] **Step 4: Run, verify fail.** → FAIL (`mergeCharacter` not exported).

- [ ] **Step 5: Implement `mergeCharacter`** in `lib/breakdown/data.ts`:
```ts
import { mergeCharactersInput } from "@/lib/breakdown/schema";
export async function mergeCharacter(client: DbClient, input: unknown): Promise<void> {
  const p = mergeCharactersInput.parse(input);
  const { error } = await client.rpc("merge_characters", { p_survivor: p.survivorId, p_absorbed: p.absorbedId });
  if (error) throw new Error(error.message, { cause: error });
}
```

- [ ] **Step 6: Run, verify pass.** → PASS.
- [ ] **Step 7: Typecheck + commit.**
```bash
git add supabase/migrations/0007_character_merge_rpc.sql lib/db/types.ts lib/breakdown/data.ts lib/breakdown/data.test.ts
git commit -m "feat(phase-2): atomic merge_characters RPC + data wrapper (re-point links, union aliases)"
```

---

## Task 8: `lib/breakdown/anchor.ts` — pure re-anchor engine

**Files:** Create `lib/breakdown/anchor.ts`, `lib/breakdown/anchor.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { describe, it, expect } from "vitest";
import { relocateAnchor } from "@/lib/breakdown/anchor";

const FUZZY_THRESHOLD = 0.6;
describe("relocateAnchor", () => {
  const anchor = { quote: "chrome revolver", prefix: "sets down a ", suffix: ". Outside", hintOffset: null };
  it("exact quote present → anchored, offset updated", () => {
    const text = "He sets down a chrome revolver. Outside it rains.";
    const r = relocateAnchor(anchor, text);
    expect(r.anchorState).toBe("anchored");
    expect(r.anchor.hintOffset).toBe(text.indexOf("chrome revolver"));
  });
  it("text shifted/edited but similar → needs_review", () => {
    const text = "He slowly sets down a chrome-plated revolver on the table.";
    const r = relocateAnchor(anchor, text);
    expect(r.anchorState).toBe("needs_review");
    expect(r.anchor.quote).toBe("chrome revolver"); // original quote retained
  });
  it("quote gone entirely → orphaned, anchor retained", () => {
    const text = "The room is empty and silent.";
    const r = relocateAnchor(anchor, text);
    expect(r.anchorState).toBe("orphaned");
    expect(r.anchor.hintOffset).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement `lib/breakdown/anchor.ts`** (pure; uses `string-similarity`, already a dep)
```ts
import { compareTwoStrings } from "string-similarity";
import type { TextAnchor } from "@/lib/breakdown/schema";

export type AnchorState = "anchored" | "needs_review" | "orphaned";
export interface RelocateResult { anchorState: AnchorState; anchor: TextAnchor; score: number; }

const FUZZY_THRESHOLD = 0.6; // tune empirically (spec open question)

/** Re-locate a tag's quote against new scene text. Pure. */
export function relocateAnchor(anchor: TextAnchor, newText: string): RelocateResult {
  const quote = anchor.quote;
  // 1) exact
  const idx = newText.indexOf(quote);
  if (idx >= 0) {
    return { anchorState: "anchored", score: 1, anchor: { ...anchor, hintOffset: idx } };
  }
  // 2) fuzzy: slide a window of the quote's length, keep the best similarity
  const win = Math.max(quote.length, 1);
  let best = 0, bestIdx = -1;
  for (let i = 0; i + win <= newText.length; i++) {
    const score = compareTwoStrings(quote, newText.slice(i, i + win));
    if (score > best) { best = score; bestIdx = i; }
  }
  // also consider a word-anchored candidate (first word of the quote)
  if (best >= FUZZY_THRESHOLD) {
    return { anchorState: "needs_review", score: best, anchor: { ...anchor, hintOffset: bestIdx } };
  }
  // 3) orphaned
  return { anchorState: "orphaned", score: best, anchor: { ...anchor, hintOffset: null } };
}
```

- [ ] **Step 4: Run, verify pass.** → PASS. (If the `needs_review` case scores below threshold, lower `FUZZY_THRESHOLD` or improve the windowing — keep the test green and note the tuned value.)
- [ ] **Step 5: Typecheck + commit.**
```bash
git add lib/breakdown/anchor.ts lib/breakdown/anchor.test.ts
git commit -m "feat(phase-2): pure re-anchor engine (exact/fuzzy/orphaned)"
```

---

## Task 9: `reanchor.ts` + wire into the re-import action

**Files:** Create `lib/breakdown/reanchor.ts`, `lib/breakdown/reanchor.test.ts`; modify `app/dashboard/[projectId]/import/actions.ts`.

- [ ] **Step 1: Write failing integration test** (`lib/breakdown/reanchor.test.ts`) — confirmed tag survives re-anchor with status preserved:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { reanchorSceneTags } from "@/lib/breakdown/reanchor";
import { tagSceneElement, listSceneTags, seedBreakdownTaxonomy, listElementCategories, createElement } from "@/lib/breakdown/data";
// (reuse makeUser/newProject — import from a shared test util or inline as in other files)

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
});
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement `lib/breakdown/reanchor.ts`**
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { relocateAnchor } from "@/lib/breakdown/anchor";
import { textAnchor } from "@/lib/breakdown/schema";

type DbClient = SupabaseClient<Database>;

/** Re-locate every tag on a scene against the scene's NEW body text.
 *  Updates anchor_state + text_anchor; PRESERVES status. Decoupled from
 *  lib/scripts — invoked by the re-import action after reconcileAndApply. */
export async function reanchorSceneTags(client: DbClient, sceneId: string, newText: string): Promise<void> {
  for (const table of ["scene_elements", "scene_characters"] as const) {
    const { data, error } = await client.from(table).select("id, text_anchor").eq("scene_id", sceneId);
    if (error) throw new Error(error.message, { cause: error });
    for (const row of data ?? []) {
      if (!row.text_anchor) continue; // no anchor to relocate
      const anchor = textAnchor.parse(row.text_anchor);
      const r = relocateAnchor(anchor, newText);
      const { error: upErr } = await client.from(table)
        .update({ anchor_state: r.anchorState, text_anchor: r.anchor }) // status untouched
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message, { cause: upErr });
    }
  }
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.

- [ ] **Step 5: Wire into `confirmReimportAction`** (compose at the action layer — keeps domains decoupled). After `applyReconciledImport(...)`, re-anchor each matched scene using the parsed body from the returned diff:
```ts
// in confirmReimportAction, after the apply call returns `{ diff, matchedSceneIds }`:
import { reanchorSceneTags } from "@/lib/breakdown/reanchor";
// ...
    const supabase = await createClient();
    const applied = await applyReconciledImport({ projectId: ctx.projectId, scriptId: ctx.scriptId, scriptVersionId });
    // Re-anchor tags on matched/modified scenes against their new body text.
    for (const entry of applied.diff) {
      if (entry.sceneId && entry.parsed && (entry.classification === "modified" || entry.classification === "conflict")) {
        await reanchorSceneTags(supabase as unknown as never, entry.sceneId, entry.parsed.bodyText);
      }
    }
```
(`SceneDiff.parsed` carries `bodyText` — see `lib/scripts/schema.ts` `parsedScene`. `applyReconciledImport` already returns `{ versionId, diff, matchedSceneIds }`.)

- [ ] **Step 6: Verify full suite + typecheck + lint green.** `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`
- [ ] **Step 7: Commit.**
```bash
git add lib/breakdown/reanchor.ts lib/breakdown/reanchor.test.ts "app/dashboard/[projectId]/import/actions.ts"
git commit -m "feat(phase-2): re-anchor tags on re-import (action-layer seam; status preserved)"
```

---

## Task 10: AI prompt builder (catalog-as-context)

**Files:** Create `lib/breakdown/ai/prompt.ts`, `lib/breakdown/ai/prompt.test.ts`.

- [ ] **Step 1: Write failing tests**
```ts
import { describe, it, expect } from "vitest";
import { buildBreakdownPrompt } from "@/lib/breakdown/ai/prompt";

describe("buildBreakdownPrompt", () => {
  const catalog = { categories: ["Props", "Wardrobe"], characters: [{ primaryName: "MARY", aliases: ["MARY ANN"] }], elements: [{ name: "chrome revolver", category: "Props" }] };
  it("includes the scene text and the existing catalog (F1)", () => {
    const p = buildBreakdownPrompt({ sceneText: "Mary draws a revolver.", catalog });
    expect(p).toContain("Mary draws a revolver.");
    expect(p).toContain("MARY");        // reuse canonical character
    expect(p).toContain("chrome revolver"); // reuse canonical element
    expect(p).toContain("Props");
  });
  it("instructs suggestions-only + quote anchoring", () => {
    const p = buildBreakdownPrompt({ sceneText: "x", catalog });
    expect(p.toLowerCase()).toContain("quote");
  });
});
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement `lib/breakdown/ai/prompt.ts`**
```ts
export interface BreakdownCatalog {
  categories: string[];
  characters: Array<{ primaryName: string; aliases: string[] }>;
  elements: Array<{ name: string; category: string }>;
}

export function buildBreakdownPrompt(args: { sceneText: string; catalog: BreakdownCatalog }): string {
  const { sceneText, catalog } = args;
  const chars = catalog.characters.map((c) => `- ${c.primaryName}${c.aliases.length ? ` (aka ${c.aliases.join(", ")})` : ""}`).join("\n") || "- (none yet)";
  const els = catalog.elements.map((e) => `- ${e.name} [${e.category}]`).join("\n") || "- (none yet)";
  return [
    "You are a film script breakdown assistant. Identify production breakdown items in ONE scene.",
    "Rules:",
    "- Output ONLY items literally supported by the scene text.",
    "- For each item, provide a short verbatim `quote` from the scene (plus a little surrounding prefix/suffix) so it can be anchored.",
    "- Use the EXISTING catalog names below when the same entity appears; do NOT invent new names for things already listed.",
    "- For people, set kind='character' with a presence_type (speaking/silent_featured/background/voice_only); if a name looks like an alias of an existing character, set aliasOf to that character's name.",
    "- For non-human items (props, wardrobe, vehicles, sfx, etc.), set kind='element' with the closest category from the list.",
    "- Optionally include a short `description` (appearance/attributes) for each item.",
    "",
    "Existing element categories:",
    catalog.categories.map((c) => `- ${c}`).join("\n"),
    "",
    "Existing characters:",
    chars,
    "",
    "Existing elements:",
    els,
    "",
    "SCENE TEXT:",
    sceneText,
  ].join("\n");
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.
- [ ] **Step 5: Commit.**
```bash
git add lib/breakdown/ai/prompt.ts lib/breakdown/ai/prompt.test.ts
git commit -m "feat(phase-2): AI breakdown prompt builder with catalog-as-context (F1)"
```

---

## Task 11: AI engine (`runBreakdown`, model-injected, mock-tested)

**Files:** Create `lib/breakdown/ai/engine.ts`, `lib/breakdown/ai/engine.test.ts`.

- [ ] **Step 1: Write failing test with a mock model** (use the export name recorded in Task 0 Step 2 — shown here as `MockLanguageModelV2`)
```ts
import { describe, it, expect } from "vitest";
import { MockLanguageModelV2 } from "ai/test"; // ← use the name printed in Task 0 Step 2
import { runBreakdown } from "@/lib/breakdown/ai/engine";

const PAYLOAD = JSON.stringify({
  schemaVersion: 1,
  items: [
    { kind: "element", category: "Props", name: "chrome revolver", description: null, confidence: 0.9, quote: "chrome revolver", prefix: "draws a ", suffix: "." },
    { kind: "character", name: "MARY", presenceType: "speaking", description: null, aliasOf: null, confidence: 0.95, quote: "Mary", prefix: "", suffix: " draws" },
  ],
});

function mock() {
  return new MockLanguageModelV2({
    doGenerate: async () => ({ finishReason: "stop", usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 }, content: [{ type: "text", text: PAYLOAD }], warnings: [] }),
  });
}

describe("runBreakdown", () => {
  it("returns validated, versioned items from the model", async () => {
    const out = await runBreakdown({ model: mock(), sceneText: "Mary draws a chrome revolver.", catalog: { categories: ["Props"], characters: [], elements: [] } });
    expect(out.schemaVersion).toBe(1);
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toMatchObject({ kind: "element", name: "chrome revolver" });
    expect(out.items[1]).toMatchObject({ kind: "character", presenceType: "speaking" });
  });
});
```

- [ ] **Step 2: Run, verify fail.** → FAIL.

- [ ] **Step 3: Implement `lib/breakdown/ai/engine.ts`**
```ts
import { generateObject, type LanguageModel } from "ai";
import { aiBreakdownOutput, type AiBreakdownOutput } from "@/lib/breakdown/schema";
import { buildBreakdownPrompt, type BreakdownCatalog } from "@/lib/breakdown/ai/prompt";

/** Pure, model-injected breakdown of ONE scene. Tests inject a mock model. */
export async function runBreakdown(args: { model: LanguageModel; sceneText: string; catalog: BreakdownCatalog }): Promise<AiBreakdownOutput> {
  const prompt = buildBreakdownPrompt({ sceneText: args.sceneText, catalog: args.catalog });
  const { object } = await generateObject({
    model: args.model,
    schema: aiBreakdownOutput,
    // Gemini native structured outputs reject z.union; our items use a discriminated union.
    providerOptions: { google: { structuredOutputs: false } },
    prompt,
  });
  return object;
}
```

- [ ] **Step 4: Run, verify pass.** → PASS.
- [ ] **Step 5: Typecheck + commit.**
```bash
git add lib/breakdown/ai/engine.ts lib/breakdown/ai/engine.test.ts
git commit -m "feat(phase-2): AI breakdown engine (generateObject, model-injected, mock-tested)"
```

---

## Task 12: AI apply (idempotent upsert of suggestions)

**Files:** Create `lib/breakdown/ai/apply.ts`, extend `lib/breakdown/data.ts` (need `findOrCreateElement` / `findOrCreateCharacter`), test `lib/breakdown/ai/apply.test.ts`.

- [ ] **Step 1: Add helpers to `lib/breakdown/data.ts`** (normalized-name find-or-create; the idempotency key)
```ts
function norm(s: string) { return s.trim().toLowerCase(); }

/** Find an element by (project, category, normalized name) or create it. */
export async function findOrCreateElement(client: DbClient, args: { projectId: string; categoryId: string; name: string; description?: string | null }): Promise<Element> {
  const existing = await listElements(client, args.projectId);
  const hit = existing.find((e) => e.category_id === args.categoryId && norm(e.name) === norm(args.name));
  if (hit) return hit;
  return createElement(client, { projectId: args.projectId, categoryId: args.categoryId, name: args.name, description: args.description ?? null, vendorOrgId: null });
}
/** Find a character by normalized primary_name or any alias, else create. */
export async function findOrCreateCharacter(client: DbClient, args: { projectId: string; name: string; description?: string | null }): Promise<Character> {
  const existing = await listCharacters(client, args.projectId);
  const n = norm(args.name);
  const hit = existing.find((c) => norm(c.primary_name) === n || c.aliases.some((a) => norm(a) === n));
  if (hit) return hit;
  return createCharacter(client, { projectId: args.projectId, primaryName: args.name, aliases: [], description: args.description ?? null });
}
/** Map a free-text AI category to a project category id (best-effort, normalized). */
export async function resolveCategoryId(client: DbClient, projectId: string, categoryName: string): Promise<string | null> {
  const cats = await listElementCategories(client, projectId);
  return cats.find((c) => norm(c.name) === norm(categoryName))?.id ?? cats.find((c) => norm(c.name) === "notes")?.id ?? null;
}
```

- [ ] **Step 2: Write failing test** (`lib/breakdown/ai/apply.test.ts`) — idempotent on re-run, creates `auto`/`suggested`:
```ts
// harness: makeUser/newProject inline as in other test files; seed taxonomy + a scene.
import { applyBreakdownSuggestions } from "@/lib/breakdown/ai/apply";
import { listSceneTags } from "@/lib/breakdown/data";

it("creates auto/suggested tags + is idempotent on re-run", async () => {
  const output = { schemaVersion: 1 as const, items: [
    { kind: "element" as const, category: "Props", name: "chrome revolver", description: null, confidence: 0.9, quote: "chrome revolver", prefix: "a ", suffix: "." },
    { kind: "character" as const, name: "MARY", presenceType: "speaking" as const, description: null, aliasOf: null, confidence: 0.95, quote: "Mary", prefix: "", suffix: " draws" },
  ]};
  await applyBreakdownSuggestions(alice as never, { projectId: project, sceneId, output });
  await applyBreakdownSuggestions(alice as never, { projectId: project, sceneId, output }); // re-run: no dupes
  const tags = await listSceneTags(alice as never, sceneId);
  expect(tags.elements).toHaveLength(1);
  expect(tags.elements[0].provenance).toBe("auto");
  expect(tags.elements[0].status).toBe("suggested");
  expect(tags.characters).toHaveLength(1);
  expect(tags.characters[0].presence_type).toBe("speaking");
});
```

- [ ] **Step 3: Run, verify fail.** → FAIL.

- [ ] **Step 4: Implement `lib/breakdown/ai/apply.ts`**
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { AiBreakdownOutput } from "@/lib/breakdown/schema";
import { findOrCreateElement, findOrCreateCharacter, resolveCategoryId, tagSceneElement, tagSceneCharacter } from "@/lib/breakdown/data";

type DbClient = SupabaseClient<Database>;

/** Map engine output → suggested scene tags. Idempotent: tagSceneElement/Character
 *  upsert on (scene_id, element_id|character_id), and find-or-create dedupes the
 *  catalog by normalized name, so a re-run never duplicates. Never overwrites a
 *  confirmed tag's status (upsert sets status='suggested' only on first insert —
 *  see note). */
export async function applyBreakdownSuggestions(client: DbClient, args: { projectId: string; sceneId: string; output: AiBreakdownOutput }): Promise<void> {
  for (const item of args.output.items) {
    if (item.kind === "element") {
      const categoryId = await resolveCategoryId(client, args.projectId, item.category);
      if (!categoryId) continue;
      const el = await findOrCreateElement(client, { projectId: args.projectId, categoryId, name: item.name, description: item.description });
      await tagSceneElement(client, { projectId: args.projectId, sceneId: args.sceneId, elementId: el.id, provenance: "auto", status: "suggested", confidence: item.confidence, textAnchor: { quote: item.quote, prefix: item.prefix, suffix: item.suffix, hintOffset: null }, anchorState: "anchored", quantity: null, notes: null });
    } else {
      const ch = await findOrCreateCharacter(client, { projectId: args.projectId, name: item.name, description: item.description });
      await tagSceneCharacter(client, { projectId: args.projectId, sceneId: args.sceneId, characterId: ch.id, presenceType: item.presenceType, provenance: "auto", status: "suggested", confidence: item.confidence, textAnchor: { quote: item.quote, prefix: item.prefix, suffix: item.suffix, hintOffset: null }, anchorState: "anchored", notes: null });
    }
  }
}
```

> **Idempotency + confirm-safety note:** `tagSceneElement/Character` upsert with `onConflict`. To avoid demoting a human-`confirmed` tag back to `suggested` on an AI re-run, the apply path MUST NOT clobber status. Implement this by having `applyBreakdownSuggestions` first read existing tags for the scene and **skip** any (scene,element|character) pair already present with `status='confirmed'` or `'rejected'` (only insert/refresh genuinely-new suggestions). Add a test asserting a pre-confirmed tag keeps `confirmed` after a re-run, and implement the skip.

- [ ] **Step 5: Add the confirm-safety test + skip logic, run, verify pass.**
```ts
it("never demotes a confirmed tag on AI re-run", async () => {
  // confirm the element tag, then re-run AI → still confirmed
  const before = await listSceneTags(alice as never, sceneId);
  await setSceneElementStatus(alice as never, { id: before.elements[0].id, status: "confirmed" });
  await applyBreakdownSuggestions(alice as never, { projectId: project, sceneId, output });
  const after = await listSceneTags(alice as never, sceneId);
  expect(after.elements[0].status).toBe("confirmed");
});
```
Implement the skip in `applyBreakdownSuggestions` (read `listSceneTags` first; build a Set of confirmed/rejected element_ids + character_ids; skip those).

- [ ] **Step 6: Typecheck + commit.**
```bash
git add lib/breakdown/ai/apply.ts lib/breakdown/ai/apply.test.ts lib/breakdown/data.ts
git commit -m "feat(phase-2): apply AI suggestions (auto/suggested, idempotent, confirm-safe)"
```

---

## Task 13: Migration 0008 — jobs + job data layer

**Files:** Create `supabase/migrations/0008_jobs.sql`; modify `lib/db/types.ts`, `lib/breakdown/schema.ts` (job row schema), `lib/breakdown/data.ts`, `lib/breakdown/data.test.ts`.

- [ ] **Step 1: Write the migration**
```sql
-- ============================================================================
-- Phase 2: jobs — the source of truth for the async queue panel. WDK mirrors
-- its run state into this row. Project-scoped, owner-RLS.
-- ============================================================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('breakdown','import')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  progress int not null default 0,
  total int,
  completed int,
  params jsonb not null default '{}',
  result jsonb,
  error text,
  workflow_run_id text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_project_id_idx on public.jobs(project_id);
create index jobs_status_idx on public.jobs(status);

alter table public.jobs enable row level security;
create policy "jobs - select" on public.jobs for select using (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
create policy "jobs - insert" on public.jobs for insert with check (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
create policy "jobs - update" on public.jobs for update using (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
create policy "jobs - delete" on public.jobs for delete using (exists (select 1 from public.projects p where p.id = jobs.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.jobs to authenticated;
create trigger jobs_set_updated_at before update on public.jobs for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2: Apply + regen types.**

- [ ] **Step 3: Add job row schema** to `lib/breakdown/schema.ts`:
```ts
export const job = z.object({ id: z.uuid(), project_id: z.uuid(), type: z.string(), status: z.string(), progress: z.number().int(), total: z.number().int().nullable(), completed: z.number().int().nullable(), params: z.record(z.string(), z.unknown()), result: z.record(z.string(), z.unknown()).nullable(), error: z.string().nullable(), workflow_run_id: z.string().nullable(), created_by: z.uuid(), created_at: z.string(), updated_at: z.string() });
export type Job = z.infer<typeof job>;
```

- [ ] **Step 4: Write failing test** (job lifecycle, owner-scoped)
```ts
import { createJob, listJobs, updateJobProgress, setJobStatus } from "@/lib/breakdown/data";
it("creates → progresses → completes a job; another user can't see it", async () => {
  const j = await createJob(alice as never, { projectId: project, type: "breakdown", params: { sceneIds: [sceneId] }, total: 1, createdBy: (await alice.auth.getUser()).data.user!.id });
  await updateJobProgress(alice as never, { id: j.id, completed: 1, progress: 100 });
  const done = await setJobStatus(alice as never, { id: j.id, status: "succeeded" });
  expect(done.status).toBe("succeeded");
  const bobView = await listJobs(bob as never, project).catch(() => []);
  expect(bobView).toHaveLength(0);
});
```

- [ ] **Step 5: Run, verify fail → implement job CRUD in `lib/breakdown/data.ts`**
```ts
import { job, type Job } from "@/lib/breakdown/schema";
export async function createJob(client: DbClient, args: { projectId: string; type: "breakdown" | "import"; params?: Record<string, unknown>; total?: number | null; createdBy: string }): Promise<Job> {
  const { data, error } = await client.from("jobs").insert({ project_id: args.projectId, type: args.type, params: args.params ?? {}, total: args.total ?? null, created_by: args.createdBy }).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return job.parse(data);
}
export async function listJobs(client: DbClient, projectId: string): Promise<Job[]> {
  const { data, error } = await client.from("jobs").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => job.parse(r));
}
export async function getJob(client: DbClient, id: string): Promise<Job | null> {
  const { data, error } = await client.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? job.parse(data) : null;
}
export async function updateJobProgress(client: DbClient, args: { id: string; completed: number; progress: number }): Promise<void> {
  const { error } = await client.from("jobs").update({ completed: args.completed, progress: args.progress, status: "running" }).eq("id", args.id);
  if (error) throw new Error(error.message, { cause: error });
}
export async function setJobStatus(client: DbClient, args: { id: string; status: "queued" | "running" | "succeeded" | "failed" | "cancelled"; error?: string | null; workflowRunId?: string | null }): Promise<Job> {
  const patch: Record<string, unknown> = { status: args.status };
  if (args.error !== undefined) patch.error = args.error;
  if (args.workflowRunId !== undefined) patch.workflow_run_id = args.workflowRunId;
  const { data, error } = await client.from("jobs").update(patch).eq("id", args.id).select("*").single();
  if (error) throw new Error(error.message, { cause: error });
  return job.parse(data);
}
export async function isJobCancelled(client: DbClient, id: string): Promise<boolean> {
  const j = await getJob(client, id);
  return j?.status === "cancelled";
}
```

- [ ] **Step 6: Run, verify pass. Typecheck. Commit.**
```bash
git add supabase/migrations/0008_jobs.sql lib/db/types.ts lib/breakdown/schema.ts lib/breakdown/data.ts lib/breakdown/data.test.ts
git commit -m "feat(phase-2): migration 0008 jobs table + job data layer (owner-RLS, lifecycle)"
```

---

## Task 14: WDK breakdown workflow + start/cancel actions

**Files:** Create `workflows/breakdown.ts`; create `app/dashboard/[projectId]/breakdown/actions.ts` (start/cancel job actions); test `workflows/breakdown.test.ts` (step logic in isolation).

> **WDK uncertainty flags (from research):** the `Promise.all(map(step))` fan-out shape and `setupWorkflowTests()` server harness were NOT verbatim-confirmed. This task tests the **step function in isolation** (plain Vitest), which IS confirmed; the durable orchestration is verified by the browser smoke test (Task 17). If `start()`/directive APIs differ on the installed `workflow@4.3.1`, adjust to the installed package's docs (`npx workflow` / `workflow-sdk.dev`) — the step/engine boundary below stays the same.

- [ ] **Step 1: Write the workflow + step**

`workflows/breakdown.ts`:
```ts
import { createClient } from "@/lib/supabase/server";
import { runBreakdown } from "@/lib/breakdown/ai/engine";
import { applyBreakdownSuggestions } from "@/lib/breakdown/ai/apply";
import { getBreakdownModel } from "@/lib/breakdown/ai/model";
import { listElementCategories, listCharacters, listElements, getJob, updateJobProgress, setJobStatus, isJobCancelled } from "@/lib/breakdown/data";

/** Durable orchestrator: break down each scene, update the job row, honor cancel. */
export async function breakdownWorkflow(input: { jobId: string; projectId: string; scenes: Array<{ id: string; text: string }> }) {
  "use workflow";
  const total = input.scenes.length;
  let completed = 0;
  for (const scene of input.scenes) {
    const cancelled = await checkCancelled(input.jobId);
    if (cancelled) return { cancelled: true, completed };
    await breakdownSceneStep({ jobId: input.jobId, projectId: input.projectId, sceneId: scene.id, sceneText: scene.text });
    completed += 1;
    await reportProgress({ jobId: input.jobId, completed, total });
  }
  await finalize({ jobId: input.jobId });
  return { cancelled: false, completed };
}

async function breakdownSceneStep(args: { jobId: string; projectId: string; sceneId: string; sceneText: string }) {
  "use step";
  const supabase = await createClient();
  const [categories, characters, elements] = await Promise.all([
    listElementCategories(supabase as never, args.projectId),
    listCharacters(supabase as never, args.projectId),
    listElements(supabase as never, args.projectId),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const catalog = {
    categories: categories.map((c) => c.name),
    characters: characters.map((c) => ({ primaryName: c.primary_name, aliases: c.aliases })),
    elements: elements.map((e) => ({ name: e.name, category: catById.get(e.category_id) ?? "Notes" })),
  };
  const output = await runBreakdown({ model: getBreakdownModel(), sceneText: args.sceneText, catalog });
  await applyBreakdownSuggestions(supabase as never, { projectId: args.projectId, sceneId: args.sceneId, output });
  return { sceneId: args.sceneId, count: output.items.length };
}

async function checkCancelled(jobId: string) { "use step"; const supabase = await createClient(); return isJobCancelled(supabase as never, jobId); }
async function reportProgress(args: { jobId: string; completed: number; total: number }) { "use step"; const supabase = await createClient(); await updateJobProgress(supabase as never, { id: args.jobId, completed: args.completed, progress: Math.round((args.completed / args.total) * 100) }); }
async function finalize(args: { jobId: string }) { "use step"; const supabase = await createClient(); await setJobStatus(supabase as never, { id: args.jobId, status: "succeeded" }); }
```

Create `lib/breakdown/ai/model.ts` (composition root):
```ts
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
/** Production model. Swap the provider/string here to change models. */
export function getBreakdownModel(): LanguageModel {
  return google("gemini-2.5-flash");
}
```

- [ ] **Step 2: Write the start/cancel server actions**

`app/dashboard/[projectId]/breakdown/actions.ts` (Zod-parsed; exports ONLY local async actions):
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { start, getRun } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { breakdownWorkflow } from "@/workflows/breakdown";
import { createJob, setJobStatus, listScenesForBreakdown } from "@/lib/breakdown/data"; // listScenesForBreakdown added below

const startBreakdownInput = z.object({ projectId: z.uuid(), scriptId: z.uuid() });

export async function startBreakdownAction(formData: FormData) {
  const parsed = startBreakdownInput.safeParse({ projectId: formData.get("projectId"), scriptId: formData.get("scriptId") });
  if (!parsed.success) return;
  const { projectId, scriptId } = parsed.data;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const scenes = await listScenesForBreakdown(supabase as never, scriptId); // [{id, text}]
    if (scenes.length === 0) return;
    const jobRow = await createJob(supabase as never, { projectId, type: "breakdown", params: { scriptId, sceneIds: scenes.map((s) => s.id) }, total: scenes.length, createdBy: user.id });
    const run = await start(breakdownWorkflow, [{ jobId: jobRow.id, projectId, scenes }]);
    await setJobStatus(supabase as never, { id: jobRow.id, status: "running", workflowRunId: run.runId });
  } catch (err) {
    console.error("[startBreakdownAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const cancelInput = z.object({ projectId: z.uuid(), jobId: z.uuid() });
export async function cancelJobAction(formData: FormData) {
  const parsed = cancelInput.safeParse({ projectId: formData.get("projectId"), jobId: formData.get("jobId") });
  if (!parsed.success) return;
  const { projectId, jobId } = parsed.data;
  try {
    const supabase = await createClient();
    const { getJob } = await import("@/lib/breakdown/data");
    const j = await getJob(supabase as never, jobId);
    await setJobStatus(supabase as never, { id: jobId, status: "cancelled" }); // cooperative flag (workflow checks between steps)
    if (j?.workflow_run_id) { try { await getRun(j.workflow_run_id).cancel(); } catch { /* best-effort native cancel */ } }
  } catch (err) { console.error("[cancelJobAction]", err); return; }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}
```
Add `listScenesForBreakdown` to `lib/breakdown/data.ts` (returns `{id, text}[]`; `text` = scene `synopsis` for now — Phase 1 stores prose as synopsis; reconstructing full body is a Phase 1.5 item, noted):
```ts
export async function listScenesForBreakdown(client: DbClient, scriptId: string): Promise<Array<{ id: string; text: string }>> {
  const { data, error } = await client.from("scenes").select("id, synopsis, location_slug, int_ext, time_of_day").eq("script_id", scriptId).eq("status", "active").order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((s) => ({ id: s.id, text: [s.int_ext, s.location_slug, s.time_of_day].filter(Boolean).join(". ") + "\n" + (s.synopsis ?? "") }));
}
```

- [ ] **Step 3: Test the step logic in isolation** (`workflows/breakdown.test.ts`) — extract the engine→apply boundary by asserting `breakdownSceneStep` is exercised via a thin exported helper. Since the step uses the real model, instead unit-test the **catalog assembly** + that `runBreakdown` + `applyBreakdownSuggestions` compose (already covered by Tasks 11–12). Add one test that `listScenesForBreakdown` shapes scene text:
```ts
// integration (skipIf no service key): seed a script + 1 scene, assert listScenesForBreakdown returns {id, text}
it("listScenesForBreakdown returns id+text per active scene", async () => {
  const scenes = await listScenesForBreakdown(alice as never, scriptId);
  expect(scenes[0]).toHaveProperty("text");
  expect(scenes[0].text.length).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Run suite + typecheck + lint.** `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`
- [ ] **Step 5: Commit.**
```bash
git add workflows/breakdown.ts lib/breakdown/ai/model.ts "app/dashboard/[projectId]/breakdown/actions.ts" lib/breakdown/data.ts workflows/breakdown.test.ts
git commit -m "feat(phase-2): WDK breakdown workflow + start/cancel job actions + scene-text loader"
```

---

## Task 15: Manual breakdown UI (catalog + tag-from-scene + people/orgs)

> Port look/interaction from `legacy/` parts bin onto the locked design system. Thin client: render + capture input; all logic in actions/data layer. Actions Zod-parse at the boundary and export ONLY local async functions.

**Files:** Create `app/dashboard/[projectId]/breakdown/page.tsx`; extend `app/dashboard/[projectId]/breakdown/actions.ts` (CRUD + tag + merge actions); create `components/breakdown/element-catalog.tsx`, `components/breakdown/character-list.tsx`, `components/breakdown/tag-scene.tsx`; extend the scene-detail page; component tests where logic exists.

- [ ] **Step 1: Add CRUD + tag + merge actions** to `app/dashboard/[projectId]/breakdown/actions.ts` (each Zod-parsed; calls the data layer; `revalidatePath`). Signatures:
  - `createElementAction(formData)` → `createElement`
  - `createCharacterAction(formData)` → `createCharacter`
  - `createOrganizationAction(formData)` / `createPersonAction(formData)`
  - `castPersonAction(formData)` → update `characters.cast_person_id`
  - `tagSceneElementAction(formData)` / `tagSceneCharacterAction(formData)` → manual/confirmed tag with the selected text as `text_anchor`
  - `mergeCharacterAction(formData)` → `mergeCharacter`
  - `setTagStatusAction(formData)` → `setSceneElementStatus` / `setSceneCharacterStatus`

  Example (pattern for all):
```ts
const createElementForm = z.object({ projectId: z.uuid(), categoryId: z.uuid(), name: z.string().trim().min(1), description: z.string().trim().optional() });
export async function createElementAction(formData: FormData) {
  const parsed = createElementForm.safeParse({ projectId: formData.get("projectId"), categoryId: formData.get("categoryId"), name: formData.get("name"), description: formData.get("description") ?? undefined });
  if (!parsed.success) return;
  try {
    const supabase = await createClient();
    const { createElement } = await import("@/lib/breakdown/data");
    await createElement(supabase as never, { projectId: parsed.data.projectId, categoryId: parsed.data.categoryId, name: parsed.data.name, description: parsed.data.description ?? null });
  } catch (err) { console.error("[createElementAction]", err); return; }
  revalidatePath(`/dashboard/${parsed.data.projectId}/breakdown`);
}
```

- [ ] **Step 2: Build the breakdown page + components** (server components fetching via the SSR client + data layer; client components for forms). `page.tsx` seeds the taxonomy on first load (idempotent) and renders tabs: Elements (catalog grouped by category), Characters (list + alias edit + merge + cast), Orgs/People. Use existing `components/ui/*` (shadcn) + design-system tokens; reference `legacy/` for layout.

- [ ] **Step 3: Add tagging to the scene-detail view** (`.../scenes/[sceneId]/page.tsx`): render existing tags (from `listSceneTags`), a "Tag as…" control (category + element/character picker), and the captured selection text → `tagScene*Action`. (Selection capture is a small client component; if text-selection is complex, ship a v1 where the user picks the element + types/pastes the quote — note this and refine later.)

- [ ] **Step 4: Component test** for any pure UI logic (e.g. grouping elements by category). Run `npm test` + `npm run lint` + `npm run typecheck`.

- [ ] **Step 5: Commit.**
```bash
git add "app/dashboard/[projectId]/breakdown" components/breakdown "app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx"
git commit -m "feat(phase-2): manual breakdown UI — catalog, characters/merge/cast, people/orgs, tag-from-scene"
```

---

## Task 16: AI review UI + job-queue panel

**Files:** Create `components/breakdown/suggestions-review.tsx`, `components/breakdown/job-queue-panel.tsx`; extend the breakdown page + scene-detail page; extend actions (`startBreakdownAction`/`cancelJobAction` already exist).

- [ ] **Step 1: Suggestions layer** on the scene-detail view: render `status='suggested'` tags distinctly (the design-system AI/sage→amethyst surface), each with accept (`setTagStatusAction` → confirmed) / reject (→ rejected) / edit; bulk-accept by category + by confidence threshold. Confirmed/rejected drop out of the suggested list.
- [ ] **Step 2: "Run AI breakdown" control** on the script/scene view → `startBreakdownAction` (passes projectId + scriptId).
- [ ] **Step 3: Job-queue panel** (`job-queue-panel.tsx`) on the breakdown page: lists `listJobs(projectId)` with progress bar (`completed/total`), status, and a cancel button (`cancelJobAction`). **Poll** via a client component that calls `router.refresh()` on an interval (e.g. 2s) while any job is `queued`/`running` (Realtime is a later enhancement — note it).
- [ ] **Step 4: Proposed alias-merges** surfaced in the character list (where an AI suggestion carried `aliasOf`) → one-click `mergeCharacterAction`. (If threading `aliasOf` through to the UI is heavy, ship merge as fully manual in this phase and note AI-proposed-merge surfacing as a fast-follow — the engine already returns `aliasOf`.)
- [ ] **Step 5: Run suite + lint + typecheck. Commit.**
```bash
git add components/breakdown "app/dashboard/[projectId]/breakdown" "app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx"
git commit -m "feat(phase-2): AI suggestions review (accept/reject/bulk) + job-queue panel (poll)"
```

---

## Task 17: Live AI wiring + quality measurement + browser smoke test

**Files:** Create `docs/superpowers/notes/phase-2-ai-quality.md`; create `lib/breakdown/__fixtures__/reference-scene.ts` (a hand-broken-down reference) + `lib/breakdown/ai/quality.test.ts` (mock-based harness).

- [ ] **Step 1: Mock-based precision/recall harness** — assert the *scoring* works with a known expected-vs-actual set (so the harness is green in CI without a key):
```ts
import { scoreBreakdown } from "@/lib/breakdown/ai/quality";
it("computes precision/recall against a reference", () => {
  const expected = [{ kind: "element", name: "chrome revolver" }, { kind: "character", name: "MARY" }];
  const actual = [{ kind: "element", name: "chrome revolver" }, { kind: "element", name: "lamp" }];
  const r = scoreBreakdown(expected as never, actual as never);
  expect(r.precision).toBeCloseTo(0.5);
  expect(r.recall).toBeCloseTo(0.5);
});
```
Implement `scoreBreakdown(expected, actual)` (normalized name+kind set intersection → precision/recall/F1) in `lib/breakdown/ai/quality.ts`.

- [ ] **Step 2: Live measurement (gated on the API key — manual/CI-skip).** Document in `phase-2-ai-quality.md` the procedure: with `GOOGLE_GENERATIVE_AI_API_KEY` set, run `runBreakdown` over the reference script, `scoreBreakdown` vs the hand-broken-down truth, record precision/recall/F1 + the model id + date. Add a `describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)` live test that prints the scores (not a pass/fail gate). **This step's numbers require the user to provide the key.**

- [ ] **Step 3: Browser smoke test** (the bug-catcher a green build misses — per Phase 1). Pre-create a confirmed user via the admin API; on `localhost:3000` (PKCE origin), run: sign in → open a project with an imported script → manual-tag an element + a character → (with key) run AI breakdown → watch the job-queue panel progress → review + confirm a suggestion → verify confirmed shows in the scene, suggested does not → re-import a modified script → verify a confirmed tag re-anchors (anchored/needs_review/orphaned) with status preserved. Use the Claude_in_Chrome MCP (reaches host localhost + Supabase/Mailpit; controlled inputs need native-setter+input event). **Confirm `"use server"` modules resolve at runtime** (no manifest 404). Record results.

- [ ] **Step 4: Commit.**
```bash
git add lib/breakdown/ai/quality.ts lib/breakdown/ai/quality.test.ts lib/breakdown/__fixtures__ docs/superpowers/notes/phase-2-ai-quality.md
git commit -m "feat(phase-2): AI quality scoring harness + reference fixture + smoke-test notes"
```

---

## Task 18: Final verification + branch finish

- [ ] **Step 1: Full green.** `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` — all green; note final test count.
- [ ] **Step 2: Migration replay sanity.** `npx supabase db reset` (replays 0001–0008 from scratch) → confirms forward-only migrations apply cleanly; re-run the suite.
- [ ] **Step 3: Spec done-criteria pass.** Walk the spec §"Done criteria" — confirm each is demonstrable.
- [ ] **Step 4: Use `superpowers:finishing-a-development-branch`** to present merge options. **Do NOT merge to main without the user's explicit go** (merge auto-deploys via Vercel + auto-applies migrations 0005–0008 to hosted Supabase). After an approved merge, verify the merge commit's checks: `gh api repos/wdsmcguigan/StudioFlowV2/commits/<sha>/check-runs`.

---

## Self-Review (plan vs spec)

- **Spec coverage:** data model (Tasks 2/5/7/13) · seeding (4) · manual breakdown (15) · AI engine + catalog-context + descriptor + extensible schema (10/11) · idempotent apply + confirm-safety (12) · re-anchoring three-state + status-preserved (8/9) · WDK job + cancel + queue panel (13/14/16) · downstream gate (6) · character merge atomic (7) · two-user RLS + junction escape (2/5) · Phase 1 fold-in #1 (1) · `use server` hygiene + browser smoke (17) · AI quality measurement (17) · designed-for seams = documented in spec, nothing to build. **All spec sections map to a task.**
- **Deferred correctly:** `segment_id` nullable (no task touches it beyond schema) · `estimated_cost` present-but-unused · cross-project promotion not attempted.
- **Type consistency:** `tagSceneElement`/`tagSceneCharacter`, `setSceneElementStatus`/`setSceneCharacterStatus`, `mergeCharacter`, `runBreakdown`, `applyBreakdownSuggestions`, `relocateAnchor`, `reanchorSceneTags`, `getBreakdownModel`, `listScenesForBreakdown` — names used consistently across tasks.
- **Known soft spots (flagged in-task, not placeholders):** AI mock class export name (verify Task 0); WDK fan-out/test-harness shape (verify against installed `workflow@4.3.1`); scene "body text" for breakdown uses synopsis until Phase 1.5 full-body reconstruction; text-selection capture in the tag UI may ship as quote-paste v1. These are real, scoped uncertainties with fallbacks — resolve at execution against installed packages.
