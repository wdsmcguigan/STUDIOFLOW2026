# Storyboard — Visual Development Wedge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first generative module — open a Scene → AI decomposes it into a shot list → render a reference-consistent panel per shot as cancellable background jobs → human curates (reorder/variant/regenerate/upload/confirm) → export a storyboard PDF.

**Architecture:** New first-class `shots` (scene-anchored, immutable id) with image `shot_frames`; lockable per-Character/per-Location `visual_references` (the Moodboard seed) that condition generation for consistency. **Decompose is a fast synchronous text call** in the server action (so the shot count is known before spend); **rendering is WDK background jobs** (slow/costly/cancellable, results non-destructive `suggested`). A swappable `ImageEngine` abstracts Gemini (multimodal `generateText`→`result.files`) from image-only providers. Owner-only RLS (permissions deferred). Storyboard is a graph *consumer* (reads script+breakdown).

**Tech Stack:** Next.js 16 / React 19 · Supabase (Postgres + Storage) · Vercel AI SDK v6 (`ai`, `@ai-sdk/google`) via AI Gateway · WDK (`workflow/api`) · `@dnd-kit/*` · `@react-pdf/renderer` · Zod v4 · Vitest. **All deps already installed — no `package.json`/lock changes, so the CI lock-trap does not apply this phase.**

**Source docs:** spec `docs/superpowers/specs/2026-06-06-studioflow-storyboard-design.md`; research `docs/superpowers/specs/2026-06-06-storyboard-research.md` (cite for Gemini API shape, ShotBench taxonomy, prompt template, consistency caveats).

---

## Conventions (apply to EVERY task)

- **TDD:** write the failing test → run it red → implement minimal → run green → commit. One logical change per commit.
- **Migrations:** forward-only from **0019**. Mirror `0013`/`0017`/`0018` style: `text + CHECK` enums, FK indexes, `create trigger <t>_set_updated_at before update … execute function extensions.moddatetime(updated_at)`, per-op RLS policies, `grant select, insert, update, delete … to authenticated`. Cross-entity FKs validate **both** project + the other FK in insert AND update `with check` via `SECURITY DEFINER` helpers (`language sql`, `stable`, `set search_path = ''`, return boolean — the `0013` `..._owned_by` pattern). After each migration: `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts` (verify line 1 is `export type Json =`).
- **Data layer:** `lib/storyboard/data.ts` is the ONLY place storyboard Supabase queries live. `type DbClient = SupabaseClient<Database>`; parse-on-read with Zod; `throw new Error(error.message, { cause: error })`; parsed write inputs. Keep functions small.
- **Pure engine code** (`prompt.ts`, `cost.ts`, `selectConditioningRefs`) does NO I/O and never calls `Date.now()`/`new Date()` (the test runtime forbids it) — trivially unit-testable.
- **Actions** (`"use server"`): each Zod-parses `FormData`, uses the SSR client (`@/lib/supabase/server`) to prove ownership, calls the data layer, `revalidatePath`. **Export ONLY locally-defined async functions** (`grep "^export" actions.ts` → every line is `export async function`) — re-exporting an import is a runtime manifest 404. Numeric fields via `z.coerce.number()`.
- **Background work:** WDK workflows in `workflows/*.ts` use the **service-role client** (`createServiceClient()`); ownership is proven at enqueue under the user's RLS. Mirror `workflows/breakdown.ts` (`"use workflow"` orchestrator + `"use step"` substeps + cooperative cancel via `isJobCancelled`).
- **Two-user RLS tests:** copy the harness header (`createClient`/`SupabaseClient`/`Database` imports, `url`/`anon`/`service`, `makeUser`, `newProject`) from `lib/callsheet/data.test.ts` lines ~1–48. Wrap in `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)(...)`. Run DB tests with `npx dotenv -e .env.local -- npm test -- <file>`.
- **UI:** design tokens only (no hardcoded colors) — AI surfaces use the sage→amethyst accent per the design foundation. The ONE exception is the PDF stylesheet (react-pdf can't read CSS vars → hard-code the palette hexes with a comment, like `lib/callsheet/pdf`).

## File Structure

```
supabase/migrations/0019_storyboard_refs_storage.sql   visual settings + visual_references + storyboards bucket + jobs CHECK
supabase/migrations/0020_shots_frames.sql              shots + shot_frames
supabase/migrations/0021_image_generations.sql         append-only cost ledger
lib/storyboard/schema.ts        Zod rows, write inputs, shot-list structured-output schema, result types
lib/storyboard/data.ts          the only storyboard query layer (settings, refs, shots, frames, board, ledger, render inputs)
lib/storyboard/cost.ts          pure est-cost price map
lib/storyboard/ai/model.ts      getDecomposeModel() / getImageModel() (swap point)
lib/storyboard/ai/prompt.ts     buildPanelPrompt + selectConditioningRefs (pure)
lib/storyboard/ai/decompose.ts  decomposeScene() — text → structured shot list
lib/storyboard/ai/engine.ts     ImageEngine interface + GeminiImageEngine + FakeImageEngine + getImageEngine()
lib/storage/storyboards.ts      upload + signed-URL helpers (service-role, server-only)
lib/storyboard/pdf/storyboard-document.tsx   react-pdf <Document>
lib/storyboard/integration.test.ts           ⭐ the thesis test
workflows/storyboard.ts         renderSceneWorkflow (takes shotIds — single-shot regenerate passes one) + referenceWorkflow (WDK)
app/dashboard/[projectId]/storyboard/page.tsx       scene picker + board + references + style
app/dashboard/[projectId]/storyboard/actions.ts     server actions
app/dashboard/[projectId]/storyboard/[sceneId]/pdf/route.ts   PDF stream
components/storyboard/*          board grid (dnd-kit), shot card, variant picker, references panel, style settings, cost chip, confirm dialog, export button
```

---

## Task 0: Worktree + environment baseline

- [ ] **Step 1:** Confirm `git branch --show-current` → `storyboard-visual-dev`; worktree based off `studioflowv2/main` (HEAD `7e89f34`, migrations 0001–0018). `git status` clean apart from the two committed spec docs.
- [ ] **Step 2:** `.env.local` exists (NOT inherited across worktrees — regenerate from `npx supabase status -o env` if missing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Docker running; `npx supabase start`; `npx supabase migration list --local` shows 0001–0018.
- [ ] **Step 3:** `npm install` (deps already present — if it rewrites `package-lock.json`, `git checkout -- package-lock.json`). Green baseline: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` (expect ~532 passed + 1 skipped).
- [ ] **Step 4:** Add `GEMINI_API_KEY`/`GOOGLE_GENERATIVE_AI_API_KEY` note: live generation needs a key, but ALL tests use injected fakes/mocks — no key required for the suite. No commit (nothing changed).

---

## Task 1: Migration 0019 — visual settings + references + storage bucket + jobs CHECK

**Files:** Create `supabase/migrations/0019_storyboard_refs_storage.sql`, `lib/storyboard/data.test.ts`; Modify `lib/db/types.ts`.

- [ ] **Step 1: Write the migration.**

```sql
-- ============================================================================
-- 0019: Visual Development — project visual settings + visual references
-- (the Moodboard seed) + private storyboards Storage bucket. Owner-only RLS.
-- Also widens jobs.type for the new storyboard job kinds.
-- ============================================================================

-- One reusable same-project helper for cross-entity FK with-checks this phase.
create function public.character_owned_by(p_character_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.characters c join public.projects p on p.id = c.project_id
    where c.id = p_character_id and p.owner_id = p_user_id);
$$;
create function public.location_owned_by(p_location_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.locations l join public.projects p on p.id = l.project_id
    where l.id = p_location_id and p.owner_id = p_user_id);
$$;

-- project_visual_settings: one row per project (lazy get-or-create).
create table public.project_visual_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  style_preset text not null default 'storyboard_sketch'
    check (style_preset in ('storyboard_sketch','graphic_novel_ink','photoreal_cinematic','rough_pencil')),
  custom_style_prompt text,
  aspect_ratio text not null default '16:9' check (aspect_ratio in ('16:9','2.39:1','4:3','1:1')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_visual_settings enable row level security;
create policy "pvs - select" on public.project_visual_settings for select using (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
create policy "pvs - insert" on public.project_visual_settings for insert with check (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
create policy "pvs - update" on public.project_visual_settings for update using (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
create policy "pvs - delete" on public.project_visual_settings for delete using (exists (select 1 from public.projects p where p.id = project_visual_settings.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.project_visual_settings to authenticated;
create trigger pvs_set_updated_at before update on public.project_visual_settings for each row execute function extensions.moddatetime(updated_at);

-- visual_references: lockable character sheet / location plate.
create table public.visual_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_type text not null check (subject_type in ('character','location')),
  character_id uuid references public.characters(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  image_path text,
  source text not null default 'ai' check (source in ('ai','upload')),
  status text not null default 'suggested' check (status in ('suggested','locked','rejected')),
  is_primary boolean not null default false,
  prompt_used text,
  generation_metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vr_one_subject check (
    (subject_type = 'character' and character_id is not null and location_id is null) or
    (subject_type = 'location'  and location_id  is not null and character_id is null)
  )
);
create index visual_references_project_id_idx on public.visual_references(project_id);
create index visual_references_character_id_idx on public.visual_references(character_id);
create index visual_references_location_id_idx on public.visual_references(location_id);
-- at most one primary/locked reference per subject (the one we condition on)
create unique index vr_one_primary_character on public.visual_references(character_id) where is_primary and character_id is not null;
create unique index vr_one_primary_location  on public.visual_references(location_id)  where is_primary and location_id  is not null;

alter table public.visual_references enable row level security;
create policy "vr - select" on public.visual_references for select using (exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid()));
create policy "vr - insert" on public.visual_references for insert with check (
  exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid())
  and (character_id is null or public.character_owned_by(character_id, auth.uid()))
  and (location_id  is null or public.location_owned_by(location_id,  auth.uid()))
);
create policy "vr - update" on public.visual_references for update using (exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid())) with check (
  exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid())
  and (character_id is null or public.character_owned_by(character_id, auth.uid()))
  and (location_id  is null or public.location_owned_by(location_id,  auth.uid()))
);
create policy "vr - delete" on public.visual_references for delete using (exists (select 1 from public.projects p where p.id = visual_references.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.visual_references to authenticated;
create trigger vr_set_updated_at before update on public.visual_references for each row execute function extensions.moddatetime(updated_at);

-- Private Storage bucket; paths are <project_id>/... so owner-scoping = first folder.
insert into storage.buckets (id, name, public) values ('storyboards', 'storyboards', false)
  on conflict (id) do nothing;
create policy "storyboards - select" on storage.objects for select to authenticated using (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));
create policy "storyboards - insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));
create policy "storyboards - update" on storage.objects for update to authenticated using (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));
create policy "storyboards - delete" on storage.objects for delete to authenticated using (
  bucket_id = 'storyboards' and exists (select 1 from public.projects p where p.id = ((storage.foldername(name))[1])::uuid and p.owner_id = auth.uid()));

-- Widen jobs.type for storyboard kinds (column already exists; replace the CHECK).
alter table public.jobs drop constraint jobs_type_check;
alter table public.jobs add constraint jobs_type_check
  check (type in ('breakdown','import','storyboard_render','storyboard_reference'));
```

> **Verify at impl:** the `storage.foldername(name)[1]` cast assumes paths begin with the project UUID — keep ALL bucket paths `<project_id>/...`. Confirm `storage.foldername` exists locally (Supabase ≥ the version 0009 used); if `((...)[1])::uuid` errors on a non-uuid folder, the cast is fine because our paths always start with a uuid.

- [ ] **Step 2: Apply + regen types** (Conventions). Confirm `project_visual_settings`, `visual_references` appear in `lib/db/types.ts`.
- [ ] **Step 3: Create `lib/storyboard/data.test.ts`** with the harness header (copy from `lib/callsheet/data.test.ts` ~1–48; use raw `client.from(...)` here). `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("storyboard refs RLS (0019)", ...)`:
  - Alice creates a character + location in her project; inserts a `project_visual_settings` row and a `visual_references` row for the character → succeed + selectable.
  - Bob cannot select Alice's settings/reference (0 rows).
  - **Two-FK escape:** Bob inserts a `visual_references` row with `project_id = bobProject` but `character_id =` Alice's character → rejected (RLS with-check).
  - The `vr_one_primary_character` partial-unique: two `is_primary=true` rows for the same character → second errors `23505`.
- [ ] **Step 4: Run** `npx dotenv -e .env.local -- npm test -- lib/storyboard/data.test.ts` → pass.
- [ ] **Step 5: Commit** `git add supabase/migrations/0019_storyboard_refs_storage.sql lib/db/types.ts lib/storyboard/data.test.ts && git commit -m "feat(storyboard): migration 0019 visual settings + references + storage bucket (owner RLS)"`.

---

## Task 2: `lib/storyboard/schema.ts` — typed contract

**Files:** Create `lib/storyboard/schema.ts`, `lib/storyboard/schema.test.ts`.

- [ ] **Step 1: Failing tests** for: a `projectVisualSettings` read-row parse; a `visualReference` read-row parse; the **shot-list structured-output** schema `shotListOutput` accepting `{ schemaVersion: 1, shots: [{ size:"CU", angle:"low", movement:"static", lens:null, action:"Mary draws" }] }` and rejecting an unknown `size`.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement.** Mirror `lib/breakdown/schema.ts` (loose nullables on read rows, strict write inputs, `z.uuid()`). Define the **ShotBench-derived enums** (research companion) as Zod enums and EXPORT them for reuse by migrations-comments/UI:

```ts
export const SHOT_SIZES = ["EWS","WS","MW","MS","MCU","CU","ECU"] as const;
export const SHOT_ANGLES = ["eye","low","high","overhead","aerial","dutch"] as const;
export const SHOT_MOVEMENTS = ["static","pan","tilt","push_in","pull_out","zoom","arc","dolly","crane","handheld"] as const;

export const shotListItem = z.object({
  size: z.enum(SHOT_SIZES),
  angle: z.enum(SHOT_ANGLES),
  movement: z.enum(SHOT_MOVEMENTS),
  lens: z.string().nullable().optional(),
  action: z.string().min(1),            // free-text — taxonomy is camera-only
});
export const shotListOutput = z.object({ schemaVersion: z.literal(1), shots: z.array(shotListItem).max(20) });
export type ShotListOutput = z.infer<typeof shotListOutput>;
```

  Also export read-row types `ProjectVisualSettings`, `VisualReference`, and (placeholder) `Shot`/`ShotFrame`/`ImageGeneration` rows + `SceneBoard`/`ShotWithFrames`/`RefImage` result types you'll flesh out as those tables land (define them now from the 0020/0021 column lists in the spec so later tasks are type-consistent).
- [ ] **Step 4-5:** Run → pass; `npm run typecheck`; commit `feat(storyboard): Zod contract — shot-list output + row/result types`.

---

## Task 3: `lib/storyboard/data.ts` — settings + references layer

**Files:** Create `lib/storyboard/data.ts`; append to `lib/storyboard/data.test.ts`.

- [ ] **Step 1: Failing tests** (live-DB, harness): `getOrCreateVisualSettings(client, projectId)` twice ⇒ same id (idempotent; handle `23505` re-read like `getOrCreateDefaultBudget`); `updateVisualSettings`; `createVisualReference`/`listVisualReferences(projectId)`; `lockReference(client,{id})` sets `status='locked', is_primary=true` and clears any prior primary for that subject (do it in a small transaction-ish sequence: clear others' `is_primary` for the subject, then set this one); `setReferenceStatus`; `getLockedReferences(client, projectId)` returns only locked primaries grouped usable by subject.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement** (Conventions; mirror `lib/budget/data.ts`). `lockReference` must avoid the partial-unique collision: first `update visual_references set is_primary=false where <same subject> and is_primary`, then set the target `status='locked', is_primary=true`.
- [ ] **Step 4-5:** pass; typecheck; commit `feat(storyboard): data layer — visual settings + references (lock/get-locked)`.

---

## Task 4: Migration 0020 — shots + shot_frames

**Files:** Create `supabase/migrations/0020_shots_frames.sql`; Modify `lib/db/types.ts`; append RLS tests.

- [ ] **Step 1: Write the migration.** `shots` has two cross-entity FKs (project + scene) → reuse a `scene_owned_by` helper (define it here). `shot_frames` scopes via shot → reuse a `shot_owned_by` helper.

```sql
create function public.scene_owned_by(p_scene_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.scenes s join public.projects p on p.id = s.project_id
    where s.id = p_scene_id and p.owner_id = p_user_id);
$$;
create function public.shot_owned_by(p_shot_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.shots s join public.projects p on p.id = s.project_id
    where s.id = p_shot_id and p.owner_id = p_user_id);
$$;

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  ordinal int not null,
  shot_number text,
  size text check (size in ('EWS','WS','MW','MS','MCU','CU','ECU')),
  angle text check (angle in ('eye','low','high','overhead','aerial','dutch')),
  movement text check (movement in ('static','pan','tilt','push_in','pull_out','zoom','arc','dolly','crane','handheld')),
  lens text,
  action text,
  status text not null default 'suggested' check (status in ('suggested','confirmed','rejected')),
  provenance text not null default 'ai' check (provenance in ('ai','manual')),
  text_anchor jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shots_scene_ordinal_idx on public.shots(scene_id, ordinal);
create index shots_project_id_idx on public.shots(project_id);
alter table public.shots enable row level security;
create policy "shots - select" on public.shots for select using (exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid()));
create policy "shots - insert" on public.shots for insert with check (
  exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid())
  and public.scene_owned_by(scene_id, auth.uid()));
create policy "shots - update" on public.shots for update using (exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid())) with check (
  exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid())
  and public.scene_owned_by(scene_id, auth.uid()));
create policy "shots - delete" on public.shots for delete using (exists (select 1 from public.projects p where p.id = shots.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.shots to authenticated;
create trigger shots_set_updated_at before update on public.shots for each row execute function extensions.moddatetime(updated_at);

create table public.shot_frames (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shot_id uuid not null references public.shots(id) on delete cascade,
  image_path text not null,
  source text not null default 'ai' check (source in ('ai','upload')),
  status text not null default 'suggested' check (status in ('suggested','selected','rejected')),
  is_selected boolean not null default false,
  ordinal int not null default 0,
  prompt_used text,
  generation_metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shot_frames_shot_ordinal_idx on public.shot_frames(shot_id, ordinal);
create unique index shot_frames_one_selected on public.shot_frames(shot_id) where is_selected;
alter table public.shot_frames enable row level security;
create policy "frames - select" on public.shot_frames for select using (exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid()));
create policy "frames - insert" on public.shot_frames for insert with check (
  exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid())
  and public.shot_owned_by(shot_id, auth.uid()));
create policy "frames - update" on public.shot_frames for update using (exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid())) with check (
  exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid())
  and public.shot_owned_by(shot_id, auth.uid()));
create policy "frames - delete" on public.shot_frames for delete using (exists (select 1 from public.projects p where p.id = shot_frames.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.shot_frames to authenticated;
create trigger frames_set_updated_at before update on public.shot_frames for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2:** Apply + regen types. Confirm both tables appear.
- [ ] **Step 3: RLS tests** (`"shots/frames RLS (0020)"`): Alice creates a scene (insert into `scenes` directly — check `lib/scripts/data.test.ts` for required columns: `project_id`, a `script_version_id`/`scene_number`, etc.), then a shot + a frame; Bob can't see them; **two-FK escapes:** Bob inserts a shot with `project_id=bobProject, scene_id=`Alice's scene → rejected; Bob inserts a frame referencing Alice's shot → rejected; `shot_frames_one_selected`: two `is_selected=true` for one shot → `23505`.
- [ ] **Step 4-5:** Run → pass; commit `feat(storyboard): migration 0020 shots + frames (two-FK RLS, one-selected)`.

---

## Task 5: `lib/storyboard/data.ts` — shots + frames layer

**Files:** Modify `lib/storyboard/data.ts`; append tests.

- [ ] **Step 1: Failing tests:** `createShot` (computes next `ordinal` for the scene); `listShots(sceneId)` ordered by ordinal; `updateShot` (metadata); `reorderShots(client,{sceneId, orderedIds})` (writes new ordinals 0..n by array position); `setShotStatus`; `deleteShot`; `createShotFrame` (first frame for a shot becomes `is_selected=true`, later frames default false); `listShotFrames(shotId)`; `selectFrame(client,{shotId,frameId})` (clears prior selected then sets one — avoid the `shot_frames_one_selected` collision the same way `lockReference` does); `setFrameStatus`; `deleteShotFrame`.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement** (Conventions). `selectFrame`: `update shot_frames set is_selected=false, status='suggested' where shot_id=? and is_selected`; then `update ... set is_selected=true, status='selected' where id=?`.
- [ ] **Step 4-5:** pass; typecheck; commit `feat(storyboard): data layer — shots + frames (reorder, select, status)`.

---

## Task 6: Migration 0021 — image_generations ledger + cost

**Files:** Create `supabase/migrations/0021_image_generations.sql`, `lib/storyboard/cost.ts`, `lib/storyboard/cost.test.ts`; Modify `lib/db/types.ts`, `lib/storyboard/data.ts` + tests.

- [ ] **Step 1: Migration** (append-only — NO update/delete policy):

```sql
create table public.image_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  kind text not null check (kind in ('decompose','render','reference')),
  model text not null,
  image_count int not null default 0,
  est_cost numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index image_generations_project_created_idx on public.image_generations(project_id, created_at);
alter table public.image_generations enable row level security;
create policy "imggen - select" on public.image_generations for select using (exists (select 1 from public.projects p where p.id = image_generations.project_id and p.owner_id = auth.uid()));
create policy "imggen - insert" on public.image_generations for insert with check (exists (select 1 from public.projects p where p.id = image_generations.project_id and p.owner_id = auth.uid()));
grant select, insert on public.image_generations to authenticated;
```

- [ ] **Step 2:** Apply + regen types. **Then `npx supabase db reset`** to confirm 0001→0021 replay clean (catches helper/order errors early).
- [ ] **Step 3: `lib/storyboard/cost.ts`** — pure. Tests: `estimateCost("gemini-2.5-flash-image", 4)` returns `4 * PRICE_PER_IMAGE[model]`; unknown model falls back to a `DEFAULT_PRICE`. Implement a small `PRICE_PER_IMAGE` map + `estimateCost(model, n)`. (Static price is fine for the counter — spec Open Question.)
- [ ] **Step 4: Data fns + tests:** `recordImageGeneration(client,{projectId,jobId,kind,model,imageCount,estCost})`; `getGenerationTotals(client, projectId)` → `{ imageCount, estCost }` (sum). RLS test: Bob can't read Alice's ledger; ledger has no update path (assert an update is rejected/no-op).
- [ ] **Step 5:** Run → pass; commit `feat(storyboard): migration 0021 image-gen ledger + pure cost estimator`.

---

## Task 7: `lib/storyboard/ai/prompt.ts` — prompt assembly + ref selection (pure)

**Files:** Create `lib/storyboard/ai/prompt.ts`, `lib/storyboard/ai/prompt.test.ts`.

- [ ] **Step 1: Failing tests:**
  - `buildPanelPrompt({ sceneMeta, shot, style })` produces a string containing the scene's INT/EXT + time-of-day + location name + the shot `action`, the `style` art-style fragment, and the aspect ratio; uses Google's comic-panel template structure (assert it contains `"comic book panel"` and the action text).
  - `selectConditioningRefs({ characterRefs, locationRef }, cap)` returns location plate + character sheets, **capped at `cap` (default 6)**, principals first (input order = principal order), and excludes subjects with no locked ref.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement.**

```ts
import type { RefImage } from "@/lib/storyboard/schema";

const STYLE_FRAGMENTS: Record<string, string> = {
  storyboard_sketch: "rough black-and-white storyboard sketch, dynamic linework",
  graphic_novel_ink: "inked graphic-novel panel, bold blacks, cross-hatching",
  photoreal_cinematic: "photorealistic cinematic film still, shallow depth of field",
  rough_pencil: "loose pencil storyboard, gestural, grayscale",
};

export interface SceneMeta { intExt: string | null; timeOfDay: string | null; locationName: string | null; synopsis: string | null; }
export interface ShotMeta { size: string | null; angle: string | null; movement: string | null; lens: string | null; action: string | null; }
export interface StyleMeta { stylePreset: string; customStylePrompt: string | null; aspectRatio: string; }

export function buildPanelPrompt(args: { sceneMeta: SceneMeta; shot: ShotMeta; style: StyleMeta }): string {
  const { sceneMeta, shot, style } = args;
  const art = style.customStylePrompt?.trim() || STYLE_FRAGMENTS[style.stylePreset] || STYLE_FRAGMENTS.storyboard_sketch;
  const framing = [shot.size, shot.angle, shot.movement, shot.lens].filter(Boolean).join(", ");
  const setting = [sceneMeta.intExt, sceneMeta.locationName, sceneMeta.timeOfDay].filter(Boolean).join(" — ") || "unspecified setting";
  // Google's verbatim comic-panel template (research companion).
  return [
    `A single comic book panel in a ${art} style.`,
    `In the foreground, ${shot.action || sceneMeta.synopsis || "the scene's action"}${framing ? ` (${framing})` : ""}.`,
    `In the background, ${setting}.`,
    `Aspect ratio ${style.aspectRatio}.`,
  ].join(" ");
}

export function selectConditioningRefs(
  args: { characterRefs: RefImage[]; locationRef: RefImage | null },
  cap = 6,
): RefImage[] {
  const refs = [...(args.locationRef ? [args.locationRef] : []), ...args.characterRefs];
  return refs.slice(0, cap);
}
```

- [ ] **Step 4-5:** pass; typecheck; commit `feat(storyboard): pure panel-prompt assembly + capped ref selection`.

---

## Task 8: `lib/storyboard/ai/decompose.ts` + `model.ts` — scene → shot list

**Files:** Create `lib/storyboard/ai/model.ts`, `lib/storyboard/ai/decompose.ts`, `lib/storyboard/ai/decompose.test.ts`.

- [ ] **Step 1: Failing test** (mirror `lib/breakdown/ai/engine.test.ts` exactly — `MockLanguageModelV3` from `ai/test`, `LanguageModelV3GenerateResult`, `content:[{type:"text", text: JSON.stringify({schemaVersion:1, shots:[...]})}]`): `decomposeScene({ model: mock(), sceneMeta, sceneText })` returns the validated `ShotListOutput` with the shots.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement.** `model.ts`: `getDecomposeModel()` → `google("gemini-2.5-flash")`; `getImageModel()` → `google("gemini-2.5-flash-image")` (the swap point; **model id config-driven** — read `process.env.STORYBOARD_IMAGE_MODEL ?? "gemini-2.5-flash-image"`; research flags newer Nano Banana 2/Pro variants). `decompose.ts` mirrors `runBreakdown`: build a decompose prompt (instruct: propose 3–12 shots covering the scene; for each emit size/angle/movement/action using ONLY the allowed enum values — list them), `generateObject({ model, schema: shotListOutput, prompt })`, return `object`.
- [ ] **Step 4-5:** pass; typecheck; commit `feat(storyboard): scene→shot-list decompose engine (structured output)`.

---

## Task 9: `lib/storyboard/ai/engine.ts` + `lib/storage/storyboards.ts` — image engine + storage

**Files:** Create `lib/storyboard/ai/engine.ts`, `lib/storyboard/ai/engine.test.ts`, `lib/storage/storyboards.ts`.

- [ ] **Step 1: Failing test** for the engine seam using the **FakeImageEngine** (no network): assert `FakeImageEngine.generate({ prompt, references, aspectRatio })` returns `{ images: [Uint8Array], meta }` and echoes `prompt` + `references.map(r=>r.label)` into `meta` (so callers can assert wiring). Also a contract test: `getImageEngine()` returns an object with a `generate` method.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement.**

```ts
import "server-only";
import { generateText } from "ai";
import { getImageModel } from "@/lib/storyboard/ai/model";
import type { RefImage } from "@/lib/storyboard/schema";

export interface GenerateArgs { prompt: string; references: RefImage[]; aspectRatio: string; n?: number; }
export interface GenerateResult { images: Uint8Array[]; meta: Record<string, unknown>; }
export interface ImageEngine { generate(args: GenerateArgs): Promise<GenerateResult>; }

/** Default: Gemini multimodal LLM — generateText, read images from result.files. */
export class GeminiImageEngine implements ImageEngine {
  async generate({ prompt, references, aspectRatio }: GenerateArgs): Promise<GenerateResult> {
    const result = await generateText({
      model: getImageModel(),
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        // refs as image content parts; a Supabase signed URL feeds in directly
        ...references.map((r) => ({ type: "image" as const, image: new URL(r.signedUrl), mediaType: r.mediaType })),
      ] }],
    });
    // VERIFY at impl against AI SDK v6: result.files elements expose binary + mediaType
    // (cookbook shows .uint8Array / .mediaType). Map only image/* files.
    const images = (result.files ?? [])
      .filter((f: { mediaType?: string }) => f.mediaType?.startsWith("image/"))
      .map((f: { uint8Array: Uint8Array }) => f.uint8Array);
    return { images, meta: { model: getImageModel().modelId, aspectRatio, refCount: references.length } };
  }
}

/** Deterministic test engine — 1x1 PNG, no network, echoes wiring. */
export class FakeImageEngine implements ImageEngine {
  async generate({ prompt, references, aspectRatio }: GenerateArgs): Promise<GenerateResult> {
    const onePxPng = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]); // PNG magic
    return { images: [onePxPng], meta: { prompt, refs: references.map((r) => r.label ?? r.signedUrl), aspectRatio } };
  }
}

export function getImageEngine(): ImageEngine {
  return process.env.STORYBOARD_FAKE_ENGINE === "1" ? new FakeImageEngine() : new GeminiImageEngine();
}
```

  `lib/storage/storyboards.ts` (server-only, service client): `uploadStoryboardImage(bytes, { path, contentType })` → `createServiceClient().storage.from("storyboards").upload(path, bytes, { contentType, upsert: true })`; `signStoryboardUrl(path, expiresIn=3600)` → `.createSignedUrl(path, expiresIn)` → returns `signedUrl`. (Consult Supabase JS Storage docs — research links — for exact return shapes.)
- [ ] **Step 4-5:** pass; typecheck; commit `feat(storyboard): swappable ImageEngine (Gemini generateText) + storage helpers`.

---

## Task 10: `workflows/storyboard.ts` — render + reference WDK jobs

**Files:** Create `workflows/storyboard.ts`, `workflows/storyboard.test.ts`; Modify `lib/breakdown/data.ts` (`createJob` type union) + the `job` Zod schema in `lib/breakdown/schema.ts`.

- [ ] **Step 1:** Widen `createJob`'s `type` union to include `"storyboard_render" | "storyboard_reference"` and the `job` Zod `type` enum likewise (so parse-on-read accepts them). Run `npm run typecheck`.
- [ ] **Step 2: Failing test** (mirror `workflows/breakdown.test.ts`): with `STORYBOARD_FAKE_ENGINE=1`, drive `renderSceneWorkflow` over a seeded scene+shots (service client) and assert each shot gets a `shot_frames` row (`source='ai'`, first `is_selected`), the job ends `succeeded`, and an `image_generations` row is appended. (If `breakdown.test.ts` exercises the workflow via direct step-function calls rather than the durable runner, mirror that approach.)
- [ ] **Step 3: Implement** (mirror `workflows/breakdown.ts`). `renderSceneWorkflow({ jobId, projectId, sceneId, shotIds })` `"use workflow"`: for each shotId → `renderShotStep` (honor `isJobCancelled`), `reportProgress`, then `finalize`/`failJob`. `renderShotStep` `"use step"` (service client): load the shot + its scene meta + project style + **locked refs** (`getLockedReferences` → signed URLs via `signStoryboardUrl`) → `buildPanelPrompt` + `selectConditioningRefs` → `getImageEngine().generate(...)` → `uploadStoryboardImage` to `<projectId>/shots/<shotId>/<uuid>.png` → `createShotFrame` (`source='ai'`, `status='suggested'`) → `recordImageGeneration({kind:'render', model, imageCount: images.length, estCost: estimateCost(model, images.length)})`. `referenceWorkflow({ jobId, projectId, subjectType, subjectId })`: generate N variants for one character/location → upload to `<projectId>/references/<uuid>.png` → `createVisualReference` rows (`status='suggested'`).
- [ ] **Step 4-5:** Run with `STORYBOARD_FAKE_ENGINE=1 npx dotenv -e .env.local -- npm test -- workflows/storyboard.test.ts` → pass; commit `feat(storyboard): render + reference WDK workflows (fake-engine tested)`.

---

## Task 11: `lib/storyboard/data.ts` — board read + render inputs (reuses lib/breakdown)

**Files:** Modify `lib/storyboard/data.ts`; append tests.

- [ ] **Step 1: Failing tests:**
  - `getSceneBoard(client, sceneId)` → `{ sceneId, shots: ShotWithFrames[] }` where each shot carries its frames with **signed URLs** and a `selectedUrl`. (Seed a scene+shot+frame; assert the selected frame's signed URL is present.)
  - `loadRenderInputs(client, sceneId)` → `{ sceneMeta, characters: [{id,name}], locationId, style }` assembled by **reusing `lib/breakdown`** read fns (scene + `scene_characters`→characters present + the scene's location) — never re-query breakdown ad hoc.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement.** `getSceneBoard`: `listShots` + `listShotFrames` per shot + `signStoryboardUrl` for each frame's `image_path` (batch). `loadRenderInputs`: resolve `project_id` from the scene; read scene INT/EXT/time/synopsis/location; characters-present from `scene_characters` joined to `characters` (reuse the breakdown read fn that already does this — check `lib/breakdown/data.ts` exports; if none returns characters-for-scene, add a small `listSceneCharacters(client, sceneId)` there and reuse it); `getOrCreateVisualSettings` for style. This is the only place the render prompt's graph slice is assembled.
- [ ] **Step 4-5:** pass; commit `feat(storyboard): getSceneBoard (signed URLs) + loadRenderInputs (reuses breakdown)`.

---

## Task 12: Server actions

**Files:** Create `app/dashboard/[projectId]/storyboard/actions.ts`.

- [ ] **Step 1-4:** `"use server"` module; each action Zod-parses `FormData`, SSR client proves ownership, calls the data layer, `revalidatePath(\`/dashboard/${projectId}/storyboard\`)`. Actions:
  - `boardSceneAction` — **synchronous decompose** (cheap text call): `decomposeScene({ model: getDecomposeModel(), sceneMeta, sceneText })` → for each returned shot `createShot(... provenance:'ai', status:'suggested')`; append `image_generations(kind:'decompose', imageCount:0, estCost:0)`. (No images yet — render is a separate, confirmed step.)
  - `renderSceneAction` — the **batch/cost step**: count shots lacking a selected frame; create a `storyboard_render` job (`createJob`) under the user's RLS; `start(renderSceneWorkflow, [{ jobId, projectId, sceneId, shotIds }])`; `setJobStatus(running, workflowRunId)`. (The confirm-on-batch dialog lives in the UI; the count/est-cost are shown there before this POSTs.)
  - `renderShotAction` (regenerate one) — same pattern, single shotId.
  - `addManualShotAction`, `updateShotAction`, `setShotStatusAction`, `reorderShotsAction` (parse a JSON array of ids), `deleteShotAction`.
  - `selectFrameAction`, `setFrameStatusAction`, `deleteShotFrameAction`, `uploadFrameAction` (accepts an uploaded `File`; read bytes; `uploadStoryboardImage` to `<projectId>/shots/<shotId>/<uuid>` with `source='upload'`; `createShotFrame`).
  - `updateVisualSettingsAction`; `generateReferenceAction` (create `storyboard_reference` job + `start(referenceWorkflow,...)`); `lockReferenceAction`; `setReferenceStatusAction`.
  - `cancelStoryboardJobAction` (mirror `cancelJobAction` from breakdown: cooperative `setJobStatus('cancelled')` + best-effort `getRun(runId).cancel()`).
  - **Export hygiene:** `grep "^export" actions.ts` → every line is `export async function`. `npm run typecheck && npm run build` pass.
- [ ] **Step 5:** commit `feat(storyboard): server actions (decompose sync, render/reference jobs, curate, upload)`.

---

## Task 13: PDF document + route

**Files:** Create `lib/storyboard/pdf/storyboard-document.tsx`, `lib/storyboard/pdf/storyboard-document.test.ts`, `app/dashboard/[projectId]/storyboard/[sceneId]/pdf/route.ts`.

- [ ] **Step 1: Failing test:** `renderToBuffer(<StoryboardDocument board={fixture} />)` (from `@react-pdf/renderer`) → Buffer starting with `%PDF`. Fixture = a hand-built `SceneBoard` with 2 shots each having a `selectedUrl` (use a `data:`-URI tiny PNG so no network in the test). Mirror `lib/callsheet/pdf` test.
- [ ] **Step 2-4: Implement** `StoryboardDocument` — `<Document><Page>`: title band (scene number/heading), then a grid of panels (`<Image src={selectedUrl} />` + caption: shot number, size/angle, action). Use `StyleSheet.create` with hard-coded Tungsten & Sage hexes (comment referencing `app/globals.css`). **Remote images caveat (research, react-pdf#929):** the route must pass **signed URLs** that react-pdf can fetch server-side (or fetch bytes and pass `data:`/Buffer). `route.ts` `GET`: SSR `createClient()`, `getSceneBoard(supabase, sceneId)`, `renderToStream`/`renderToBuffer`, return `Response` with `content-type: application/pdf` + `content-disposition` filename. Render test → pass; `npm run build` passes.
- [ ] **Step 5:** commit `feat(storyboard): storyboard PDF document + streaming route`.

---

## Task 14: UI — board, references, style, nav

**Files:** Create `app/dashboard/[projectId]/storyboard/page.tsx` + `components/storyboard/*`; Modify the sidebar nav.

- [ ] **Step 1-4:** Server `page.tsx`: list the project's scenes (reuse the scripts/breakdown read fns); a **scene picker**; for the selected scene `getSceneBoard(supabase, sceneId)` + `getOrCreateVisualSettings` + `listVisualReferences` + `getGenerationTotals`. Components (design tokens only):
  - `board-grid.tsx` (`"use client"`) — `@dnd-kit/core` `DndContext` + `@dnd-kit/sortable` `SortableContext` (rectangular grid; `arrayMove` on drag end → `reorderShotsAction` with the new id order; include `KeyboardSensor` for a11y per dnd-kit docs).
  - `shot-card.tsx` — the selected frame (signed URL) + shot metadata + status badge; actions: regenerate (`renderShotAction`), variant picker (`selectFrameAction` over `listShotFrames`), upload (`uploadFrameAction`), edit metadata (`updateShotAction`), confirm/reject (`setShotStatusAction`).
  - `references-panel.tsx` — characters & locations each show their locked ref or a "Generate reference" (`generateReferenceAction`) + variant lock (`lockReferenceAction`).
  - `style-settings.tsx` — preset + aspect (`updateVisualSettingsAction`).
  - `board-toolbar.tsx` — "Board scene" (`boardSceneAction`), **confirm-on-batch dialog** before `renderSceneAction` (shows `N panels, ~$X` via `estimateCost`), a **cost chip** (`getGenerationTotals`), an **Export PDF** link to the `/pdf` route, and the job-progress/cancel (reuse the existing breakdown job-queue panel component if present — check `components/` for it; else a minimal status row calling `cancelStoryboardJobAction`).
  - Add a **"Storyboard"** sidebar entry (mirror how "Call Sheets" was added — check `components/layout/app-sidebar.tsx`).
  Verify `npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 5:** commit `feat(storyboard): board UI (dnd-kit grid, references, style, confirm-on-batch, export, nav)`.

---

## Task 15: ⭐ Cross-module integration test + browser smoke + final verify

**Files:** Create `lib/storyboard/integration.test.ts`.

- [ ] **Step 1-3: The thesis test** (live-DB, two-user harness, `STORYBOARD_FAKE_ENGINE` not needed — exercise data+derivation, not live image gen). Seed a project + script + a scene with **confirmed** characters-present (character + `cast_person_id` optional) + a location + a locked `visual_references` for the character and the location. Then:
  - `loadRenderInputs(sceneId)` → assert `sceneMeta.locationName` + the characters-present list match the seed (proves storyboard *consumes* breakdown).
  - `buildPanelPrompt`/`selectConditioningRefs` over that slice → assert the location plate + character sheet are selected (capped) and the prompt mentions the location + a shot action.
  - **Reject a character's presence** (`scene_characters.status='rejected'`) → `loadRenderInputs` drops that character (prompt/ref no longer include them).
  - **Change the scene's location** → `loadRenderInputs.locationName` reflects the new location.
  - **Renumber the scene** (`scenes.scene_number`) → existing `shots` for the scene stay attached (query `listShots(sceneId)` still returns them — keyed to `scene_id`).
  - Insert two `shots`, `reorderShots` → ordinals reflect the new order; `getSceneBoard` returns them in order.
- [ ] **Step 4: Browser smoke** (dev server via Bash — the Preview MCP can't run on `/Volumes`; use the Claude-in-Chrome extension + Mailpit OTP/PKCE per `local-supabase-auth-e2e-gotchas`). Pre-seed a project with breakdown via a throwaway service-role Node script (delete after; don't commit). Set `STORYBOARD_FAKE_ENGINE=1` so the smoke doesn't need a real API key (or set a real `GOOGLE_GENERATIVE_AI_API_KEY` to eyeball one real panel + character consistency across two panels — the manual live-precision check). Flow: sign in → open the project → Storyboard → set a style → lock a character reference → Board a scene (see suggested shots) → confirm-on-batch → see frames appear via the job panel → reorder + select a variant + confirm a shot → Export PDF (route returns `%PDF`) → confirm a `"use server"` action POSTs 200 (no manifest 404).
- [ ] **Step 5: Final verify + commit.** `npx supabase db reset` (confirm 0001→0021 replay clean) → `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` (all green; new storyboard tests added, prior ~532 still pass). Commit `test(storyboard): cross-module thesis integration test + final verify`. Then use **superpowers:finishing-a-development-branch** to open the PR to `studioflowv2/main` (do NOT merge — wait for the CI `build` check + explicit GO).

---

## Self-review notes (coverage map)

- Spec §Data model → Tasks 1, 4, 6 (3 migrations, owner RLS, two-FK helpers, storage bucket, jobs CHECK, partial-uniques). ✅
- Spec §Generative engine (two return shapes, generateText/result.files, refs as image parts, independent per-panel, ~3–6 cap, config model id) → Tasks 7, 8, 9, 10. ✅
- Spec Decision #6 (counter + confirm-on-batch) → Task 6 (ledger+cost), Task 12 (`renderSceneAction`), Task 14 (dialog + chip). ✅
- Spec Decision #7 (re-board append; confirmed survive) → render only fills shots lacking frames; decompose appends suggested shots; integration test asserts shots survive renumber. (Add an explicit "re-board appends, doesn't delete confirmed" assertion in Task 15 if not already covered.) ✅
- Spec Decision #8 (one selected frame; variants) → `shot_frames_one_selected` + `selectFrame` (Tasks 4, 5). ✅
- Spec Decision #9 (private bucket, signed URLs) → Tasks 1, 9, 11. ✅
- Spec §Testing (two-user RLS + storage isolation, engine fake, thesis, PDF %PDF, live-precision manual) → Tasks 1,4,6,9,10,13,15. ✅
- Spec §UX + PDF → Tasks 13, 14. ✅
