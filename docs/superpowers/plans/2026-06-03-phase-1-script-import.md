# Phase 1: Script Import & Scene Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a Fountain screenplay and turn it into a stable, project-scoped Scene model with a full versioning/reconciliation spine, so a re-imported draft diffs non-destructively against the existing scenes and matched scenes keep their immutable UUIDs.

**Architecture:** Mirrors the Phase 0 vertical slice exactly — RLS-protected Supabase tables (project-scoped via a `projects` join), a Zod typed contract (`lib/scripts/schema.ts`), a typed data layer over the `Database`-typed SSR client (`lib/scripts/data.ts`), server actions, and server components with Testing Library tests. The import pipeline is **ingest → parse (pure adapter) → stage → reconcile (pure 3-tier matcher) → review → apply (data layer preserves UUIDs, marks removed OMITTED, bumps the active revision set)**. All parsing, hashing, page-eighths, and reconciliation are pure functions tested in isolation; only the apply step touches the DB.

**Re-import is gated (stage → diff → user confirm → apply), never silently destructive.** First import (a brand-new script, all scenes new) straight-applies via `applyFirstImport` — nothing exists to lose. A **re-import** into an existing script is a *two-step, two-round-trip* flow: (1) the **stage** action creates the immutable `ScriptVersion` snapshot (storing `raw_source`) but **mutates no `scenes`** — it parses, reconciles against the live scenes, computes the structured diff, and renders the `DiffReview` screen with that diff and the new `scriptVersionId`; (2) the **confirm** action takes the `scriptVersionId` (+ the user's per-conflict resolution choices, defaulting to Final-Draft-wins), re-reads that version's stored `raw_source`, re-reconciles deterministically, and only then applies (preserve UUIDs for matches, mark removed as OMITTED-not-deleted, write `scene_sources`, record per-scene changes + conflicts). Because parse + reconcile are pure/deterministic, the diff recomputed at confirm equals the one shown at stage — the `ScriptVersion` row **is** the stage, so no separate staging table is needed.

**Tech Stack:** Next.js 16 (App Router, React 19, TS) · Supabase (`@supabase/ssr`, `@supabase/supabase-js`, generated `Database` types) · Zod v4 (`z.uuid()`, not `z.string().uuid()`) · `fountain-js@^1.2.4` (Fountain tokenizer) · `string-similarity@^4.0.4` (tier-3 fuzzy matching) · Vitest + @testing-library/react · shadcn/ui.

**Resolved scope decisions (from planning):**
1. **Fountain only in Phase 1.** The FDX adapter, FDX round-trip export, and the verbatim FDX passthrough bag are **deferred to Phase 1.5**. `source_format` is constrained to `('fountain')` now; `'fdx'` is added in 1.5. No FDX tasks appear below.
2. **Full versioning/reconciliation spine is IN Phase 1** (on Fountain + in-app scene-number locking): stable Scene UUIDs, locked-number aliases (append-only, OMITTED-not-deleted), immutable per-import `ScriptVersion` snapshots storing `raw_source`, the 3-tier reconciliation matcher (tier 1 locked-number key join; tier 2 slugline + content-hash; tier 3 fuzzy similarity with a confidence score), human review of low-confidence matches, the revision-set model seeded White→…→Tan with one active set, two write paths (in-app edits recorded into the active revision set; **gated re-import via stage→matcher→diff→user confirm→apply**, where staging mutates no scenes and apply runs only on confirmation), and conflict resolution (scene edited in-app AND changed in a re-imported draft → surfaced in diff review, default **Final-Draft-wins**, in-app edit retained in history for re-apply).
3. **Synchronous import** — no job runner. Fountain parse is sub-second; the UI shows a loading state. (Async jobs first appear in Phase 2 for AI breakdown.)
4. **`SceneSegment` is deferred to Phase 3.** Phase 1 stores `page_eighths` directly on the Scene. No `scene_segments` table.
5. **Everything project-scoped under RLS**, matching Phase 0's owner-based discipline: a row is visible/writable when its owning project's `owner_id = auth.uid()`, enforced via an `exists (select 1 from public.projects p where p.id = <table>.project_id and p.owner_id = auth.uid())` predicate. The reconciliation mapping is **persisted** (`scene_sources`) so it is computed once.

---

## File Structure

**Database**
- `supabase/migrations/0003_scripts_scenes.sql` *(create)* — `scripts`, `script_versions`, `scenes`, `scene_sources`, `revisions`, `scene_revision_changes` tables; RLS policies (project-scoped via `projects` join); grants to `authenticated`; FK + ordinal indexes.
- `lib/db/types.ts` *(modify — regenerated)* — adds the six new tables to the `Database` type.

**Typed contract**
- `lib/scripts/schema.ts` *(create)* — Zod schemas + inferred types: `intExt`, `timeOfDay`, `sceneStatus`, `sourceFormat`, `script`, `scriptVersion`, `scene`, `revision`, `createScriptInput`, `parsedScene` (`ParsedScene`), `sceneClassification`, `sceneDiffEntry` (`SceneDiff`).
- `lib/scripts/schema.test.ts` *(test)*.

**Pure services (no DB)**
- `lib/scripts/derive.ts` *(create — Task 3, before the adapter)* — `pageEighthsFromBody(body: string): number`, `deriveSynopsis(parsed: { synopsisLines: string[]; actionLines: string[] }): string`.
- `lib/scripts/derive.test.ts` *(test)*.
- `lib/scripts/fountain.ts` *(create — Task 4, imports the already-built `derive.ts`)* — `parseFountain(raw: string): ParsedScene[]` (uses `fountain-js`).
- `lib/scripts/fountain.test.ts` *(test)*.
- `lib/scripts/__fixtures__/*.fountain` *(create)* — real Fountain fixtures.
- `lib/scripts/hash.ts` *(create)* — `contentHash(p: ParsedScene): string`, `textAnchors(p: ParsedScene): { start: number; end: number }`.
- `lib/scripts/hash.test.ts` *(test)*.
- `lib/scripts/reconcile.ts` *(create)* — `reconcile(existing: ExistingScene[], parsed: ParsedScene[]): SceneDiff[]` (tiers 1–3) + helpers `matchTier1`, `matchTier2`, `matchTier3`.
- `lib/scripts/reconcile.test.ts` *(test)*.

**Data layer**
- `lib/scripts/data.ts` *(create)* — `createScript`, `listScripts`, `getScript`, `listScenes`, `getScene`, `applyFirstImport`, `loadExistingScenes`, `stageReimport` (snapshot version + compute diff, no scene mutation), `applyReconciledImport` (apply a previously-staged version on confirm), `updateSceneInApp`, `listRevisions`, `seedRevisions`, `setActiveRevision`, plus the conflict detector used by `applyReconciledImport`.
- `lib/scripts/data.test.ts` *(test — RLS + apply integration)*.

**Server actions + UI**
- `app/dashboard/[projectId]/import/actions.ts` *(create)* — `importScriptAction` (first import, straight-apply), `stageReimportAction` (re-import step 1: snapshot version + compute diff, **no scene mutation**), `confirmReimportAction` (re-import step 2: apply on confirmation).
- `app/dashboard/[projectId]/import/page.tsx` *(create)* — paste/upload Fountain, synchronous parse→apply, loading state.
- `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx` *(create)* — script read view + scene list.
- `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx` *(create)* — scene detail + in-app edit form.
- `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/actions.ts` *(create)* — `editSceneAction`.
- `components/scripts/import-form.tsx` *(create)* + `.test.tsx`.
- `components/scripts/scene-list.tsx` *(create)* + `.test.tsx`.
- `components/scripts/scene-detail.tsx` *(create)*.
- `components/scripts/diff-review.tsx` *(create)* + `.test.tsx`.

---

## Conventions to mirror (read these from Phase 0 before starting)

- **Migrations** (`supabase/migrations/0001_profiles_projects.sql`, `0002_projects_status_check.sql`): every table `enable row level security`; one policy per operation; UPDATE policies carry **both** `using` AND `with check`; `grant select, insert, update, delete ... to authenticated` (never `anon`); security-definer functions use `set search_path = ''` and fully-qualified `public.` names.
- **Zod** (`lib/projects/schema.ts`): `z.enum([...])` for enums; `createXInput` with `.trim().min(1)`; read-side schemas are **loose** where the DB column is `text` (e.g. `status: z.string()` with a comment); `z.uuid()` (Zod v4), never `z.string().uuid()`; export inferred types.
- **Data layer** (`lib/projects/data.ts`): SSR client via `@/lib/supabase/server`; `createXInput.parse(input)` on writes; `getUser()` auth check → `throw new Error("Not authenticated")`; `throw new Error(error.message, { cause: error })` on Supabase errors; `schema.parse(data)` on write-back; the client is `Database`-typed so **no `as` casts** are needed on reads (`return data;`).
- **RLS test** (`lib/projects/data.test.ts`): two users via the admin API (`createUser` with a random password, `email_confirm: true`), each signed in with the anon client; `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(...)`; run via `npx dotenv -e .env.local -- npm test -- <file>`.
- **Server action** (`app/dashboard/actions.ts`): `"use server"`; read `FormData`; `try/catch` around the data call with `console.error`; `revalidatePath(...)`.
- **Component test** (`components/projects/create-project-form.test.tsx`): `render` + `userEvent`; assert on `FormData` passed to a `vi.fn()` action.

---

## Data model (target shape — defined concretely in Task 1)

| Table | Key columns |
| --- | --- |
| `scripts` | `id` pk, `project_id`→projects, `title`, `created_at` |
| `script_versions` | `id` pk, `script_id`→scripts, `label`, `source_format` check `('fountain')`, `raw_source`, `revision_id`→revisions (nullable), `locked` default false, `imported_at`, `created_by`→auth.users |
| `scenes` | `id` pk (immutable), `project_id`→projects, `script_id`→scripts, `ordinal` int, `scene_number` (mutable), `number_locked` default false, `int_ext` check `('INT','EXT','INT/EXT')`, `location_slug`, `time_of_day`, `synopsis`, `page_eighths` int, `script_day`, `status` check `('active','omitted')` default `'active'`, `created_at`, `updated_at` |
| `scene_sources` | `(scene_id→scenes, script_version_id→script_versions)` pk, `content_hash`, `text_anchor_start` int, `text_anchor_end` int |
| `revisions` | `id` pk, `project_id`→projects, `name`, `color`, `ordinal` int, `active` default false, `created_at` |
| `scene_revision_changes` | `(scene_id→scenes, revision_id→revisions)` pk, `change_kind` check `('added','modified','omitted')`, `created_at` — per-scene "changed in revision set" tracking; one row whenever a scene is created/modified/omitted under a given active revision set (this is what later drives FDX asterisk emission in 1.5) |

Project-scoping predicate used by every policy below:
```
exists (select 1 from public.projects p where p.id = <table>.project_id and p.owner_id = auth.uid())
```
For `scene_sources` and `scene_revision_changes` (which have no `project_id`), the predicate joins through the owning scene/revision to its project. Exact SQL is in Task 1.

---

## Task 1: DB migration — scripts, versions, scenes, sources, revisions, change-tracking

**Files:**
- Create: `supabase/migrations/0003_scripts_scenes.sql`
- Modify: `lib/db/types.ts` (regenerated)

- [ ] **Step 1: Write the migration `supabase/migrations/0003_scripts_scenes.sql`**

```sql
-- ============================================================================
-- Phase 1: Script import & Scene model.
-- Everything project-scoped under RLS, mirroring Phase 0's owner-based access
-- (a row is visible/writable when its owning project's owner_id = auth.uid()).
-- ============================================================================

-- revisions: the FDX-style revision-set model (White -> ... -> Tan), one active set.
create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  color text not null,
  ordinal int not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- scripts: one per screenplay in a project (a project may have several, e.g. episodes).
create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- script_versions: immutable snapshot of an imported draft (raw source preserved).
create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  label text not null,
  source_format text not null default 'fountain'
    check (source_format in ('fountain')), -- 'fdx' added in Phase 1.5
  raw_source text not null,
  revision_id uuid references public.revisions(id) on delete set null,
  locked boolean not null default false,
  imported_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

-- scenes: stable, project-scoped, immutable id decoupled from mutable scene_number.
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  ordinal int not null,
  scene_number text,
  number_locked boolean not null default false,
  int_ext text check (int_ext in ('INT', 'EXT', 'INT/EXT')),
  location_slug text,
  time_of_day text,
  synopsis text,
  page_eighths int,
  script_day text,
  status text not null default 'active' check (status in ('active', 'omitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- scene_sources: links a Scene to the version(s) it appeared in + where (for reconciliation).
create table public.scene_sources (
  scene_id uuid not null references public.scenes(id) on delete cascade,
  script_version_id uuid not null references public.script_versions(id) on delete cascade,
  content_hash text not null,
  text_anchor_start int not null,
  text_anchor_end int not null,
  primary key (scene_id, script_version_id)
);

-- scene_revision_changes: per-scene "changed in revision set X" tracking.
create table public.scene_revision_changes (
  scene_id uuid not null references public.scenes(id) on delete cascade,
  revision_id uuid not null references public.revisions(id) on delete cascade,
  change_kind text not null check (change_kind in ('added', 'modified', 'omitted')),
  created_at timestamptz not null default now(),
  primary key (scene_id, revision_id)
);

-- Indexes on FKs + ordinal hot paths.
create index revisions_project_id_idx on public.revisions(project_id);
create index scripts_project_id_idx on public.scripts(project_id);
create index script_versions_script_id_idx on public.script_versions(script_id);
create index scenes_project_id_idx on public.scenes(project_id);
create index scenes_script_id_idx on public.scenes(script_id);
create index scenes_script_id_ordinal_idx on public.scenes(script_id, ordinal);
create index scene_sources_script_version_id_idx on public.scene_sources(script_version_id);
create index scene_revision_changes_revision_id_idx on public.scene_revision_changes(revision_id);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.revisions enable row level security;
alter table public.scripts enable row level security;
alter table public.script_versions enable row level security;
alter table public.scenes enable row level security;
alter table public.scene_sources enable row level security;
alter table public.scene_revision_changes enable row level security;

-- revisions: project-scoped.
create policy "revisions - select" on public.revisions
  for select using (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );
create policy "revisions - insert" on public.revisions
  for insert with check (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );
create policy "revisions - update" on public.revisions
  for update using (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );
create policy "revisions - delete" on public.revisions
  for delete using (
    exists (select 1 from public.projects p where p.id = revisions.project_id and p.owner_id = auth.uid())
  );

-- scripts: project-scoped.
create policy "scripts - select" on public.scripts
  for select using (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );
create policy "scripts - insert" on public.scripts
  for insert with check (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );
create policy "scripts - update" on public.scripts
  for update using (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );
create policy "scripts - delete" on public.scripts
  for delete using (
    exists (select 1 from public.projects p where p.id = scripts.project_id and p.owner_id = auth.uid())
  );

-- script_versions: scoped via the owning script's project.
create policy "script_versions - select" on public.script_versions
  for select using (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );
create policy "script_versions - insert" on public.script_versions
  for insert with check (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );
create policy "script_versions - update" on public.script_versions
  for update using (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );
create policy "script_versions - delete" on public.script_versions
  for delete using (
    exists (
      select 1 from public.scripts s join public.projects p on p.id = s.project_id
      where s.id = script_versions.script_id and p.owner_id = auth.uid()
    )
  );

-- scenes: project-scoped.
create policy "scenes - select" on public.scenes
  for select using (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );
create policy "scenes - insert" on public.scenes
  for insert with check (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );
create policy "scenes - update" on public.scenes
  for update using (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );
create policy "scenes - delete" on public.scenes
  for delete using (
    exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  );

-- scene_sources: scoped via the owning scene's project.
create policy "scene_sources - select" on public.scene_sources
  for select using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_sources - insert" on public.scene_sources
  for insert with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_sources - update" on public.scene_sources
  for update using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_sources - delete" on public.scene_sources
  for delete using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_sources.scene_id and p.owner_id = auth.uid()
    )
  );

-- scene_revision_changes: scoped via the owning scene's project.
create policy "scene_revision_changes - select" on public.scene_revision_changes
  for select using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_revision_changes - insert" on public.scene_revision_changes
  for insert with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_revision_changes - update" on public.scene_revision_changes
  for update using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );
create policy "scene_revision_changes - delete" on public.scene_revision_changes
  for delete using (
    exists (
      select 1 from public.scenes sc join public.projects p on p.id = sc.project_id
      where sc.id = scene_revision_changes.scene_id and p.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Grants: signed-in users only; RLS policies above gate every row.
-- ============================================================================
grant select, insert, update, delete on public.revisions to authenticated;
grant select, insert, update, delete on public.scripts to authenticated;
grant select, insert, update, delete on public.script_versions to authenticated;
grant select, insert, update, delete on public.scenes to authenticated;
grant select, insert, update, delete on public.scene_sources to authenticated;
grant select, insert, update, delete on public.scene_revision_changes to authenticated;
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run:
```bash
npx supabase migration up
```
Expected: migration `0003_scripts_scenes` applied; no errors.

- [ ] **Step 3: Verify the tables, RLS, and constraints live (psql checks)**

Run:
```bash
npx supabase db connect <<'SQL'
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('scripts','script_versions','scenes','scene_sources','revisions','scene_revision_changes')
order by tablename;
SQL
```
Expected: 6 rows, every `rowsecurity = t`. (If `db connect` is unavailable in this CLI version, use the `DATABASE_URL` printed by `supabase start` with `psql "$DATABASE_URL" -c "<query>"`.)

Then confirm the policies exist:
```bash
npx supabase db connect <<'SQL'
select tablename, count(*) as policy_count from pg_policies
where schemaname = 'public'
  and tablename in ('scripts','script_versions','scenes','scene_sources','revisions','scene_revision_changes')
group by tablename order by tablename;
SQL
```
Expected: each of the 6 tables has `policy_count = 4`.

- [ ] **Step 4: Regenerate TypeScript types**

Run:
```bash
npx supabase gen types typescript --local > lib/db/types.ts
```
Expected: `lib/db/types.ts` now contains `public.Tables.scripts`, `script_versions`, `scenes`, `scene_sources`, `revisions`, and `scene_revision_changes`.

- [ ] **Step 5: Verify types compile**

Run:
```bash
npm run typecheck
```
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add scripts/scenes/versions/revisions schema with project-scoped RLS"
```

---

## Task 2: Zod contracts (`lib/scripts/schema.ts`)

**Files:**
- Create: `lib/scripts/schema.ts`
- Test: `lib/scripts/schema.test.ts`

- [ ] **Step 1: Write the failing test `lib/scripts/schema.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  createScriptInput,
  intExt,
  sceneStatus,
  scene,
  parsedScene,
  sceneDiffEntry,
} from "@/lib/scripts/schema";

describe("createScriptInput", () => {
  it("accepts a valid title and trims it", () => {
    const parsed = createScriptInput.parse({ projectId: "11111111-1111-1111-1111-111111111111", title: "  Pilot  " });
    expect(parsed.title).toBe("Pilot");
  });

  it("rejects an empty title", () => {
    const result = createScriptInput.safeParse({ projectId: "11111111-1111-1111-1111-111111111111", title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid projectId", () => {
    const result = createScriptInput.safeParse({ projectId: "nope", title: "Pilot" });
    expect(result.success).toBe(false);
  });
});

describe("enums", () => {
  it("intExt accepts INT/EXT", () => {
    expect(intExt.safeParse("INT/EXT").success).toBe(true);
  });
  it("intExt rejects garbage", () => {
    expect(intExt.safeParse("INSIDE").success).toBe(false);
  });
  it("sceneStatus accepts omitted", () => {
    expect(sceneStatus.safeParse("omitted").success).toBe(true);
  });
});

describe("scene read schema", () => {
  it("is loose on int_ext (DB column is text, must not throw on unknown)", () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      project_id: "22222222-2222-2222-2222-222222222222",
      script_id: "33333333-3333-3333-3333-333333333333",
      ordinal: 1,
      scene_number: "1",
      number_locked: false,
      int_ext: "WEIRD",
      location_slug: "DINER",
      time_of_day: "DAY",
      synopsis: "They meet.",
      page_eighths: 8,
      script_day: "D1",
      status: "active",
      created_at: "2026-06-03T00:00:00Z",
      updated_at: "2026-06-03T00:00:00Z",
    };
    expect(scene.safeParse(row).success).toBe(true);
  });
});

describe("parsedScene", () => {
  it("validates adapter output", () => {
    const p = {
      sceneNumber: "5A",
      intExt: "INT",
      locationSlug: "DINER",
      timeOfDay: "DAY",
      bodyText: "ACTION.",
      synopsis: "They meet.",
      pageEighths: 8,
      textAnchorStart: 0,
      textAnchorEnd: 42,
      ordinal: 4,
    };
    expect(parsedScene.parse(p).sceneNumber).toBe("5A");
  });
});

describe("sceneDiffEntry", () => {
  it("classifies a modified scene with a matched id and confidence", () => {
    const d = {
      classification: "modified" as const,
      sceneId: "11111111-1111-1111-1111-111111111111",
      confidence: 0.82,
      parsedOrdinal: 3,
      parsed: {
        sceneNumber: "3",
        intExt: "EXT",
        locationSlug: "PARK",
        timeOfDay: "NIGHT",
        bodyText: "ACTION.",
        synopsis: "",
        pageEighths: 8,
        textAnchorStart: 0,
        textAnchorEnd: 10,
        ordinal: 2,
      },
    };
    expect(sceneDiffEntry.parse(d).classification).toBe("modified");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- lib/scripts/schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/scripts/schema`.

- [ ] **Step 3: Write `lib/scripts/schema.ts`**

```ts
import { z } from "zod";

// ---- Enums (write-side, strict) -------------------------------------------
export const intExt = z.enum(["INT", "EXT", "INT/EXT"]);
export type IntExt = z.infer<typeof intExt>;

export const sceneStatus = z.enum(["active", "omitted"]);
export type SceneStatus = z.infer<typeof sceneStatus>;

export const sourceFormat = z.enum(["fountain"]); // 'fdx' added in Phase 1.5
export type SourceFormat = z.infer<typeof sourceFormat>;

// ---- Write inputs ---------------------------------------------------------
export const createScriptInput = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
});
export type CreateScriptInput = z.infer<typeof createScriptInput>;

// ---- Read-side row schemas (loose where DB columns are text/nullable) ------
export const script = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  title: z.string(),
  created_at: z.string(),
});
export type Script = z.infer<typeof script>;

export const scriptVersion = z.object({
  id: z.uuid(),
  script_id: z.uuid(),
  label: z.string(),
  source_format: z.string(), // loose: DB column is text
  raw_source: z.string(),
  revision_id: z.uuid().nullable(),
  locked: z.boolean(),
  imported_at: z.string(),
  created_by: z.uuid(),
});
export type ScriptVersion = z.infer<typeof scriptVersion>;

export const scene = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  script_id: z.uuid(),
  ordinal: z.number().int(),
  scene_number: z.string().nullable(),
  number_locked: z.boolean(),
  int_ext: z.string().nullable(), // loose: DB column is text
  location_slug: z.string().nullable(),
  time_of_day: z.string().nullable(),
  synopsis: z.string().nullable(),
  page_eighths: z.number().int().nullable(),
  script_day: z.string().nullable(),
  status: z.string(), // loose: DB column is text
  created_at: z.string(),
  updated_at: z.string(),
});
export type Scene = z.infer<typeof scene>;

export const revision = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  name: z.string(),
  color: z.string(),
  ordinal: z.number().int(),
  active: z.boolean(),
  created_at: z.string(),
});
export type Revision = z.infer<typeof revision>;

// ---- Adapter output (normalized parsed scene) -----------------------------
export const parsedScene = z.object({
  sceneNumber: z.string().nullable(),
  intExt: z.string().nullable(),
  locationSlug: z.string().nullable(),
  timeOfDay: z.string().nullable(),
  bodyText: z.string(),
  synopsis: z.string(),
  pageEighths: z.number().int(),
  textAnchorStart: z.number().int(),
  textAnchorEnd: z.number().int(),
  ordinal: z.number().int(),
});
export type ParsedScene = z.infer<typeof parsedScene>;

// ---- Reconciliation diff --------------------------------------------------
export const sceneClassification = z.enum([
  "unchanged",
  "modified",
  "new",
  "removed",
  "conflict",
]);
export type SceneClassification = z.infer<typeof sceneClassification>;

export const sceneDiffEntry = z.object({
  classification: sceneClassification,
  // The matched existing scene id (null for "new").
  sceneId: z.uuid().nullable().default(null),
  // 1.0 for exact (tier 1/2) matches; < 1.0 for fuzzy (tier 3); 0 for new/removed.
  confidence: z.number().min(0).max(1).default(0),
  // Ordinal of the parsed scene driving this entry (null for "removed").
  parsedOrdinal: z.number().int().nullable().default(null),
  // The incoming parsed scene (null for "removed").
  parsed: parsedScene.nullable().default(null),
});
export type SceneDiff = z.infer<typeof sceneDiffEntry>;
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- lib/scripts/schema.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add scripts/scenes Zod contracts (typed contract)"
```

---

## Task 3: Page-eighths + synopsis derivation (`lib/scripts/derive.ts`)

> Built **before** the Fountain adapter (Task 4) so the adapter can import an already-existing `derive.ts` and go green within its own task.

**Files:**
- Create: `lib/scripts/derive.ts`
- Test: `lib/scripts/derive.test.ts`

- [ ] **Step 1: Write the failing test `lib/scripts/derive.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { pageEighthsFromBody, deriveSynopsis } from "@/lib/scripts/derive";

describe("pageEighthsFromBody", () => {
  it("returns at least 1 eighth for any non-empty body", () => {
    expect(pageEighthsFromBody("A short line.")).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 for an empty body", () => {
    expect(pageEighthsFromBody("")).toBe(0);
    expect(pageEighthsFromBody("   \n  ")).toBe(0);
  });

  it("scales roughly with length (8 eighths ~= a full page ~= 55 lines)", () => {
    const oneLine = pageEighthsFromBody("x");
    const manyLines = pageEighthsFromBody(Array.from({ length: 55 }, () => "line").join("\n"));
    expect(manyLines).toBeGreaterThan(oneLine);
    expect(manyLines).toBe(8);
  });

  it("caps a single scene at a sane maximum and never returns a fraction", () => {
    const huge = pageEighthsFromBody(Array.from({ length: 5000 }, () => "line").join("\n"));
    expect(Number.isInteger(huge)).toBe(true);
    expect(huge).toBeGreaterThan(8);
  });
});

describe("deriveSynopsis", () => {
  it("prefers explicit synopsis lines, joined", () => {
    const s = deriveSynopsis({
      synopsisLines: ["They meet.", "It goes badly."],
      actionLines: ["Mary enters."],
    });
    expect(s).toBe("They meet. It goes badly.");
  });

  it("falls back to the first action line when there is no synopsis", () => {
    const s = deriveSynopsis({ synopsisLines: [], actionLines: ["Mary enters the diner.", "She sits."] });
    expect(s).toBe("Mary enters the diner.");
  });

  it("returns an empty string when there is nothing to derive", () => {
    expect(deriveSynopsis({ synopsisLines: [], actionLines: [] })).toBe("");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- lib/scripts/derive.test.ts`
Expected: FAIL — cannot resolve `@/lib/scripts/derive`.

- [ ] **Step 3: Write `lib/scripts/derive.ts`**

```ts
// Page-eighths heuristic: a standard screenplay page is ~55 lines of content and
// is 8/8ths. We approximate a scene's eighths from its rendered line count.
// Fountain carries no pagination, so this is a stored approximation (per spec).
const LINES_PER_PAGE = 55;

export function pageEighthsFromBody(body: string): number {
  const trimmed = body.trim();
  if (trimmed.length === 0) return 0;
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0).length;
  const eighths = Math.ceil((lines / LINES_PER_PAGE) * 8);
  return Math.max(1, eighths);
}

export function deriveSynopsis(input: {
  synopsisLines: string[];
  actionLines: string[];
}): string {
  if (input.synopsisLines.length > 0) {
    return input.synopsisLines.map((l) => l.trim()).join(" ");
  }
  if (input.actionLines.length > 0) {
    return input.actionLines[0].trim();
  }
  return "";
}
```

- [ ] **Step 4: Run the derive test — expect pass**

Run: `npm test -- lib/scripts/derive.test.ts`
Expected: all tests pass (no external dependency; goes green within this task).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add page-eighths + synopsis derivation helpers"
```

---

## Task 4: Fountain adapter (`lib/scripts/fountain.ts`)

> Depends on Task 3's `derive.ts`, which is already built — so this task's test goes green within the task.

**Files:**
- Create: `lib/scripts/fountain.ts`
- Create: `lib/scripts/__fixtures__/simple.fountain`, `lib/scripts/__fixtures__/tricky.fountain`
- Test: `lib/scripts/fountain.test.ts`

- [ ] **Step 1: Install the Fountain parser**

```bash
npm install fountain-js@^1.2.4
```
Expected: `fountain-js` added to `dependencies`.

- [ ] **Step 2: Create fixture `lib/scripts/__fixtures__/simple.fountain`**

```
Title: Simple Test
Credit: Written by
Author: A. Writer

INT. DINER - DAY

Mary sits alone at the counter.

MARY
Coffee. Black.

EXT. PARKING LOT - NIGHT

A car idles under a flickering light.
```

- [ ] **Step 3: Create fixture `lib/scripts/__fixtures__/tricky.fountain`**

This exercises INT/EXT combos, a `5A` scene-number suffix, an OMITTED scene, a `=` synopsis line, and dual dialogue.

```
INT./EXT. PATROL CAR - NIGHT #5A#

= They tail the suspect through downtown.

The car weaves through traffic.

SAM ^
Go left!

JESSE ^
No, right!

EXT. WAREHOUSE - DAY

Rain hammers the corrugated roof.

INT. WAREHOUSE - CONTINUOUS

OMITTED
```

- [ ] **Step 4: Write the failing test `lib/scripts/fountain.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFountain } from "@/lib/scripts/fountain";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf8");

describe("parseFountain", () => {
  it("extracts both scenes from a simple script with INT/EXT, slug, and time", () => {
    const scenes = parseFountain(fixture("simple.fountain"));
    expect(scenes).toHaveLength(2);

    expect(scenes[0].intExt).toBe("INT");
    expect(scenes[0].locationSlug).toBe("DINER");
    expect(scenes[0].timeOfDay).toBe("DAY");
    expect(scenes[0].ordinal).toBe(0);

    expect(scenes[1].intExt).toBe("EXT");
    expect(scenes[1].locationSlug).toBe("PARKING LOT");
    expect(scenes[1].timeOfDay).toBe("NIGHT");
    expect(scenes[1].ordinal).toBe(1);
  });

  it("captures body text under each heading", () => {
    const scenes = parseFountain(fixture("simple.fountain"));
    expect(scenes[0].bodyText).toContain("Mary sits alone");
    expect(scenes[0].bodyText).toContain("Coffee. Black.");
    expect(scenes[1].bodyText).toContain("A car idles");
  });

  it("parses INT/EXT combos, a 5A scene number, a synopsis line, and OMITTED", () => {
    const scenes = parseFountain(fixture("tricky.fountain"));
    expect(scenes).toHaveLength(4);

    // INT./EXT. combo normalized to INT/EXT, scene number from #5A#.
    expect(scenes[0].intExt).toBe("INT/EXT");
    expect(scenes[0].locationSlug).toBe("PATROL CAR");
    expect(scenes[0].timeOfDay).toBe("NIGHT");
    expect(scenes[0].sceneNumber).toBe("5A");
    // The "=" synopsis line is captured as synopsis, not body.
    expect(scenes[0].synopsis).toBe("They tail the suspect through downtown.");
    expect(scenes[0].bodyText).not.toContain("They tail the suspect");

    // CONTINUOUS is captured as the time-of-day token.
    expect(scenes[3].timeOfDay).toBe("CONTINUOUS");
    expect(scenes[3].bodyText).toContain("OMITTED");
  });

  it("assigns monotonically increasing text anchors", () => {
    const scenes = parseFountain(fixture("simple.fountain"));
    expect(scenes[0].textAnchorStart).toBe(0);
    expect(scenes[0].textAnchorEnd).toBeGreaterThan(scenes[0].textAnchorStart);
    expect(scenes[1].textAnchorStart).toBeGreaterThanOrEqual(scenes[0].textAnchorEnd);
  });
});
```

- [ ] **Step 5: Run the test to confirm it fails**

Run: `npm test -- lib/scripts/fountain.test.ts`
Expected: FAIL — cannot resolve `@/lib/scripts/fountain`.

- [ ] **Step 6: Write `lib/scripts/fountain.ts`**

`fountain-js` exposes a `Fountain` class whose `parse(text, getTokens=true)` returns `{ html, tokens }`. Tokens are ordered objects of the form `{ type, text, scene_number?, ... }` with types including `scene_heading`, `action`, `synopsis`, `character`, `dialogue`, `parenthetical`, `transition`. We post-process the token stream into scenes: a `scene_heading` opens a new scene; everything until the next heading is its body (with `synopsis` tokens pulled aside).

```ts
import { Fountain } from "fountain-js";
import { pageEighthsFromBody, deriveSynopsis } from "@/lib/scripts/derive";
import type { ParsedScene } from "@/lib/scripts/schema";

type Token = { type: string; text?: string; scene_number?: string };

const HEADING_RE =
  /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|EST\.?|I\/E)\s+(.*)$/i;

function normalizeIntExt(raw: string): string | null {
  const u = raw.toUpperCase().replace(/\./g, "");
  if (u === "INT/EXT" || u === "EXT/INT" || u === "I/E") return "INT/EXT";
  if (u === "INT") return "INT";
  if (u === "EXT" || u === "EST") return "EXT";
  return null;
}

/** Split "DINER - DAY" -> { locationSlug: "DINER", timeOfDay: "DAY" }. */
function splitLocationTime(rest: string): {
  locationSlug: string | null;
  timeOfDay: string | null;
} {
  const idx = rest.lastIndexOf(" - ");
  if (idx === -1) {
    return { locationSlug: rest.trim() || null, timeOfDay: null };
  }
  return {
    locationSlug: rest.slice(0, idx).trim() || null,
    timeOfDay: rest.slice(idx + 3).trim() || null,
  };
}

/** Parse a Fountain scene-heading line into its parts. */
function parseHeading(headingText: string): {
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
} {
  const m = headingText.trim().match(HEADING_RE);
  if (!m) return { intExt: null, locationSlug: null, timeOfDay: null };
  const intExt = normalizeIntExt(m[1]);
  const { locationSlug, timeOfDay } = splitLocationTime(m[2]);
  return { intExt, locationSlug, timeOfDay };
}

export function parseFountain(raw: string): ParsedScene[] {
  const { tokens } = new Fountain().parse(raw, true) as { tokens: Token[] };

  const scenes: ParsedScene[] = [];
  let current:
    | { heading: Token; synopsisLines: string[]; actionLines: string[]; bodyLines: string[] }
    | null = null;
  let ordinal = 0;
  let cursor = 0; // running char offset for text anchors

  const flush = () => {
    if (!current) return;
    const bodyText = current.bodyLines.join("\n").trim();
    const heading = (current.heading.text ?? "").trim();
    const { intExt, locationSlug, timeOfDay } = parseHeading(heading);
    const start = cursor;
    const end = cursor + heading.length + bodyText.length;
    scenes.push({
      sceneNumber: current.heading.scene_number ?? null,
      intExt,
      locationSlug,
      timeOfDay,
      bodyText,
      synopsis: deriveSynopsis({
        synopsisLines: current.synopsisLines,
        actionLines: current.actionLines,
      }),
      pageEighths: pageEighthsFromBody(bodyText),
      textAnchorStart: start,
      textAnchorEnd: end,
      ordinal: ordinal++,
    });
    cursor = end;
    current = null;
  };

  for (const t of tokens) {
    if (t.type === "scene_heading") {
      flush();
      current = { heading: t, synopsisLines: [], actionLines: [], bodyLines: [] };
      continue;
    }
    if (!current) continue; // tokens before the first heading (title page) are ignored
    const text = (t.text ?? "").trim();
    if (!text) continue;
    if (t.type === "synopsis") {
      current.synopsisLines.push(text);
      continue; // synopsis is pulled aside, not part of body
    }
    if (t.type === "action") current.actionLines.push(text);
    current.bodyLines.push(text);
  }
  flush();

  return scenes;
}
```

- [ ] **Step 7: Run the test — expect pass**

Run: `npm test -- lib/scripts/fountain.test.ts`
Expected: all tests pass. `@/lib/scripts/derive` already exists (Task 3), so the adapter's dependency resolves and its tests go green within this task.

- [ ] **Step 8: Commit the adapter + fixtures**

```bash
git add -A && git commit -m "feat: add Fountain adapter + fixtures (parseFountain)"
```

---

## Task 5: Content hash + text anchors (`lib/scripts/hash.ts`)

**Files:**
- Create: `lib/scripts/hash.ts`
- Test: `lib/scripts/hash.test.ts`

- [ ] **Step 1: Write the failing test `lib/scripts/hash.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { contentHash, textAnchors } from "@/lib/scripts/hash";
import type { ParsedScene } from "@/lib/scripts/schema";

const base: ParsedScene = {
  sceneNumber: "1",
  intExt: "INT",
  locationSlug: "DINER",
  timeOfDay: "DAY",
  bodyText: "Mary sits alone.",
  synopsis: "",
  pageEighths: 8,
  textAnchorStart: 0,
  textAnchorEnd: 16,
  ordinal: 0,
};

describe("contentHash", () => {
  it("is stable for identical content", () => {
    expect(contentHash(base)).toBe(contentHash({ ...base }));
  });

  it("ignores the scene number (numbers are mutable; content is what matters)", () => {
    expect(contentHash(base)).toBe(contentHash({ ...base, sceneNumber: "5A" }));
  });

  it("ignores anchors and ordinal (position is not content)", () => {
    expect(contentHash(base)).toBe(
      contentHash({ ...base, ordinal: 99, textAnchorStart: 500, textAnchorEnd: 600 }),
    );
  });

  it("changes when the slugline changes", () => {
    expect(contentHash(base)).not.toBe(contentHash({ ...base, locationSlug: "PARK" }));
  });

  it("changes when the body changes", () => {
    expect(contentHash(base)).not.toBe(contentHash({ ...base, bodyText: "Mary stands." }));
  });
});

describe("textAnchors", () => {
  it("echoes the parsed scene's anchors", () => {
    expect(textAnchors(base)).toEqual({ start: 0, end: 16 });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- lib/scripts/hash.test.ts`
Expected: FAIL — cannot resolve `@/lib/scripts/hash`.

- [ ] **Step 3: Write `lib/scripts/hash.ts`**

```ts
import { createHash } from "node:crypto";
import type { ParsedScene } from "@/lib/scripts/schema";

/** Build the content fingerprint of a scene from its *content* only —
 *  slugline + body. Scene number, ordinal, and anchors are excluded because
 *  they are positional/mutable, not content (used by reconciliation tier 2). */
export function contentHash(p: ParsedScene): string {
  const slug = [p.intExt ?? "", p.locationSlug ?? "", p.timeOfDay ?? ""]
    .join("|")
    .toUpperCase();
  const body = p.bodyText.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${slug} ${body}`).digest("hex");
}

export function textAnchors(p: ParsedScene): { start: number; end: number } {
  return { start: p.textAnchorStart, end: p.textAnchorEnd };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- lib/scripts/hash.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add content-hash + text-anchor helpers for reconciliation"
```

---

## Task 6: Scenes data layer + first-import apply (`lib/scripts/data.ts`)

**Files:**
- Create: `lib/scripts/data.ts`
- Test: `lib/scripts/data.test.ts`

- [ ] **Step 1: Write the failing RLS + apply integration test `lib/scripts/data.test.ts`**

This mirrors `lib/projects/data.test.ts` (two users, admin API, `skipIf`). It drives the **first-import** path end-to-end against local Supabase and asserts project-scoping.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { parseFountain } from "@/lib/scripts/fountain";

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

  beforeAll(async () => {
    alice = await makeUser(`alice-${Date.now()}@test.dev`);
    bob = await makeUser(`bob-${Date.now()}@test.dev`);
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
});
```

- [ ] **Step 2: Run the test to confirm RLS isolation holds**

Run:
```bash
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: all 3 tests pass (the migration's RLS already enforces isolation; this validates the schema/RLS the way Phase 0 Task 6 Step 2 does). If the isolation tests fail, fix the Task 1 policies before continuing.

- [ ] **Step 3: Write the typed data layer `lib/scripts/data.ts` (first-import path + reads)**

```ts
import { createClient } from "@/lib/supabase/server";
import {
  createScriptInput,
  script,
  scriptVersion,
  scene,
  type CreateScriptInput,
  type Script,
  type ScriptVersion,
  type Scene,
  type ParsedScene,
} from "@/lib/scripts/schema";
import { contentHash } from "@/lib/scripts/hash";

export async function createScript(input: CreateScriptInput): Promise<Script> {
  const parsed = createScriptInput.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scripts")
    .insert({ project_id: parsed.projectId, title: parsed.title })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return script.parse(data);
}

export async function listScripts(projectId: string): Promise<Script[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message, { cause: error });
  return data;
}

export async function getScript(scriptId: string): Promise<Script | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", scriptId)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? script.parse(data) : null;
}

export async function listScenes(scriptId: string): Promise<Scene[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("script_id", scriptId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(error.message, { cause: error });
  return data;
}

export async function getScene(sceneId: string): Promise<Scene | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? scene.parse(data) : null;
}

export async function getLatestVersion(scriptId: string): Promise<ScriptVersion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("script_versions")
    .select("*")
    .eq("script_id", scriptId)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? scriptVersion.parse(data) : null;
}

/** First import: create the version snapshot + all scenes as new + their sources. */
export async function applyFirstImport(args: {
  projectId: string;
  scriptId: string;
  label: string;
  rawSource: string;
  parsed: ParsedScene[];
}): Promise<{ versionId: string; sceneIds: string[] }> {
  const { projectId, scriptId, label, rawSource, parsed } = args;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data: version, error: versionError } = await supabase
    .from("script_versions")
    .insert({
      script_id: scriptId,
      label,
      source_format: "fountain",
      raw_source: rawSource,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });

  const sceneRows = parsed.map((p) => ({
    project_id: projectId,
    script_id: scriptId,
    ordinal: p.ordinal,
    scene_number: p.sceneNumber,
    int_ext: p.intExt,
    location_slug: p.locationSlug,
    time_of_day: p.timeOfDay,
    synopsis: p.synopsis,
    page_eighths: p.pageEighths,
    status: "active" as const,
  }));
  const { data: scenes, error: scenesError } = await supabase
    .from("scenes")
    .insert(sceneRows)
    .select("id, ordinal");
  if (scenesError) throw new Error(scenesError.message, { cause: scenesError });

  const byOrdinal = new Map(scenes.map((s) => [s.ordinal, s.id]));
  const sourceRows = parsed.map((p) => ({
    scene_id: byOrdinal.get(p.ordinal)!,
    script_version_id: version.id,
    content_hash: contentHash(p),
    text_anchor_start: p.textAnchorStart,
    text_anchor_end: p.textAnchorEnd,
  }));
  const { error: sourcesError } = await supabase.from("scene_sources").insert(sourceRows);
  if (sourcesError) throw new Error(sourcesError.message, { cause: sourcesError });

  return {
    versionId: version.id,
    sceneIds: parsed.map((p) => byOrdinal.get(p.ordinal)!),
  };
}
```

- [ ] **Step 4: Verify typecheck + integration tests pass**

Run:
```bash
npm run typecheck
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: no type errors; the 3 RLS/first-import tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add scripts/scenes data layer + first-import apply (RLS tested)"
```

---

## Task 7: Import server action + minimal Import UI

**Files:**
- Create: `app/dashboard/[projectId]/import/actions.ts`
- Create: `app/dashboard/[projectId]/import/page.tsx`
- Create: `components/scripts/import-form.tsx`
- Test: `components/scripts/import-form.test.tsx`

- [ ] **Step 1: Write the failing component test `components/scripts/import-form.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportForm } from "@/components/scripts/import-form";

describe("ImportForm", () => {
  it("submits the entered title and pasted Fountain source", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(<ImportForm action={action} />);

    await userEvent.type(screen.getByPlaceholderText("Script title"), "Pilot");
    await userEvent.type(
      screen.getByPlaceholderText("Paste Fountain source here"),
      "INT. DINER - DAY",
    );
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(action).toHaveBeenCalled();
    const fd = action.mock.calls[0][0] as FormData;
    expect(fd.get("title")).toBe("Pilot");
    expect(fd.get("source")).toContain("INT. DINER");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- components/scripts/import-form.test.tsx`
Expected: FAIL — cannot resolve `@/components/scripts/import-form`.

- [ ] **Step 3: Write `components/scripts/import-form.tsx`**

```tsx
"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Importing…" : "Import"}
    </Button>
  );
}

export function ImportForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="script-title" className="sr-only">
        Script title
      </label>
      <Input id="script-title" name="title" placeholder="Script title" required />
      <label htmlFor="script-source" className="sr-only">
        Fountain source
      </label>
      <textarea
        id="script-source"
        name="source"
        placeholder="Paste Fountain source here"
        required
        rows={16}
        className="rounded border px-3 py-2 font-mono text-sm"
      />
      <SubmitButton />
    </form>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- components/scripts/import-form.test.tsx`
Expected: 1 passed.

- [ ] **Step 5: Write `app/dashboard/[projectId]/import/actions.ts`**

```ts
"use server";
import { redirect } from "next/navigation";
import { createScript, applyFirstImport, listScripts } from "@/lib/scripts/data";
import { parseFountain } from "@/lib/scripts/fountain";

export async function importScriptAction(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "");
  if (!title || !source.trim()) return;

  let scriptId: string;
  try {
    const script = await createScript({ projectId, title });
    scriptId = script.id;
    const parsed = parseFountain(source);
    await applyFirstImport({
      projectId,
      scriptId,
      label: "v1",
      rawSource: source,
      parsed,
    });
  } catch (err) {
    // TODO (UX phase): surface a structured error via useActionState
    console.error("[importScriptAction]", err);
    return;
  }
  redirect(`/dashboard/${projectId}/scripts/${scriptId}`);
}

// Re-export so the import page can list existing scripts without another import.
export { listScripts };
```

- [ ] **Step 6: Write `app/dashboard/[projectId]/import/page.tsx`**

```tsx
import { ImportForm } from "@/components/scripts/import-form";
import { importScriptAction } from "./actions";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const action = importScriptAction.bind(null, projectId);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Import script</h1>
      <p className="text-sm text-muted-foreground">
        Paste a Fountain screenplay. We parse it into structured scenes instantly.
      </p>
      <ImportForm action={action} />
    </main>
  );
}
```

- [ ] **Step 7: Add an "Import script" entry point to the dashboard**

In `app/dashboard/page.tsx`, the project list links each project to its import page. Add this inside `ProjectList`'s card in `components/projects/project-list.tsx`, after the status line:

```tsx
<a
  href={`/dashboard/${p.id}/import`}
  className="mt-2 inline-block text-sm underline"
>
  Import script
</a>
```

- [ ] **Step 8: Verify build + typecheck**

Run:
```bash
npm run typecheck && npm run build
```
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add Fountain import action + paste/upload UI (first import)"
```

---

## Task 8: Script read view + Scene list + Scene detail

**Files:**
- Create: `components/scripts/scene-list.tsx`
- Test: `components/scripts/scene-list.test.tsx`
- Create: `components/scripts/scene-detail.tsx`
- Create: `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx`
- Create: `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx`

- [ ] **Step 1: Write the failing test `components/scripts/scene-list.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceneList } from "@/components/scripts/scene-list";
import type { Scene } from "@/lib/scripts/schema";

const scenes: Scene[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    project_id: "22222222-2222-2222-2222-222222222222",
    script_id: "33333333-3333-3333-3333-333333333333",
    ordinal: 0,
    scene_number: "1",
    number_locked: false,
    int_ext: "INT",
    location_slug: "DINER",
    time_of_day: "DAY",
    synopsis: "Mary waits.",
    page_eighths: 8,
    script_day: "D1",
    status: "active",
    created_at: "2026-06-03T00:00:00Z",
    updated_at: "2026-06-03T00:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    project_id: "22222222-2222-2222-2222-222222222222",
    script_id: "33333333-3333-3333-3333-333333333333",
    ordinal: 1,
    scene_number: "2",
    number_locked: false,
    int_ext: "EXT",
    location_slug: "PARKING LOT",
    time_of_day: "NIGHT",
    synopsis: "The car idles.",
    page_eighths: 4,
    script_day: null,
    status: "omitted",
    created_at: "2026-06-03T00:00:00Z",
    updated_at: "2026-06-03T00:00:00Z",
  },
];

describe("SceneList", () => {
  it("renders each scene with number, INT/EXT, slug, time, and eighths", () => {
    render(<SceneList projectId="p" scriptId="s" scenes={scenes} />);
    expect(screen.getByText("DINER")).toBeInTheDocument();
    expect(screen.getByText("PARKING LOT")).toBeInTheDocument();
    expect(screen.getByText("INT")).toBeInTheDocument();
    expect(screen.getByText("EXT")).toBeInTheDocument();
    expect(screen.getByText("DAY")).toBeInTheDocument();
  });

  it("marks omitted scenes", () => {
    render(<SceneList projectId="p" scriptId="s" scenes={scenes} />);
    expect(screen.getByText(/omitted/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no scenes", () => {
    render(<SceneList projectId="p" scriptId="s" scenes={[]} />);
    expect(screen.getByText(/no scenes/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- components/scripts/scene-list.test.tsx`
Expected: FAIL — cannot resolve `@/components/scripts/scene-list`.

- [ ] **Step 3: Write `components/scripts/scene-list.tsx`**

```tsx
import type { Scene } from "@/lib/scripts/schema";

export function SceneList({
  projectId,
  scriptId,
  scenes,
}: {
  projectId: string;
  scriptId: string;
  scenes: Scene[];
}) {
  if (scenes.length === 0) {
    return <p className="text-muted-foreground">No scenes yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 pr-3">#</th>
          <th className="py-1 pr-3">I/E</th>
          <th className="py-1 pr-3">Location</th>
          <th className="py-1 pr-3">D/N</th>
          <th className="py-1 pr-3">8ths</th>
          <th className="py-1 pr-3">Synopsis</th>
        </tr>
      </thead>
      <tbody>
        {scenes.map((s) => (
          <tr key={s.id} className={s.status === "omitted" ? "text-muted-foreground line-through" : ""}>
            <td className="py-1 pr-3">
              <a
                href={`/dashboard/${projectId}/scripts/${scriptId}/scenes/${s.id}`}
                className="underline"
              >
                {s.scene_number ?? s.ordinal + 1}
              </a>
              {s.status === "omitted" ? <span className="ml-1 no-underline">(omitted)</span> : null}
            </td>
            <td className="py-1 pr-3">{s.int_ext}</td>
            <td className="py-1 pr-3">{s.location_slug}</td>
            <td className="py-1 pr-3">{s.time_of_day}</td>
            <td className="py-1 pr-3">{s.page_eighths}</td>
            <td className="py-1 pr-3">{s.synopsis}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- components/scripts/scene-list.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Write `components/scripts/scene-detail.tsx`**

```tsx
import type { Scene } from "@/lib/scripts/schema";

export function SceneDetail({ scene, body }: { scene: Scene; body: string }) {
  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">
          {scene.scene_number ?? scene.ordinal + 1}. {scene.int_ext} {scene.location_slug} —{" "}
          {scene.time_of_day}
        </h1>
        <p className="text-sm text-muted-foreground">
          {scene.page_eighths}/8 page{scene.script_day ? ` · ${scene.script_day}` : ""} ·{" "}
          {scene.status}
        </p>
        {scene.synopsis ? <p className="mt-1 text-sm">{scene.synopsis}</p> : null}
      </header>
      <pre className="whitespace-pre-wrap font-mono text-sm">{body}</pre>
    </article>
  );
}
```

- [ ] **Step 6: Write `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getScript, listScenes, getLatestVersion } from "@/lib/scripts/data";
import { SceneList } from "@/components/scripts/scene-list";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ projectId: string; scriptId: string }>;
}) {
  const { projectId, scriptId } = await params;
  const script = await getScript(scriptId);
  if (!script) notFound();
  const [scenes, version] = await Promise.all([
    listScenes(scriptId),
    getLatestVersion(scriptId),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{script.title}</h1>
        <a href={`/dashboard/${projectId}/import`} className="text-sm underline">
          Re-import draft
        </a>
      </div>
      <SceneList projectId={projectId} scriptId={scriptId} scenes={scenes} />
      {version ? (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Read view (raw source)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">{version.raw_source}</pre>
        </details>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 7: Write `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getScene, getLatestVersion } from "@/lib/scripts/data";
import { parseFountain } from "@/lib/scripts/fountain";
import { SceneDetail } from "@/components/scripts/scene-detail";

export default async function ScenePage({
  params,
}: {
  params: Promise<{ projectId: string; scriptId: string; sceneId: string }>;
}) {
  const { scriptId, sceneId } = await params;
  const scene = await getScene(sceneId);
  if (!scene) notFound();
  const version = await getLatestVersion(scriptId);
  const body =
    version ? (parseFountain(version.raw_source)[scene.ordinal]?.bodyText ?? "") : "";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <SceneDetail scene={scene} body={body} />
    </main>
  );
}
```

- [ ] **Step 8: Verify build + typecheck**

Run:
```bash
npm run typecheck && npm run build
```
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add script read view, scene list, and scene detail"
```

---

## Task 9: Reconciliation matcher — tiers 1 & 2 (`lib/scripts/reconcile.ts`)

**Files:**
- Create: `lib/scripts/reconcile.ts`
- Test: `lib/scripts/reconcile.test.ts`

The matcher is **pure**: it takes the existing scenes (with their stored hashes and locked numbers) plus the freshly parsed scenes, and produces a `SceneDiff[]`. Tier 1 = locked-number key join; tier 2 = slugline + content hash; tier 3 (Task 10) = fuzzy.

- [ ] **Step 1: Write the failing test `lib/scripts/reconcile.test.ts` (tiers 1 & 2 only)**

```ts
import { describe, it, expect } from "vitest";
import { reconcile, type ExistingScene } from "@/lib/scripts/reconcile";
import { contentHash } from "@/lib/scripts/hash";
import type { ParsedScene } from "@/lib/scripts/schema";

function parsed(over: Partial<ParsedScene> & { ordinal: number }): ParsedScene {
  return {
    sceneNumber: null,
    intExt: "INT",
    locationSlug: "DINER",
    timeOfDay: "DAY",
    bodyText: "Mary sits alone.",
    synopsis: "",
    pageEighths: 8,
    textAnchorStart: 0,
    textAnchorEnd: 10,
    ...over,
  };
}

function existingFrom(p: ParsedScene, id: string, opts: { locked?: boolean } = {}): ExistingScene {
  return {
    sceneId: id,
    sceneNumber: p.sceneNumber,
    numberLocked: opts.locked ?? false,
    contentHash: contentHash(p),
    intExt: p.intExt,
    locationSlug: p.locationSlug,
    timeOfDay: p.timeOfDay,
    bodyText: p.bodyText,
    ordinal: p.ordinal,
  };
}

describe("reconcile — tier 2 (slugline + content hash)", () => {
  it("classifies an unchanged scene and preserves its id", () => {
    const a = parsed({ ordinal: 0 });
    const existing = [existingFrom(a, "id-a")];
    const diff = reconcile(existing, [parsed({ ordinal: 0 })]);
    const entry = diff.find((d) => d.sceneId === "id-a")!;
    expect(entry.classification).toBe("unchanged");
    expect(entry.confidence).toBe(1);
  });

  it("classifies a modified scene (same slug, changed body) and keeps the id", () => {
    const a = parsed({ ordinal: 0, bodyText: "Mary sits alone." });
    const existing = [existingFrom(a, "id-a")];
    const diff = reconcile(existing, [parsed({ ordinal: 0, bodyText: "Mary stands and leaves." })]);
    const entry = diff.find((d) => d.sceneId === "id-a")!;
    expect(entry.classification).toBe("modified");
  });

  it("classifies a brand-new scene as new with no matched id", () => {
    const a = parsed({ ordinal: 0 });
    const existing = [existingFrom(a, "id-a")];
    const incoming = [
      parsed({ ordinal: 0 }),
      parsed({ ordinal: 1, locationSlug: "ROOFTOP", bodyText: "Wind howls." }),
    ];
    const diff = reconcile(existing, incoming);
    const news = diff.filter((d) => d.classification === "new");
    expect(news).toHaveLength(1);
    expect(news[0].sceneId).toBeNull();
    expect(news[0].parsed?.locationSlug).toBe("ROOFTOP");
  });

  it("marks a removed scene as removed (not deleted), preserving its id", () => {
    const a = parsed({ ordinal: 0 });
    const b = parsed({ ordinal: 1, locationSlug: "ROOFTOP", bodyText: "Wind howls." });
    const existing = [existingFrom(a, "id-a"), existingFrom(b, "id-b")];
    const diff = reconcile(existing, [parsed({ ordinal: 0 })]);
    const removed = diff.find((d) => d.classification === "removed")!;
    expect(removed.sceneId).toBe("id-b");
  });
});

describe("reconcile — tier 1 (locked-number key join)", () => {
  it("matches locked 5A <-> 5A exactly even if body changed", () => {
    const a = parsed({ ordinal: 0, sceneNumber: "5A", bodyText: "Original." });
    const existing = [existingFrom(a, "id-5a", { locked: true })];
    const incoming = [parsed({ ordinal: 0, sceneNumber: "5A", bodyText: "Heavily rewritten." })];
    const diff = reconcile(existing, incoming);
    const entry = diff.find((d) => d.sceneId === "id-5a")!;
    expect(["unchanged", "modified"]).toContain(entry.classification);
    expect(entry.confidence).toBe(1); // tier-1 exact key join
  });

  it("treats a locked number absent from the import as removed -> OMITTED", () => {
    const a = parsed({ ordinal: 0, sceneNumber: "5A" });
    const b = parsed({ ordinal: 1, sceneNumber: "6", locationSlug: "ALLEY", bodyText: "Dark." });
    const existing = [
      existingFrom(a, "id-5a", { locked: true }),
      existingFrom(b, "id-6", { locked: true }),
    ];
    const incoming = [parsed({ ordinal: 0, sceneNumber: "5A" })];
    const diff = reconcile(existing, incoming);
    const removed = diff.find((d) => d.classification === "removed")!;
    expect(removed.sceneId).toBe("id-6");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- lib/scripts/reconcile.test.ts`
Expected: FAIL — cannot resolve `@/lib/scripts/reconcile`.

- [ ] **Step 3: Write `lib/scripts/reconcile.ts` (tiers 1 & 2; tier 3 hook stubbed to no-op)**

```ts
import { contentHash } from "@/lib/scripts/hash";
import type { ParsedScene, SceneDiff } from "@/lib/scripts/schema";

/** The existing-scene view the matcher needs (assembled by the data layer
 *  from `scenes` + their latest `scene_sources.content_hash`). */
export interface ExistingScene {
  sceneId: string;
  sceneNumber: string | null;
  numberLocked: boolean;
  contentHash: string;
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
  bodyText: string;
  ordinal: number;
}

function slugKey(s: {
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
}): string {
  return [s.intExt ?? "", s.locationSlug ?? "", s.timeOfDay ?? ""].join("|").toUpperCase();
}

/** Tier 3 is supplied by Task 10; until then this returns no fuzzy matches. */
export type FuzzyMatcher = (
  remainingExisting: ExistingScene[],
  remainingParsed: ParsedScene[],
) => Array<{ sceneId: string; parsedOrdinal: number; confidence: number }>;

const noFuzzy: FuzzyMatcher = () => [];

export function reconcile(
  existing: ExistingScene[],
  parsed: ParsedScene[],
  fuzzy: FuzzyMatcher = noFuzzy,
): SceneDiff[] {
  const diff: SceneDiff[] = [];
  const usedExisting = new Set<string>();
  const usedParsed = new Set<number>();

  // ---- Tier 1: locked-number key join (both sides locked & numbered). ----
  const existingByLockedNumber = new Map<string, ExistingScene>();
  for (const e of existing) {
    if (e.numberLocked && e.sceneNumber) existingByLockedNumber.set(e.sceneNumber, e);
  }
  for (const p of parsed) {
    if (!p.sceneNumber) continue;
    const e = existingByLockedNumber.get(p.sceneNumber);
    if (!e || usedExisting.has(e.sceneId)) continue;
    usedExisting.add(e.sceneId);
    usedParsed.add(p.ordinal);
    diff.push({
      classification: e.contentHash === contentHash(p) ? "unchanged" : "modified",
      sceneId: e.sceneId,
      confidence: 1,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }

  // ---- Tier 2: slugline + content hash. ----
  // 2a: exact content-hash match (unchanged).
  const remainingExisting = existing.filter((e) => !usedExisting.has(e.sceneId));
  const existingByHash = new Map<string, ExistingScene[]>();
  for (const e of remainingExisting) {
    const list = existingByHash.get(e.contentHash) ?? [];
    list.push(e);
    existingByHash.set(e.contentHash, list);
  }
  for (const p of parsed) {
    if (usedParsed.has(p.ordinal)) continue;
    const bucket = existingByHash.get(contentHash(p));
    const e = bucket?.find((c) => !usedExisting.has(c.sceneId));
    if (!e) continue;
    usedExisting.add(e.sceneId);
    usedParsed.add(p.ordinal);
    diff.push({
      classification: "unchanged",
      sceneId: e.sceneId,
      confidence: 1,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }

  // 2b: same slugline, different body (modified).
  const existingBySlug = new Map<string, ExistingScene[]>();
  for (const e of existing) {
    if (usedExisting.has(e.sceneId)) continue;
    const list = existingBySlug.get(slugKey(e)) ?? [];
    list.push(e);
    existingBySlug.set(slugKey(e), list);
  }
  for (const p of parsed) {
    if (usedParsed.has(p.ordinal)) continue;
    const bucket = existingBySlug.get(slugKey(p));
    const e = bucket?.find((c) => !usedExisting.has(c.sceneId));
    if (!e) continue;
    usedExisting.add(e.sceneId);
    usedParsed.add(p.ordinal);
    diff.push({
      classification: "modified",
      sceneId: e.sceneId,
      confidence: 1,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }

  // ---- Tier 3: fuzzy similarity (Task 10). ----
  const tier3 = fuzzy(
    existing.filter((e) => !usedExisting.has(e.sceneId)),
    parsed.filter((p) => !usedParsed.has(p.ordinal)),
  );
  for (const m of tier3) {
    if (usedExisting.has(m.sceneId) || usedParsed.has(m.parsedOrdinal)) continue;
    const p = parsed.find((x) => x.ordinal === m.parsedOrdinal)!;
    usedExisting.add(m.sceneId);
    usedParsed.add(m.parsedOrdinal);
    diff.push({
      classification: "modified",
      sceneId: m.sceneId,
      confidence: m.confidence,
      parsedOrdinal: m.parsedOrdinal,
      parsed: p,
    });
  }

  // ---- Leftovers: unmatched parsed = new; unmatched existing = removed. ----
  for (const p of parsed) {
    if (usedParsed.has(p.ordinal)) continue;
    diff.push({
      classification: "new",
      sceneId: null,
      confidence: 0,
      parsedOrdinal: p.ordinal,
      parsed: p,
    });
  }
  for (const e of existing) {
    if (usedExisting.has(e.sceneId)) continue;
    diff.push({
      classification: "removed",
      sceneId: e.sceneId,
      confidence: 0,
      parsedOrdinal: null,
      parsed: null,
    });
  }

  return diff;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- lib/scripts/reconcile.test.ts`
Expected: all tier-1 & tier-2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add reconciliation matcher tiers 1 (locked-number) and 2 (slug+hash)"
```

---

## Task 10: Reconciliation matcher — tier 3 (fuzzy similarity)

**Files:**
- Modify: `lib/scripts/reconcile.ts` (add `fuzzyMatcher`)
- Test: `lib/scripts/reconcile.test.ts` (add tier-3 cases)

- [ ] **Step 1: Install the similarity library**

```bash
npm install string-similarity@^4.0.4
```
Expected: `string-similarity` added to `dependencies`. (Dice-coefficient similarity, no native deps — chosen as the single similarity lib used throughout.)

- [ ] **Step 2: Add the failing tier-3 tests to `lib/scripts/reconcile.test.ts`**

Append to the existing test file:

```ts
import { reconcile as reconcileT3, fuzzyMatcher, type ExistingScene as ES } from "@/lib/scripts/reconcile";
import { contentHash as hash } from "@/lib/scripts/hash";

function p3(over: Partial<ParsedScene> & { ordinal: number }): ParsedScene {
  return {
    sceneNumber: null,
    intExt: "INT",
    locationSlug: "DINER",
    timeOfDay: "DAY",
    bodyText: "Mary sits alone at the counter sipping cold coffee.",
    synopsis: "",
    pageEighths: 8,
    textAnchorStart: 0,
    textAnchorEnd: 10,
    ...over,
  };
}

function e3(p: ParsedScene, id: string): ES {
  return {
    sceneId: id,
    sceneNumber: p.sceneNumber,
    numberLocked: false,
    contentHash: hash(p),
    intExt: p.intExt,
    locationSlug: p.locationSlug,
    timeOfDay: p.timeOfDay,
    bodyText: p.bodyText,
    ordinal: p.ordinal,
  };
}

describe("reconcile — tier 3 (fuzzy)", () => {
  it("matches an edited+renamed scene above the confidence threshold and keeps the id", () => {
    const original = p3({ ordinal: 0, bodyText: "Mary sits alone at the counter sipping cold coffee." });
    const existing = [e3(original, "id-a")];
    // Slug changed AND body lightly edited -> escapes tiers 1 & 2, caught by tier 3.
    const incoming = [
      p3({ ordinal: 0, locationSlug: "DINER COUNTER", bodyText: "Mary sits alone at the counter sipping her cold coffee." }),
    ];
    const diff = reconcileT3(existing, incoming, fuzzyMatcher);
    const entry = diff.find((d) => d.sceneId === "id-a")!;
    expect(entry.classification).toBe("modified");
    expect(entry.confidence).toBeGreaterThan(0);
    expect(entry.confidence).toBeLessThan(1);
  });

  it("does NOT fuzzy-match two unrelated scenes (below threshold => new + removed)", () => {
    const original = p3({ ordinal: 0, bodyText: "Mary sits alone at the counter sipping cold coffee." });
    const existing = [e3(original, "id-a")];
    const incoming = [p3({ ordinal: 0, locationSlug: "SUBMARINE", bodyText: "Torpedoes scream through the dark water." })];
    const diff = reconcileT3(existing, incoming, fuzzyMatcher);
    expect(diff.some((d) => d.classification === "new" && d.parsed?.locationSlug === "SUBMARINE")).toBe(true);
    expect(diff.some((d) => d.classification === "removed" && d.sceneId === "id-a")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to confirm the new cases fail**

Run: `npm test -- lib/scripts/reconcile.test.ts`
Expected: FAIL — `fuzzyMatcher` is not exported from `@/lib/scripts/reconcile`.

- [ ] **Step 4: Add `fuzzyMatcher` to `lib/scripts/reconcile.ts`**

Add these imports at the top of the file:

```ts
import stringSimilarity from "string-similarity";
```

Add this exported matcher (and the threshold constant) to the file:

```ts
/** Minimum Dice-coefficient similarity for a fuzzy (tier-3) match to be
 *  accepted automatically; below this the scenes are treated as new/removed.
 *  Matches in [THRESHOLD, 1) are surfaced for human review in the diff screen. */
export const FUZZY_THRESHOLD = 0.5;

/** Tier 3: greedy best-pair fuzzy matching on slugline+body similarity. */
export const fuzzyMatcher: FuzzyMatcher = (remainingExisting, remainingParsed) => {
  const fingerprint = (s: {
    intExt: string | null;
    locationSlug: string | null;
    timeOfDay: string | null;
    bodyText: string;
  }) =>
    `${slugKey(s)} ${s.bodyText}`.replace(/\s+/g, " ").trim().toLowerCase();

  type Candidate = { sceneId: string; parsedOrdinal: number; confidence: number };
  const candidates: Candidate[] = [];
  for (const e of remainingExisting) {
    for (const p of remainingParsed) {
      const confidence = stringSimilarity.compareTwoStrings(
        fingerprint(e),
        fingerprint(p),
      );
      if (confidence >= FUZZY_THRESHOLD) {
        candidates.push({ sceneId: e.sceneId, parsedOrdinal: p.ordinal, confidence });
      }
    }
  }
  // Greedily take the highest-confidence pairs, each scene used once.
  candidates.sort((a, b) => b.confidence - a.confidence);
  const usedE = new Set<string>();
  const usedP = new Set<number>();
  const result: Candidate[] = [];
  for (const c of candidates) {
    if (usedE.has(c.sceneId) || usedP.has(c.parsedOrdinal)) continue;
    usedE.add(c.sceneId);
    usedP.add(c.parsedOrdinal);
    result.push(c);
  }
  return result;
};
```

> Note: `slugKey` is already defined in this file (Task 9); reuse it. `string-similarity` ships its own types, so no `@types/*` is needed.

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- lib/scripts/reconcile.test.ts`
Expected: all tier-1, tier-2, and tier-3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add reconciliation tier 3 (fuzzy similarity + confidence threshold)"
```

---

## Task 11: Stage + apply-with-reconciliation (the gated re-import core)

> This task builds **both halves of the gated re-import**: `stageReimport` (snapshot the version + compute the diff, **no scene mutation**) and `reconcileAndApply` / `applyReconciledImport` (**the apply step, invoked later at confirm** — it re-reads the staged version's stored `raw_source`, re-reconciles deterministically, and writes). Staging and apply are split across two server round-trips (Task 15 wires the actions); because parse + reconcile are pure, the diff recomputed at apply equals the one shown at stage, so the `script_versions` row is the only "stage" needed.

**Files:**
- Modify: `lib/scripts/data.ts` (add `loadExistingScenes`, `stageReimport`, `computeStagedDiff`, `reconcileAndApply`, `applyReconciledImport`)
- Test: `lib/scripts/data.test.ts` (add a staging-does-not-mutate test + a confirm-applies re-import test)

- [ ] **Step 1: Add the failing staging + re-import integration tests to `lib/scripts/data.test.ts`**

Append inside the existing `describe.skipIf(...)` block (it can reuse `alice`, `aliceProject`, and helpers). The first test asserts that **staging mutates no `scenes`**; the second asserts that **confirm (apply) preserves UUIDs, marks removed OMITTED, and writes sources**:

```ts
import { reconcile } from "@/lib/scripts/reconcile";
import { fuzzyMatcher } from "@/lib/scripts/reconcile";

// (parseFountain, alice, aliceProject already in scope from earlier in the file.)

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
```

> The tests call thin wrappers (`stageReimportForTest`, `applyReconciledImportForTest`) because the production `stageReimport`/`applyReconciledImport` use the SSR cookie client, not a raw service/anon client. Define both at the bottom of the test file:

```ts
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run:
```bash
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: FAIL — `stageReimport` / `reconcileAndApply` are not exported from `@/lib/scripts/data`.

- [ ] **Step 3: Add `loadExistingScenes`, `stageReimport`, `computeStagedDiff`, `reconcileAndApply`, and `applyReconciledImport` to `lib/scripts/data.ts`**

Add these imports at the top of `lib/scripts/data.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { parseFountain } from "@/lib/scripts/fountain";
import { reconcile, fuzzyMatcher, type ExistingScene } from "@/lib/scripts/reconcile";
import type { SceneDiff } from "@/lib/scripts/schema";
```

Add the implementation below. **Staging and apply are separate steps:** `stageReimport` snapshots the version + computes the diff with **no scene mutation**; `reconcileAndApply` is **the apply step invoked later at confirm** — it re-reads the staged version's stored `raw_source`, re-reconciles deterministically, and writes. Both take an explicit client so they are testable with either the SSR client or the integration-test client; `applyReconciledImport` is the production wrapper that supplies the SSR client.

```ts
type DbClient = SupabaseClient<Database>;

/** Assemble the matcher's ExistingScene view: active scenes + their latest content_hash. */
export async function loadExistingScenes(
  client: DbClient,
  scriptId: string,
): Promise<ExistingScene[]> {
  const { data, error } = await client
    .from("scenes")
    .select(
      "id, scene_number, number_locked, int_ext, location_slug, time_of_day, ordinal, scene_sources(content_hash, script_version_id)",
    )
    .eq("script_id", scriptId)
    .eq("status", "active")
    .order("ordinal", { ascending: true });
  if (error) throw new Error(error.message, { cause: error });

  return (data ?? []).map((row) => {
    // Use the most recent source's hash (sources are append-only per version).
    const sources = (row.scene_sources ?? []) as Array<{ content_hash: string }>;
    const contentHashValue = sources.length > 0 ? sources[sources.length - 1].content_hash : "";
    return {
      sceneId: row.id,
      sceneNumber: row.scene_number,
      numberLocked: row.number_locked,
      contentHash: contentHashValue,
      intExt: row.int_ext,
      locationSlug: row.location_slug,
      timeOfDay: row.time_of_day,
      bodyText: "", // body is reconstructed from raw_source only when needed; hash drives tier 2
      ordinal: row.ordinal,
    };
  });
}

/** STAGE (re-import step 1): create the immutable version snapshot (storing
 *  raw_source) and compute the structured diff against the live scenes —
 *  WITHOUT mutating any `scenes`/`scene_sources`. The `script_versions` row IS
 *  the stage; apply happens later at confirm via `reconcileAndApply`. Returns
 *  the new versionId, the diff, and the in-app prose-per-scene map for review. */
export async function stageReimport(
  client: DbClient,
  args: { projectId: string; scriptId: string; rawSource: string; parsed: ParsedScene[] },
): Promise<{ versionId: string; diff: SceneDiff[]; inAppByScene: Record<string, string> }> {
  const { projectId, scriptId, rawSource, parsed } = args;
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Immutable snapshot of the imported draft. No scene mutation here.
  const { data: version, error: versionError } = await client
    .from("script_versions")
    .insert({
      script_id: scriptId,
      label: `v${Date.now()}`,
      source_format: "fountain",
      raw_source: rawSource,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });
  const versionId = version.id as string;

  // Compute (but do not apply) the diff via the shared read-only helper, which
  // re-parses from the just-stored raw_source so stage and apply are identical.
  // `parsed` is accepted for caller symmetry but recomputed inside for determinism.
  void parsed;
  const { diff, inAppByScene } = await computeStagedDiff(client, {
    projectId,
    scriptId,
    scriptVersionId: versionId,
  });
  return { versionId, diff, inAppByScene };
}

/** READ-ONLY: recompute the diff for an already-staged version (no version
 *  creation, no scene mutation). Used by `stageReimport` and by the review page
 *  to render the gate. Re-parses the stored raw_source and reconciles; the diff
 *  is deterministic so it equals what apply will do. `markConflicts` (Task 14)
 *  upgrades matched scenes also edited in-app and populates `inAppByScene`;
 *  until Task 14 lands this is the plain reconcile output with an empty map. */
export async function computeStagedDiff(
  client: DbClient,
  args: { projectId: string; scriptId: string; scriptVersionId: string },
): Promise<{ diff: SceneDiff[]; inAppByScene: Record<string, string> }> {
  const { projectId, scriptId, scriptVersionId } = args;
  const { data: version, error: versionError } = await client
    .from("script_versions")
    .select("raw_source")
    .eq("id", scriptVersionId)
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });

  const parsed = parseFountain(version.raw_source);
  const existing = await loadExistingScenes(client, scriptId);
  const diff = reconcile(existing, parsed, fuzzyMatcher);
  void projectId; // projectId is used by markConflicts/inAppByScene in Task 14.

  return { diff, inAppByScene: {} };
}

/** APPLY (re-import step 2, invoked at confirm): given a previously-staged
 *  version id, re-read its stored raw_source, re-reconcile deterministically,
 *  and apply non-destructively:
 *  - matched scenes keep their UUID (update slug/body-derived fields, add a new scene_source);
 *  - removed scenes are set status='omitted' (never deleted);
 *  - new scenes are inserted as active. Returns the resolved diff + matched ids.
 *  Recomputing the diff here is sound because parse + reconcile are pure. */
export async function reconcileAndApply(
  client: DbClient,
  args: { projectId: string; scriptId: string; scriptVersionId: string },
): Promise<{ versionId: string; diff: SceneDiff[]; matchedSceneIds: string[] }> {
  const { projectId, scriptId, scriptVersionId } = args;
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Re-read the staged version's stored source and re-parse/-reconcile.
  const { data: version, error: versionError } = await client
    .from("script_versions")
    .select("id, raw_source")
    .eq("id", scriptVersionId)
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });
  const versionId = version.id as string;
  const parsed = parseFountain(version.raw_source);

  const existing = await loadExistingScenes(client, scriptId);
  const diff = reconcile(existing, parsed, fuzzyMatcher);

  const matchedSceneIds: string[] = [];

  // Apply each diff entry against the staged version.
  for (const entry of diff) {
    if ((entry.classification === "unchanged" || entry.classification === "modified") && entry.sceneId && entry.parsed) {
      matchedSceneIds.push(entry.sceneId);
      const p = entry.parsed;
      const { error: upErr } = await client
        .from("scenes")
        .update({
          ordinal: p.ordinal,
          int_ext: p.intExt,
          location_slug: p.locationSlug,
          time_of_day: p.timeOfDay,
          synopsis: p.synopsis,
          page_eighths: p.pageEighths,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.sceneId);
      if (upErr) throw new Error(upErr.message, { cause: upErr });
      const { error: srcErr } = await client.from("scene_sources").insert({
        scene_id: entry.sceneId,
        script_version_id: versionId,
        content_hash: contentHash(p),
        text_anchor_start: p.textAnchorStart,
        text_anchor_end: p.textAnchorEnd,
      });
      if (srcErr) throw new Error(srcErr.message, { cause: srcErr });
    } else if (entry.classification === "new" && entry.parsed) {
      const p = entry.parsed;
      const { data: created, error: insErr } = await client
        .from("scenes")
        .insert({
          project_id: projectId,
          script_id: scriptId,
          ordinal: p.ordinal,
          scene_number: p.sceneNumber,
          int_ext: p.intExt,
          location_slug: p.locationSlug,
          time_of_day: p.timeOfDay,
          synopsis: p.synopsis,
          page_eighths: p.pageEighths,
          status: "active",
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message, { cause: insErr });
      const { error: srcErr } = await client.from("scene_sources").insert({
        scene_id: created.id,
        script_version_id: versionId,
        content_hash: contentHash(p),
        text_anchor_start: p.textAnchorStart,
        text_anchor_end: p.textAnchorEnd,
      });
      if (srcErr) throw new Error(srcErr.message, { cause: srcErr });
    } else if (entry.classification === "removed" && entry.sceneId) {
      const { error: omitErr } = await client
        .from("scenes")
        .update({ status: "omitted", updated_at: new Date().toISOString() })
        .eq("id", entry.sceneId);
      if (omitErr) throw new Error(omitErr.message, { cause: omitErr });
    }
  }

  return { versionId, diff, matchedSceneIds };
}

/** Production wrapper for the APPLY step (confirm): apply a previously-staged
 *  version using the SSR cookie client. */
export async function applyReconciledImport(args: {
  projectId: string;
  scriptId: string;
  scriptVersionId: string;
}): Promise<{ versionId: string; diff: SceneDiff[]; matchedSceneIds: string[] }> {
  const supabase = await createClient();
  return reconcileAndApply(supabase as unknown as DbClient, args);
}
```

> Note: `loadExistingScenes` leaves `bodyText: ""` because tier 2 keys on the stored `content_hash` (not live body), and tier 3's fingerprint of an existing scene uses slug + body — to give tier 3 real bodies, a later refinement can join the raw source. For Phase 1, tier-3 re-import matching against the *current* import's bodies is sufficient and the pure unit tests in Task 10 cover the body-similarity logic directly. Flagged as a Phase 1.5 refinement.

- [ ] **Step 4: Run typecheck + the integration tests**

Run:
```bash
npm run typecheck
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: no type errors; both new tests pass — staging mutates no scenes (live set unchanged after `stageReimport`), and confirm/apply preserves the DINER id, omits PARKING LOT, adds ROOFTOP active, and writes a `scene_source` for the matched scene against the staged version.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: gated re-import core — stageReimport (no mutation) + apply on confirm (UUIDs, OMITTED, sources)"
```

---

## Task 12: Revision-set model + data layer

**Files:**
- Modify: `lib/scripts/data.ts` (add `seedRevisions`, `listRevisions`, `setActiveRevision`, `getActiveRevision`, and per-scene change recording in `reconcileAndApply`)
- Test: `lib/scripts/data.test.ts` (add a revision-seeding + change-flag integration test)

- [ ] **Step 1: Add the failing revision test to `lib/scripts/data.test.ts`**

Append inside the `describe.skipIf(...)` block:

```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: FAIL — `seedRevisions` is not exported.

- [ ] **Step 3: Add revision helpers + change recording to `lib/scripts/data.ts`**

Add the import:

```ts
import { revision, type Revision } from "@/lib/scripts/schema";
```

Add the standard revision order constant and the helpers:

```ts
const STANDARD_REVISIONS: Array<{ name: string; color: string }> = [
  { name: "White", color: "#FFFFFF" },
  { name: "Blue", color: "#3B82F6" },
  { name: "Pink", color: "#EC4899" },
  { name: "Yellow", color: "#EAB308" },
  { name: "Green", color: "#22C55E" },
  { name: "Goldenrod", color: "#DAA520" },
  { name: "Buff", color: "#F0DC82" },
  { name: "Salmon", color: "#FA8072" },
  { name: "Cherry", color: "#DE3163" },
  { name: "Tan", color: "#D2B48C" },
];

/** Seed the standard FDX-style revision set for a project; White is active. Idempotent. */
export async function seedRevisions(client: DbClient, projectId: string): Promise<void> {
  const { data: existing, error: readErr } = await client
    .from("revisions")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if ((existing ?? []).length > 0) return; // already seeded

  const rows = STANDARD_REVISIONS.map((r, i) => ({
    project_id: projectId,
    name: r.name,
    color: r.color,
    ordinal: i,
    active: i === 0, // White active
  }));
  const { error } = await client.from("revisions").insert(rows);
  if (error) throw new Error(error.message, { cause: error });
}

export async function listRevisions(client: DbClient, projectId: string): Promise<Revision[]> {
  const { data, error } = await client
    .from("revisions")
    .select("*")
    .eq("project_id", projectId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => revision.parse(r));
}

export async function getActiveRevision(client: DbClient, projectId: string): Promise<Revision | null> {
  const { data, error } = await client
    .from("revisions")
    .select("*")
    .eq("project_id", projectId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? revision.parse(data) : null;
}

/** Make exactly one revision active for the project. */
export async function setActiveRevision(
  client: DbClient,
  projectId: string,
  revisionId: string,
): Promise<void> {
  const { error: clearErr } = await client
    .from("revisions")
    .update({ active: false })
    .eq("project_id", projectId);
  if (clearErr) throw new Error(clearErr.message, { cause: clearErr });
  const { error: setErr } = await client
    .from("revisions")
    .update({ active: true })
    .eq("id", revisionId);
  if (setErr) throw new Error(setErr.message, { cause: setErr });
}
```

Then record per-scene changes inside `reconcileAndApply`. After computing `diff` and `versionId`, fetch the active revision once:

```ts
  const activeRevision = await getActiveRevision(client, projectId);
```

And inside the diff loop, after a successful apply of each entry, record the change under the active set when one exists:

```ts
      // (inside the "modified"/"new"/"removed" branches, after the DB write succeeds)
      if (activeRevision) {
        const changeKind =
          entry.classification === "new"
            ? "added"
            : entry.classification === "removed"
              ? "omitted"
              : "modified"; // "unchanged" branch does not reach here
        const sceneIdForChange =
          entry.classification === "new" ? /* created.id */ undefined : entry.sceneId;
        // Build this once per branch using the right scene id; see note below.
      }
```

> Concretely, to keep the change-recording exact, factor it into a local helper inside `reconcileAndApply` and call it with the resolved scene id in each branch:

```ts
  const recordChange = async (sceneId: string, kind: "added" | "modified" | "omitted") => {
    if (!activeRevision) return;
    const { error } = await client.from("scene_revision_changes").upsert(
      { scene_id: sceneId, revision_id: activeRevision.id, change_kind: kind },
      { onConflict: "scene_id,revision_id" },
    );
    if (error) throw new Error(error.message, { cause: error });
  };
```

Call `await recordChange(entry.sceneId, "modified")` in the modified branch (skip it when `classification === "unchanged"`), `await recordChange(created.id, "added")` in the new branch, and `await recordChange(entry.sceneId, "omitted")` in the removed branch.

- [ ] **Step 4: Run typecheck + tests**

Run:
```bash
npm run typecheck
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: no type errors; the revision-seeding + change-flag test passes (and earlier data tests still pass).

- [ ] **Step 5: Seed revisions on first import**

In `app/dashboard/[projectId]/import/actions.ts`, ensure the project's revision set exists before applying an import. Update `importScriptAction` to seed first (idempotent), using the SSR client:

```ts
import { createClient } from "@/lib/supabase/server";
import { seedRevisions } from "@/lib/scripts/data";
```

and, inside the `try` block before `createScript`:

```ts
    const supabase = await createClient();
    await seedRevisions(supabase as unknown as never, projectId);
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add revision-set model (seed standard colors, active set, per-scene change flags)"
```

---

## Task 13: In-app edit write path

**Files:**
- Modify: `lib/scripts/data.ts` (add `updateSceneInApp`)
- Test: `lib/scripts/data.test.ts` (add an in-app edit integration test)
- Create: `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/actions.ts`
- Modify: `components/scripts/scene-detail.tsx` (add an edit form) — see Step 6.

- [ ] **Step 1: Add the failing in-app edit test to `lib/scripts/data.test.ts`**

Append inside the `describe.skipIf(...)` block:

```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: FAIL — `updateSceneInApp` is not exported.

- [ ] **Step 3: Add `updateSceneInApp` to `lib/scripts/data.ts`**

```ts
/** In-app edit write path: edit a scene's production metadata (and/or prose-derived
 *  fields), recording the change into the active revision set. Operates on the
 *  stable scene UUID, so the edit survives later re-imports (anchored to the scene). */
export async function updateSceneInApp(
  client: DbClient,
  args: {
    projectId: string;
    sceneId: string;
    patch: Partial<{
      int_ext: string | null;
      location_slug: string | null;
      time_of_day: string | null;
      synopsis: string | null;
      script_day: string | null;
      scene_number: string | null;
      number_locked: boolean;
      status: "active" | "omitted";
    }>;
  },
): Promise<Scene> {
  const { projectId, sceneId, patch } = args;
  const { data, error } = await client
    .from("scenes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sceneId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });

  const active = await getActiveRevision(client, projectId);
  if (active) {
    const { error: changeErr } = await client.from("scene_revision_changes").upsert(
      { scene_id: sceneId, revision_id: active.id, change_kind: "modified" },
      { onConflict: "scene_id,revision_id" },
    );
    if (changeErr) throw new Error(changeErr.message, { cause: changeErr });
  }
  return scene.parse(data);
}
```

- [ ] **Step 4: Run typecheck + tests**

Run:
```bash
npm run typecheck
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: no type errors; in-app edit test passes.

- [ ] **Step 5: Write `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSceneInApp } from "@/lib/scripts/data";

export async function editSceneAction(
  ctx: { projectId: string; scriptId: string; sceneId: string },
  formData: FormData,
) {
  const patch = {
    int_ext: String(formData.get("int_ext") ?? "") || null,
    location_slug: String(formData.get("location_slug") ?? "") || null,
    time_of_day: String(formData.get("time_of_day") ?? "") || null,
    synopsis: String(formData.get("synopsis") ?? "") || null,
    script_day: String(formData.get("script_day") ?? "") || null,
  };
  try {
    const supabase = await createClient();
    await updateSceneInApp(supabase as unknown as never, {
      projectId: ctx.projectId,
      sceneId: ctx.sceneId,
      patch,
    });
  } catch (err) {
    console.error("[editSceneAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}/scenes/${ctx.sceneId}`);
}
```

- [ ] **Step 6: Add the edit form to `components/scripts/scene-detail.tsx`**

Append an edit form below the body. Accept an optional `editAction`:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Scene } from "@/lib/scripts/schema";

export function SceneDetail({
  scene,
  body,
  editAction,
}: {
  scene: Scene;
  body: string;
  editAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">
          {scene.scene_number ?? scene.ordinal + 1}. {scene.int_ext} {scene.location_slug} —{" "}
          {scene.time_of_day}
        </h1>
        <p className="text-sm text-muted-foreground">
          {scene.page_eighths}/8 page{scene.script_day ? ` · ${scene.script_day}` : ""} ·{" "}
          {scene.status}
        </p>
        {scene.synopsis ? <p className="mt-1 text-sm">{scene.synopsis}</p> : null}
      </header>
      <pre className="whitespace-pre-wrap font-mono text-sm">{body}</pre>
      {editAction ? (
        <form action={editAction} className="grid max-w-md gap-2">
          <Input name="int_ext" defaultValue={scene.int_ext ?? ""} placeholder="INT/EXT" />
          <Input name="location_slug" defaultValue={scene.location_slug ?? ""} placeholder="Location" />
          <Input name="time_of_day" defaultValue={scene.time_of_day ?? ""} placeholder="Day/Night" />
          <Input name="script_day" defaultValue={scene.script_day ?? ""} placeholder="Script day" />
          <Input name="synopsis" defaultValue={scene.synopsis ?? ""} placeholder="Synopsis" />
          <Button type="submit">Save scene</Button>
        </form>
      ) : null}
    </article>
  );
}
```

Wire the action in the scene page (`.../scenes/[sceneId]/page.tsx`) by binding context and passing it:

```tsx
import { editSceneAction } from "./actions";
// ...inside the component, after resolving params:
const action = editSceneAction.bind(null, { projectId, scriptId, sceneId });
// ...
return (
  <main className="mx-auto max-w-3xl space-y-6 p-6">
    <SceneDetail scene={scene} body={body} editAction={action} />
  </main>
);
```
(Add `projectId` to the destructured params for this.)

- [ ] **Step 7: Verify build + typecheck**

Run:
```bash
npm run typecheck && npm run build
```
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add in-app scene edit write path (records into active revision set)"
```

---

## Task 14: Conflict detection + resolution

**Files:**
- Create: `lib/scripts/conflict.ts` (pure conflict classification)
- Test: `lib/scripts/conflict.test.ts`
- Modify: `lib/scripts/data.ts` (mark `conflict` entries in `reconcileAndApply`; default Final-Draft-wins)

A **conflict** = a scene that was edited in-app under the active revision set (has a `scene_revision_changes` row with `change_kind='modified'`) AND is classified `modified` by the re-import matcher. The pure classifier decides; the data layer applies the default (Final-Draft-wins) while retaining the in-app edit in history.

- [ ] **Step 1: Write the failing test `lib/scripts/conflict.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { markConflicts } from "@/lib/scripts/conflict";
import type { SceneDiff } from "@/lib/scripts/schema";

const baseParsed = {
  sceneNumber: "1", intExt: "INT", locationSlug: "DINER", timeOfDay: "DAY",
  bodyText: "x", synopsis: "", pageEighths: 8, textAnchorStart: 0, textAnchorEnd: 1, ordinal: 0,
};

describe("markConflicts", () => {
  it("upgrades a modified scene to conflict when it was also edited in-app", () => {
    const diff: SceneDiff[] = [
      { classification: "modified", sceneId: "id-a", confidence: 1, parsedOrdinal: 0, parsed: baseParsed },
    ];
    const out = markConflicts(diff, new Set(["id-a"]));
    expect(out[0].classification).toBe("conflict");
  });

  it("leaves a modified scene alone when it was not edited in-app", () => {
    const diff: SceneDiff[] = [
      { classification: "modified", sceneId: "id-a", confidence: 1, parsedOrdinal: 0, parsed: baseParsed },
    ];
    const out = markConflicts(diff, new Set(["id-other"]));
    expect(out[0].classification).toBe("modified");
  });

  it("does not turn an unchanged scene into a conflict", () => {
    const diff: SceneDiff[] = [
      { classification: "unchanged", sceneId: "id-a", confidence: 1, parsedOrdinal: 0, parsed: baseParsed },
    ];
    const out = markConflicts(diff, new Set(["id-a"]));
    expect(out[0].classification).toBe("unchanged");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- lib/scripts/conflict.test.ts`
Expected: FAIL — cannot resolve `@/lib/scripts/conflict`.

- [ ] **Step 3: Write `lib/scripts/conflict.ts`**

```ts
import type { SceneDiff } from "@/lib/scripts/schema";

/** Given the reconciliation diff and the set of scene ids that were edited
 *  in-app under the active revision set, upgrade any `modified` entry whose
 *  scene was also edited in-app to a `conflict`. Pure. */
export function markConflicts(
  diff: SceneDiff[],
  inAppEditedSceneIds: Set<string>,
): SceneDiff[] {
  return diff.map((entry) =>
    entry.classification === "modified" && entry.sceneId && inAppEditedSceneIds.has(entry.sceneId)
      ? { ...entry, classification: "conflict" as const }
      : entry,
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- lib/scripts/conflict.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Wire conflict marking into BOTH `stageReimport` (for review) and `reconcileAndApply` (Final-Draft-wins apply)**

Add to `lib/scripts/data.ts` imports:

```ts
import { markConflicts } from "@/lib/scripts/conflict";
```

Add a shared helper that loads the in-app-edited scene ids for the active revision, upgrades matched entries to `conflict`, and returns the per-scene in-app prose for the review screen. Both the gated **stage** (so the diff screen shows conflicts) and the **apply** call it, guaranteeing the diff shown at stage equals the diff applied at confirm:

```ts
/** Load in-app divergences for the active revision and upgrade any matched entry
 *  that was also edited in-app to a `conflict`. Returns the resolved diff plus the
 *  recorded in-app prose per scene id (for the side-by-side in the review screen). */
async function markConflictsForReview(
  client: DbClient,
  projectId: string,
  diff: SceneDiff[],
): Promise<{ resolved: SceneDiff[]; inAppByScene: Record<string, string> }> {
  const active = await getActiveRevision(client, projectId);
  if (!active) return { resolved: diff, inAppByScene: {} };

  const { data: edits, error: editErr } = await client
    .from("scene_revision_changes")
    .select("scene_id")
    .eq("revision_id", active.id)
    .eq("change_kind", "modified");
  if (editErr) throw new Error(editErr.message, { cause: editErr });
  const editedIds = new Set((edits ?? []).map((e) => e.scene_id));
  const resolved = markConflicts(diff, editedIds);

  // Recorded in-app prose for each conflicting scene (synopsis stands in for prose in Phase 1).
  const inAppByScene: Record<string, string> = {};
  const conflictIds = resolved
    .filter((d) => d.classification === "conflict" && d.sceneId)
    .map((d) => d.sceneId as string);
  if (conflictIds.length > 0) {
    const { data: rows, error: proseErr } = await client
      .from("scenes")
      .select("id, synopsis")
      .in("id", conflictIds);
    if (proseErr) throw new Error(proseErr.message, { cause: proseErr });
    for (const r of rows ?? []) inAppByScene[r.id] = r.synopsis ?? "";
  }
  return { resolved, inAppByScene };
}
```

Update `computeStagedDiff` (the read-only helper that both `stageReimport` and the review page use) to mark conflicts and return the in-app map (replace its `reconcile`-and-return tail):

```ts
  const parsed = parseFountain(version.raw_source);
  const existing = await loadExistingScenes(client, scriptId);
  const diff = reconcile(existing, parsed, fuzzyMatcher);
  const { resolved, inAppByScene } = await markConflictsForReview(client, projectId, diff);
  return { diff: resolved, inAppByScene };
```

(`stageReimport` delegates to `computeStagedDiff`, so it picks this up automatically.) In `reconcileAndApply`, after computing `diff` and before applying, run the same marking:

```ts
  const { resolved } = await markConflictsForReview(client, projectId, diff);
```

Then iterate `resolved` instead of `diff`. Treat a `conflict` entry exactly like a `modified` entry for the **apply** (Final-Draft-wins: the incoming parsed scene overwrites the live scene fields), but DO NOT clear the existing `scene_revision_changes` row — the prior in-app edit stays in history for one-click re-apply. Add a `conflict` branch alongside `modified`:

```ts
    if (
      (entry.classification === "unchanged" ||
        entry.classification === "modified" ||
        entry.classification === "conflict") &&
      entry.sceneId &&
      entry.parsed
    ) {
      // ... existing matched-scene update + scene_sources insert (Final-Draft-wins) ...
      if (entry.classification !== "unchanged") {
        await recordChange(entry.sceneId, "modified");
      }
    }
```

Return `resolved` as the `diff` field so the review UI (Task 15) can show conflicts:

```ts
  return { versionId, diff: resolved, matchedSceneIds };
```

- [ ] **Step 6: Add an integration test for the spec's conflict scenario to `lib/scripts/data.test.ts`**

Append inside the `describe.skipIf(...)` block:

```ts
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

  // FD-wins: the live scene now reflects the imported draft (body-derived fields updated)…
  // …and the in-app edit is retained in history (scene_revision_changes row still present).
  const { data: history } = await alice
    .from("scene_revision_changes").select("scene_id").eq("scene_id", labId);
  expect(history!.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 7: Run typecheck + the full data suite**

Run:
```bash
npm run typecheck
npx dotenv -e .env.local -- npm test -- lib/scripts/data.test.ts
```
Expected: no type errors; the conflict scenario passes (conflict classification, in-app edit retained).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add conflict detection + Final-Draft-wins resolution (in-app edit kept in history)"
```

---

## Task 15: Diff review UI

**Files:**
- Create: `components/scripts/diff-review.tsx`
- Test: `components/scripts/diff-review.test.tsx`
- Create: `app/dashboard/[projectId]/scripts/[scriptId]/reimport/page.tsx` (the gated review screen)
- Modify: `app/dashboard/[projectId]/import/actions.ts` (add `stageReimportAction` + `confirmReimportAction`)

The first import applies straight through (Task 7) — nothing exists to lose. A **re-import** (importing into an existing script) is **gated: stage → diff → user confirm → apply**, never silently destructive. Two server round-trips:
1. **Stage + diff (no scene mutation):** `stageReimportAction` calls `stageReimport` (Task 11), which snapshots the immutable `ScriptVersion` (storing `raw_source`), reconciles against the live scenes, and computes the diff — **without touching `scenes`/`scene_sources`**. It then renders the `DiffReview` screen with that diff, the in-app prose map, and the new `scriptVersionId`. Nothing is persisted to `scenes` yet.
2. **Confirm → apply:** the `DiffReview` `confirmAction` is `confirmReimportAction`, which takes the `scriptVersionId` (+ per-conflict resolution choices, Final-Draft-wins by default) and calls `applyReconciledImport` (Task 11). That re-reads the staged version's stored `raw_source`, re-reconciles deterministically, and applies (preserve UUIDs, mark removed OMITTED, write `scene_sources`, record conflicts to history). Then it redirects to the script page.

The review UI renders the classification list and, for conflicts, a side-by-side with the Final-Draft side pre-selected as the **default resolution** (not a skip of review). Because parse + reconcile are pure, the diff shown at stage equals the diff applied at confirm.

- [ ] **Step 1: Write the failing test `components/scripts/diff-review.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiffReview } from "@/components/scripts/diff-review";
import type { SceneDiff } from "@/lib/scripts/schema";

const parsed = (slug: string) => ({
  sceneNumber: null, intExt: "INT", locationSlug: slug, timeOfDay: "DAY",
  bodyText: `Body of ${slug}`, synopsis: "", pageEighths: 8,
  textAnchorStart: 0, textAnchorEnd: 1, ordinal: 0,
});

const diff: SceneDiff[] = [
  { classification: "unchanged", sceneId: "id-1", confidence: 1, parsedOrdinal: 0, parsed: parsed("DINER") },
  { classification: "modified", sceneId: "id-2", confidence: 0.7, parsedOrdinal: 1, parsed: parsed("PARK") },
  { classification: "new", sceneId: null, confidence: 0, parsedOrdinal: 2, parsed: parsed("ROOFTOP") },
  { classification: "removed", sceneId: "id-3", confidence: 0, parsedOrdinal: null, parsed: null },
  { classification: "conflict", sceneId: "id-4", confidence: 1, parsedOrdinal: 3, parsed: parsed("LAB") },
];

describe("DiffReview", () => {
  it("renders each classification", () => {
    render(<DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{ "id-4": "In-app: experiment fails." }} confirmAction={vi.fn()} />);
    expect(screen.getByText(/unchanged/i)).toBeInTheDocument();
    expect(screen.getByText(/modified/i)).toBeInTheDocument();
    expect(screen.getByText(/new/i)).toBeInTheDocument();
    expect(screen.getByText(/removed/i)).toBeInTheDocument();
    expect(screen.getByText(/conflict/i)).toBeInTheDocument();
  });

  it("shows the conflict side-by-side with the Final Draft option pre-selected as the default and the in-app edit retained", () => {
    render(<DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{ "id-4": "In-app: experiment fails." }} confirmAction={vi.fn()} />);
    const fdRadio = screen.getByLabelText(/final draft/i) as HTMLInputElement;
    expect(fdRadio.checked).toBe(true);
    expect(screen.getByText(/In-app: experiment fails\./)).toBeInTheDocument();
  });

  it("carries the staged scriptVersionId so confirm applies the right version", () => {
    const { container } = render(
      <DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{}} confirmAction={vi.fn()} />,
    );
    const hidden = container.querySelector('input[name="scriptVersionId"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("ver-1");
  });

  it("calls confirmAction on confirm", async () => {
    const confirmAction = vi.fn().mockResolvedValue(undefined);
    render(<DiffReview scriptVersionId="ver-1" diff={diff} inAppByScene={{}} confirmAction={confirmAction} />);
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(confirmAction).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- components/scripts/diff-review.test.tsx`
Expected: FAIL — cannot resolve `@/components/scripts/diff-review`.

- [ ] **Step 3: Write `components/scripts/diff-review.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import type { SceneDiff } from "@/lib/scripts/schema";

const LABEL: Record<SceneDiff["classification"], string> = {
  unchanged: "Unchanged",
  modified: "Modified",
  new: "New",
  removed: "Removed → OMITTED",
  conflict: "Conflict",
};

export function DiffReview({
  scriptVersionId,
  diff,
  inAppByScene,
  confirmAction,
}: {
  scriptVersionId: string;
  diff: SceneDiff[];
  inAppByScene: Record<string, string>;
  confirmAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    // Single form so the staged version id AND every per-conflict resolution
    // choice travel together to the confirm (apply) action.
    <form action={confirmAction} className="space-y-4">
      <input type="hidden" name="scriptVersionId" value={scriptVersionId} />
      <ul className="space-y-2">
        {diff.map((entry, i) => (
          <li key={`${entry.sceneId ?? "new"}-${i}`} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {LABEL[entry.classification]}
                {entry.parsed?.locationSlug ? ` · ${entry.parsed.locationSlug}` : ""}
              </span>
              {entry.classification === "modified" || entry.classification === "conflict" ? (
                <span className="text-xs text-muted-foreground">
                  confidence {(entry.confidence * 100).toFixed(0)}%
                </span>
              ) : null}
            </div>

            {entry.classification === "conflict" && entry.sceneId ? (
              <fieldset className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded border p-2">
                  <input
                    type="radio"
                    name={`resolve-${entry.sceneId}`}
                    value="final-draft"
                    defaultChecked
                    aria-label="Final Draft (incoming)"
                  />
                  <span>
                    <span className="block text-xs font-semibold">Final Draft (incoming)</span>
                    <span className="block text-sm">{entry.parsed?.bodyText}</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded border p-2">
                  <input
                    type="radio"
                    name={`resolve-${entry.sceneId}`}
                    value="in-app"
                    aria-label="In-app edit (retained in history)"
                  />
                  <span>
                    <span className="block text-xs font-semibold">In-app edit (retained)</span>
                    <span className="block text-sm">{inAppByScene[entry.sceneId] ?? "(no recorded prose)"}</span>
                  </span>
                </label>
              </fieldset>
            ) : null}
          </li>
        ))}
      </ul>
      <Button type="submit">Confirm import</Button>
    </form>
  );
}
```

> The Final-Draft radio is `defaultChecked`, so Final-Draft-wins is the **default** resolution surfaced for review — confirming with no change keeps it, but the per-conflict `resolve-<sceneId>` choices ride along in the same submit for future use. Phase 1's apply honors Final-Draft-wins; reading the per-conflict choices to apply the in-app side instead is the only remaining conflict-resolution refinement (the in-app edit is already retained in history regardless).

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- components/scripts/diff-review.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Add the gated re-import actions to `app/dashboard/[projectId]/import/actions.ts`**

Add two actions: `stageReimportAction` (stage the version + diff, then redirect to the review screen — **no scene mutation**) and `confirmReimportAction` (apply the staged version on confirmation, then redirect to the script page). The first import path (`importScriptAction`) is unchanged.

Extend the existing import statements at the top of the file (do **not** duplicate `createClient`, which Task 12 Step 5 already imported from `@/lib/supabase/server`):

```ts
// add to the existing "@/lib/scripts/data" import:
import { stageReimport, applyReconciledImport, getScript } from "@/lib/scripts/data";
// createClient is already imported from "@/lib/supabase/server" (Task 12 Step 5).
```

```ts
/** Re-import step 1: stage the version + compute the diff (no scene mutation),
 *  then send the user to the gated review screen. */
export async function stageReimportAction(
  ctx: { projectId: string; scriptId: string },
  formData: FormData,
) {
  const source = String(formData.get("source") ?? "");
  if (!source.trim()) return;
  let versionId: string;
  try {
    const script = await getScript(ctx.scriptId);
    if (!script) return;
    const supabase = await createClient();
    const parsed = parseFountain(source);
    const staged = await stageReimport(supabase as unknown as never, {
      projectId: ctx.projectId,
      scriptId: ctx.scriptId,
      rawSource: source,
      parsed,
    });
    versionId = staged.versionId;
  } catch (err) {
    console.error("[stageReimportAction]", err);
    return;
  }
  // Gate: nothing was applied to scenes yet. Go review the staged diff.
  redirect(
    `/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}/reimport?versionId=${versionId}`,
  );
}

/** Re-import step 2: the DiffReview confirm. Apply the staged version
 *  (Final-Draft-wins default; conflicts retained in history), then redirect. */
export async function confirmReimportAction(
  ctx: { projectId: string; scriptId: string },
  formData: FormData,
) {
  const scriptVersionId = String(formData.get("scriptVersionId") ?? "");
  if (!scriptVersionId) return;
  try {
    await applyReconciledImport({
      projectId: ctx.projectId,
      scriptId: ctx.scriptId,
      scriptVersionId,
    });
  } catch (err) {
    console.error("[confirmReimportAction]", err);
    return;
  }
  redirect(`/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}`);
}
```

- [ ] **Step 6: Add the gated review page `app/dashboard/[projectId]/scripts/[scriptId]/reimport/page.tsx`**

This server component reads the staged `versionId` from the query, recomputes the diff **read-only** (via `computeStagedDiff` — no new version, no scene mutation), and renders `DiffReview` with `confirmReimportAction` bound. Confirming is the only thing that applies.

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeStagedDiff } from "@/lib/scripts/data";
import { DiffReview } from "@/components/scripts/diff-review";
import { confirmReimportAction } from "@/app/dashboard/[projectId]/import/actions";

export default async function ReimportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; scriptId: string }>;
  searchParams: Promise<{ versionId?: string }>;
}) {
  const { projectId, scriptId } = await params;
  const { versionId } = await searchParams;
  if (!versionId) notFound();

  const supabase = await createClient();
  const { diff, inAppByScene } = await computeStagedDiff(supabase as unknown as never, {
    projectId,
    scriptId,
    scriptVersionId: versionId,
  });
  const confirm = confirmReimportAction.bind(null, { projectId, scriptId });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Review re-import</h1>
      <p className="text-sm text-muted-foreground">
        Nothing has been applied yet. Review the changes, then confirm to apply
        (matched scenes keep their id; removed scenes become OMITTED).
      </p>
      <DiffReview
        scriptVersionId={versionId}
        diff={diff}
        inAppByScene={inAppByScene}
        confirmAction={confirm}
      />
    </main>
  );
}
```

- [ ] **Step 7: Verify the gate end-to-end (staging mutates nothing; confirm applies)**

The pure gate guarantee (staging does NOT mutate `scenes` until confirm) is covered by the integration test added in **Task 11 Step 1** ("staging a re-import snapshots the version + diff but mutates NO scenes"), and the apply-on-confirm path by the companion test there. Here, confirm the wiring compiles and the component suite is green:

```bash
npm run typecheck && npm run build
npm test -- components/scripts/
```
Expected: build succeeds; all `components/scripts/*` tests pass (including the `scriptVersionId` hidden-field + Final-Draft-default tests).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: gated re-import — diff review screen (stage→review→confirm→apply), no silent drops"
```

---

## Task 16: End-to-end wiring + full-suite green

**Files:**
- Modify: `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx` (re-import form on the script page)
- Verify only: full test suite, RLS across all new tables.

- [ ] **Step 1: Add a re-import form to the script page (stages, then gates to review)**

In `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx`, replace the "Re-import draft" link with an inline form bound to `stageReimportAction`. Submitting it stages the version and redirects to the gated review screen — it does **not** apply anything until the user confirms there:

```tsx
import { ImportForm } from "@/components/scripts/import-form";
import { stageReimportAction } from "@/app/dashboard/[projectId]/import/actions";
// ...inside the component:
const stageReimport = stageReimportAction.bind(null, { projectId, scriptId });
// ...in the JSX, replace the link with:
<details>
  <summary className="cursor-pointer text-sm underline">Re-import a revised draft</summary>
  <div className="mt-3">
    <ImportForm action={stageReimport} />
  </div>
</details>
```
(The title field is unused on re-import; that is acceptable for Phase 1 — it is ignored by `stageReimportAction`.)

- [ ] **Step 2: Run lint + typecheck + the full unit suite (no DB)**

Run:
```bash
npm run lint && npm run typecheck && npm test
```
Expected: all green. The RLS/data integration suite is skipped without `SUPABASE_SERVICE_ROLE_KEY` (matching Phase 0's `describe.skipIf` guard), so this stays green in CI.

- [ ] **Step 3: Run the full integration suite against local Supabase**

Run:
```bash
npx dotenv -e .env.local -- npm test
```
Expected: all suites pass, including `lib/scripts/data.test.ts` (first import, RLS isolation, re-import id-preservation + OMITTED, revision seeding + change flags, in-app edit, conflict scenario).

- [ ] **Step 4: Manual end-to-end smoke test (Task-equivalent for browser e2e)**

With local Supabase running and `npm run dev`:
1. Sign in, create a project, click **Import script**, paste `lib/scripts/__fixtures__/tricky.fountain`, submit.
2. Land on the script page → scene list shows 4 scenes with correct INT/EXT, slug, time-of-day, eighths, synopsis; the `5A` scene number appears; the OMITTED scene shows.
3. Open a scene → edit its synopsis → save → it persists.
4. Expand **Re-import a revised draft**, paste a draft that removes one scene and adds another, submit → you land on the **Review re-import** screen showing the classification list (and any conflict side-by-side with Final Draft pre-selected). Confirm that, **before** clicking Confirm, the live script page is unchanged (the gate: staging mutated nothing).
5. Click **Confirm import** → only now the removed scene becomes OMITTED (struck through), the new scene appears, and the edited scene kept its detail (its UUID preserved).

Expected: all true. (A scripted Playwright e2e is deferred to the Phase 7 polish pass; this manual run is the Phase 1 acceptance check.)

- [ ] **Step 5: Verify RLS coverage across every new table (psql)**

Run:
```bash
npx supabase db connect <<'SQL'
select tablename, count(*) as policies
from pg_policies
where schemaname = 'public'
  and tablename in ('scripts','script_versions','scenes','scene_sources','revisions','scene_revision_changes')
group by tablename order by tablename;
SQL
```
Expected: each table reports `policies = 4`.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: wire re-import on script page; Phase 1 end-to-end green"
```

---

## Deferred to Phase 1.5 / later

- **FDX adapter** — parse `.fdx` XML into `ParsedScene[]`; add `'fdx'` to the `source_format` check constraint and the `sourceFormat` Zod enum. (Phase 1.5)
- **FDX round-trip export** — emit FDX from the scene model, preserving scene numbers, revision sets, and ordered typed paragraphs. (Phase 1.5)
- **FDX passthrough bag** — store any FDX element we don't model (ScriptNotes, Tagger tag data, watermarking, page layout, SmartType macros) verbatim, keyed per scene/paragraph, so re-export loses nothing. (Phase 1.5 — the single biggest fidelity win, but only meaningful once FDX import/export exists.)
- **Asterisk emission** — right-margin revision asterisks on export, driven by `scene_revision_changes`. (Phase 1.5, with FDX export.)
- **Per-conflict in-app-wins resolution** — Phase 1's gated re-import already stages→diffs→confirms→applies with Final-Draft-wins as the default and the in-app edit retained in history (the per-conflict `resolve-<sceneId>` choice rides along in the confirm submit); actually *applying* the in-app side when the user picks it (instead of FD-wins) is the remaining refinement. The gated review flow itself is **in Phase 1**, not deferred. (Phase 1.5)
- **Tier-3 fidelity refinement** — reconstruct existing-scene bodies from stored `raw_source` so tier-3 fuzzy matching compares full prose on re-import (Phase 1 keys tier 2 on stored hashes and unit-tests tier-3 body similarity directly). (Phase 1.5)
- **`SceneSegment`** — the schedulable sub-scene unit (in eighths); Phase 1 stores `page_eighths` on the Scene and defaults each scene to one full-scene segment when segments arrive. (Phase 3 — scheduling.)

---

## Done criteria (adapted from the spec)

- [ ] Import a real Fountain script → correct Scene list with INT/EXT, location slug, day/night, page-eighths, and synopsis.
- [ ] Scene numbers with letter suffixes (e.g. `5A`) and OMITTED scenes are captured correctly.
- [ ] Re-import is **gated (stage → diff → user confirm → apply)** and never silently destructive: staging snapshots the immutable `script_versions` row and computes the diff **without mutating any `scenes`**; the matcher classifies each scene as unchanged / modified / new / removed (and conflict when applicable); only on confirmation does apply run, **matched scenes keep their immutable `id`**, and removed scenes become `status='omitted'` (never deleted).
- [ ] The 3-tier matcher works: tier 1 (locked-number key join), tier 2 (slugline + content hash), tier 3 (fuzzy similarity with a confidence score) — all covered by pure unit tests.
- [ ] Each import is snapshotted as an immutable `script_versions` row storing the raw source; the reconciliation mapping is persisted in `scene_sources` (computed once).
- [ ] The revision-set model is seeded (White → … → Tan) with exactly one active set; scene changes are flagged per active revision in `scene_revision_changes`.
- [ ] Both write paths work: in-app edits record into the active revision set (anchored to the stable scene UUID and surviving re-import); re-import runs through stage → matcher → diff → user confirm → apply (the staged version is the immutable snapshot; apply runs only on confirmation).
- [ ] Conflict resolution: a scene edited in-app **and** changed in a re-imported draft is surfaced as a conflict, defaults to **Final-Draft-wins**, and the in-app edit is retained in history for re-apply.
- [ ] Everything is project-scoped under RLS (every new table has 4 policies joining to the owning project's `owner_id`); a second user cannot see the first user's scripts/scenes (integration test).
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all green; the integration suite passes against local Supabase.
