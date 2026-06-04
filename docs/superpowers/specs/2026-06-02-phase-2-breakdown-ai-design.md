# Phase 2 — Breakdown & AI Engine (Design Spec)

> **Status:** ✅ Finalized 2026-06-04 (supersedes the 2026-06-02 "draft for async review"; decisions resolved in the Phase 2 brainstorm).
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phase 0 (patterns) + Phase 1 (Scenes exist to tag, reconciliation spine for the re-anchoring seam).
> **Note:** AI prompt/output tuning is **empirical** — see §"AI engine (validate during execution)".

## Goal

Tag scenes with breakdown **Elements** and **Characters** — manually first, then **AI-assisted** — where AI output is *suggestions* a human confirms before anything flows downstream. Introduce the **async job system** (first needed here, for the slow LLM work). This is the module where the "AI genius" lives, and where the production graph gains the element/character/department/people richness every later phase (schedule, budget, call sheets) reads. It is also where breakdown is made to **survive script rewrites** (the re-anchoring seam) — our core differentiator against scene-number-keyed competitors.

---

## Decisions (resolved 2026-06-04)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | **Async job runner** | **Vercel Workflow (WDK)** | Platform-native to our Vercel deploy; durable / pause-resume / retries / cancellable; no third-party service to wire into local dev + CI. The AI *engine* stays a pure, swappable service, so the runner is a thin durable wrapper (runner choice is reversible). "Platform-native before custom infra." |
| 2 | **Element category taxonomy** | **Seed enum, per-project configurable, Movie-Magic-aligned** (`element_categories` + `departments` tables) | Standard seed list editable per project; names aligned to MM categories so a later MM import maps cleanly. Each category → a Department (the hinge to crew + budget accounts later). |
| 3 | **Cast / Character model** | **Dedicated `characters` + `scene_characters` join** carrying `presence_type` | Characters need aliases + merge that generic elements don't; `presence_type` (speaking/silent/background/voice-only) lives where it belongs. No double-modeling of people as elements. Stable Character IDs for the future closeout/casting modules. |
| 4/5 | **Entity scope** | **Broad slice**, everything **project-scoped** | Build Characters, Elements (+categories/departments), Organizations, People, the two scene-link tables, and Jobs. All reuse Phase 1's `project.owner_id = auth.uid()` RLS unchanged (lowest risk). Cross-project People/Org *reuse* is deferred (a future scoping migration — flagged, not additive-only). |
| 6 | **AI call granularity** | **Per-scene / small batch** | Clean progress, safe cancel between units, respects Gemini rate limits, enables re-running AI on just the modified scenes after a rewrite. Matches the WDK step/fan-out model. Batch size tuned empirically. |
| 7 | **AI provider wiring** | **Direct `@ai-sdk/google`** · env `GOOGLE_GENERATIVE_AI_API_KEY` | Simplest local setup, no gateway dependency. The engine takes an **injected model**, so swapping providers later is a one-line change at the composition root, and tests use a mock model. |
| 8 | **Tag re-anchoring** | **Full three-state** (`anchored` / `needs_review` / `orphaned`), `status` preserved | The differentiator. On re-import, each tag re-locates against the matched scene's new text; a `confirmed` tag is never silently demoted because prose moved. |
| 9 | **AI discipline** (charter-locked, not reopened) | Non-destructive `suggested` only (never auto-confirm) · human gate always · AI *proposes* alias-merges (never silently mints/merges) | Non-negotiable #6. Cancelling/ignoring a breakdown job is always safe because suggestions are invisible downstream until confirmed. |

### Research-inspired fold-ins (resolved 2026-06-04)

From a scan of AI script→video pipelines (HKUDS **ViMax**, Tencent/XD-MU **ScriptAgent**) and the graph-based scene-extraction literature (Gorinski & Lapata). Their intermediate representation — characters/environments extracted, reused across scenes for consistency, retrieved for reuse — *is* our production graph. Four cheap, additive shapings make Phase 2's data a robust substrate for the generative/previs features planned next, without widening the build. **All four folded in.**

- **F1 — Catalog-as-context (RAG-lite).** Each per-scene breakdown call receives the project's existing Character/Element catalog (canonical names + aliases) as context, so the model **reuses** existing entities and **proposes alias links** rather than minting duplicates. (ViMax "retrieval for reuse" applied to breakdown.) Directly strengthens idempotent upsert + the alias-merge proposal.
- **F2 — Extensible AI output schema.** The structured-output Zod schema is **discriminated + versioned** (`schema_version`, `kind: 'element' | 'character'`) so future shot/beat/blocking/look fields are *additive*, never a breaking change to the contract.
- **F3 — Descriptor extraction.** The engine fills a short `description` (appearance/attributes) on suggested characters/elements (ScriptAgent's "Character Description"). Rides on fields we already have; gated behind the same human-confirm. Useful as breakdown notes now; the visual-consistency anchor later.
- **F4 — "Designed-for generative/continuity" seams.** Documented in §"Designed-for (future, additive only)". Nothing built.

---

## Data model (additions to the graph)

All new tables are **project-scoped** and enforce **RLS** with the exact Phase 1 pattern (`exists (select 1 from public.projects p where p.id = <t>.project_id and p.owner_id = auth.uid())`), with per-operation policies (select/insert/update/delete). "Enums" are `text` + `CHECK` (matching Phase 1's `int_ext`/`status`) for easy evolution without native-enum migrations. FK columns are indexed; mutable tables get `moddatetime` `updated_at` triggers. New migrations continue from **0005**.

### Migration 0005 — graph entities
- **`departments`** — `{ id, project_id, name, code?, ordinal, created_at, updated_at }`. The hinge connecting element category ↔ crew ↔ (later) budget account. Seeded per project.
- **`element_categories`** — `{ id, project_id, name, code?, department_id? (FK departments, on delete set null), ordinal, created_at, updated_at }`. Seeded MM-aligned (see §Seeding); per-project add/rename/disable.
- **`organizations`** — `{ id, project_id, name, type ('production_company'|'agency'|'vendor'|'payroll'|'insurer'|'other'), notes?, created_at, updated_at }`. Vendors/rental houses for elements; agencies for people.
- **`people`** — `{ id, project_id, name, contact_email?, contact_phone?, org_id? (FK organizations, on delete set null), notes?, created_at, updated_at }`. Real humans (project-scoped for now).
- **`characters`** — `{ id, project_id, primary_name, aliases text[] not null default '{}', description?, cast_person_id? (FK people, on delete set null), created_at, updated_at }`. Narrative roles. A **merge** op re-points all `scene_characters` links from the absorbed character to the survivor, unions aliases, deletes the absorbed row — **atomic** (single RPC / transaction; see §Atomicity).
- **`elements`** — `{ id, project_id, category_id (FK element_categories), name, description?, vendor_org_id? (FK organizations, on delete set null), estimated_cost numeric? (dormant budget seam — NOT surfaced in Phase 2 UI), created_at, updated_at }`. Project-level catalog, reused across scenes.

### Migration 0006 — scene-link (junction) tables
**Both FKs validated in every insert/update policy** — the 0004 lesson (a junction must verify *both* targets belong to the caller's project, not just one). Two-user escape tests required.

- **`scene_elements`** — the Scene↔Element link:
  `{ id, scene_id (FK scenes), element_id (FK elements), provenance ('manual'|'auto'), confidence numeric? (0–1; null when manual), status ('suggested'|'confirmed'|'rejected'), text_anchor jsonb?, anchor_state ('anchored'|'needs_review'|'orphaned') not null default 'anchored', segment_id uuid? (null until Phase 3), quantity int?, notes?, created_at, updated_at }`.
  **Unique (scene_id, element_id).** Downstream consumers filter `status='confirmed'`.
- **`scene_characters`** — the Scene↔Character link:
  `{ id, scene_id (FK scenes), character_id (FK characters), presence_type ('speaking'|'silent_featured'|'background'|'voice_only'), provenance, confidence numeric?, status, text_anchor jsonb?, anchor_state not null default 'anchored', segment_id uuid? (Phase 3), notes?, created_at, updated_at }`.
  **Unique (scene_id, character_id).** Same downstream gate.

### Migration 0007 — jobs
- **`jobs`** — `{ id, project_id, type ('breakdown'|'import'|...), status ('queued'|'running'|'succeeded'|'failed'|'cancelled'), progress int not null default 0, total int?, completed int?, params jsonb not null default '{}', result jsonb?, error text?, workflow_run_id text? (WDK run handle, for cancel/lookup), created_by (FK auth.users), created_at, updated_at }`. Idempotent; the source of truth for the queue panel. The WDK run mirrors its state into this row.

### People vs Elements — the clean separation
**People → `characters`** (named *or* grouped, e.g. "POLICE OFFICERS"; generic background atmosphere via `presence_type='background'`), tagged through `scene_characters`. **Everything non-human → `elements`** in a category: Props, Set Dressing, Wardrobe, Makeup/Hair, Vehicles, Animals, Stunts, Special Effects (practical), Visual Effects, Sound, Camera, Grip/Electric, Special Equipment, Music, Notes. **"Cast" and "Background" are therefore NOT element categories** — they are Character `presence_type`s. No entity is modeled twice.

### `text_anchor` shape
`jsonb` validated by Zod: `{ quote, prefix, suffix, hint_offset? }` — a robust quote + surrounding context (not raw character offsets), so it survives edits elsewhere in the scene. The tag is bound to the **scene UUID**, never the scene number.

### Seeding
A data-layer `seedBreakdownTaxonomy(client, projectId)` (idempotent, mirroring Phase 1's `seedRevisions`) inserts the standard `departments` + `element_categories` with the category→department mapping. Called on project creation (alongside `seedRevisions`) and lazily guarded on first breakdown access so pre-existing projects get seeded once.

---

## Tag anchoring & re-anchoring (the Phase 1 ↔ Phase 2 seam)

> This is where Phase 1's reconciliation and Phase 2's breakdown meet — the mechanism that lets breakdown **survive script rewrites**.

### The anchor model
A tag's `text_anchor` is a **quote + surrounding context** (see shape above), optionally with a last-known offset as a hint. Bound to the scene UUID.

### Re-anchoring on re-import — composed at the action layer
Phase 1's `reconcileAndApply` (in `lib/scripts/data.ts`) stays **unchanged**. The re-import **server action** orchestrates the seam so `lib/scripts` and `lib/breakdown` stay **decoupled** (no cross-domain hard dependency):

1. Call `reconcileAndApply(...)` → returns the resolved diff (which carries each matched scene's new parsed `bodyText`) + `matchedSceneIds`.
2. For each matched/modified scene, call `lib/breakdown` `reanchorSceneTags(sceneId, newBodyText)`, which re-locates every existing tag on that scene via the **pure** `anchor.ts` engine, producing one of three `anchor_state`s:
   - **`anchored` (exact):** quote still present → silently re-attach (update hint offset). The common case.
   - **`needs_review` (fuzzy):** text shifted/edited → best fuzzy match above a threshold (`string-similarity`, already a dependency) → re-attach + flag "verify."
   - **`orphaned`:** tagged text deleted/rewritten → keep the tag, anchor-less → flag for review (keep / re-tag / remove).

**`status` is preserved through re-anchoring** — a human-`confirmed` tag is never silently demoted because prose moved. Unchanged scenes carry tags untouched; **new** scenes start empty (offer AI run); **omitted** scenes keep tags in history (excluded downstream because the scene is omitted). After a re-import, the user may re-run AI breakdown on just the modified scenes; idempotent upsert + the confirm-gate make that safe.

---

## Manual breakdown (build first — the correctness baseline)

Manual mode must be fully usable on its own; AI is an accelerator layered on top.

- **Tag from the script:** select text in the scene view → "Tag as…" → choose category + element (existing or new) → creates a `scene_element` with `provenance='manual'`, `status='confirmed'`, `anchor_state='anchored'`, and the `text_anchor` of the selection. Same path for characters (→ `scene_characters` with a `presence_type`).
- **Element catalog:** CRUD per category; assign a **vendor** (`organizations`).
- **Character management:** list characters, edit aliases, **merge** duplicates (atomic re-point).
- **People & casting:** manage `people`; **cast** a Person to a Character (`characters.cast_person_id`).
- **Organizations:** manage vendors/agencies (project-scoped).

---

## AI engine (validate during execution)

> A *framework + hypotheses*, not locked numbers. Prompt design, output schema details, batch size, and confidence calibration are tuned empirically against real scripts during implementation.

- **Trigger:** user runs "AI breakdown" on a scene range → a `breakdown` **Job** is enqueued on WDK.
- **Engine (`lib/breakdown/ai/engine.ts`):** pure service taking an **injected model** (mockable). For each scene (or small batch) it calls the AI SDK `generateObject` with the **structured Zod schema** (F2: discriminated + versioned):
  ```
  { schema_version, items: Array<
      { kind: 'element', category, name, description?, confidence, anchor: {quote, prefix, suffix} }
    | { kind: 'character', name, presence_type, description?, confidence, anchor, alias_of? }
  > }
  ```
  The prompt includes the **existing project catalog** (canonical names + aliases — F1) so the model reuses entities and proposes `alias_of` links. Results map to `scene_elements`/`scene_characters` with `provenance='auto'`, `status='suggested'`, the `confidence`, the `anchor`, and (F3) a `description`.
- **Character handling:** the engine proposes alias groupings (`alias_of`); surfaced for human confirm/merge — never auto-merged.
- **Idempotent re-runs (`apply.ts`):** upserts suggestions keyed by (scene + category + normalized name) / (scene + character); re-running never duplicates and never overwrites a `confirmed` tag.
- **Review UX:** a suggestions layer on the scene/breakdown view — accept / reject / edit each, plus bulk-accept by category or by confidence threshold. Accepting flips `status` → `confirmed`.
- **The gate:** suggested links are invisible to schedule/budget until confirmed → cancelling or ignoring a breakdown job never corrupts the graph.
- **Measurement (execution-time, not a pass/fail gate):** precision/recall against a hand-broken-down reference script; tune the prompt + confidence display until trustworthy; document results in the plan's verification step. (ScriptAgent's CriticAgent analogue — our human-confirm gate + this measurement.)

---

## Job system (introduced here) — Vercel Workflow (WDK)

- A `jobs` row is the **source of truth** for the UI; the WDK workflow mirrors its state (progress, status) into the row and stores its `workflow_run_id` for cancel/lookup.
- **Enqueue:** the action creates a `jobs` row (`queued`) → triggers the WDK workflow → the workflow fans out per scene/batch (bounded concurrency respecting Gemini rate limits); each step calls the engine + `apply`, then bumps `completed`/`progress`. On finish → `succeeded`; on error → `failed` (partial suggestions kept — safe, because of the gate).
- **Cancellation is cooperative:** the workflow checks `jobs.status='cancelled'` between steps (and honors WDK's native cancel); the action flips the status. Partial suggestions are kept or discarded, never corrupting the graph.
- **Job-queue panel UI:** lists running/queued jobs with progress; each **cancellable**; multiple concurrent. **Poll-based** for Phase 2 (Supabase Realtime on `jobs` is a later enhancement).
- **Testability:** the bulk of TDD is on the pure engine + `apply` + `anchor` + the data layer (mock model, local Supabase). The WDK wiring is thin and verified by a focused integration test of the step logic + the browser smoke test.

---

## Folded-in Phase 1 follow-ups (do at the right moment)

1. **EARLY (first task, before Phase 2 copies the action pattern):** retrofit `editSceneAction`, `stageReimportAction`, `confirmReimportAction` to **Zod-parse `FormData` at the boundary** (add `editSceneInput` / re-import input schemas in `lib/scripts/schema.ts`). The one place Phase 1 diverged from non-negotiable #4. All new Phase 2 actions parse at the boundary from day one.
2. **`use server` export hygiene:** every new action module exports **only locally-defined async actions** — never re-export an imported function (this corrupted the Phase 1 action manifest; a green `npm run build` did *not* catch it — the browser smoke test did). Enforced in the per-task review checklist + the final browser smoke test.
3. **Atomicity:** character **merge** is a single RPC/transaction (same class as the deferred `setActiveRevision` follow-up — which is *not* triggered by Phase 2 and stays deferred).

---

## Testing

- **`anchor.ts`** — pure unit tests: exact (`anchored`), shifted (`needs_review`), deleted (`orphaned`).
- **AI engine (mocked model)** — a fake model returns a fixed structured payload → asserts `scene_elements`/`scene_characters` created as `auto`/`suggested` with correct anchors + descriptions; **idempotent** on re-run; catalog-context reuse + `alias_of` proposal.
- **Data layer** — catalog/org/person/character/element CRUD; tagging; **character merge re-points all links + unions aliases (atomic)**; **downstream gate** returns only `confirmed`.
- **RLS (two-user, `describe.skipIf(!SUPABASE_SERVICE_ROLE_KEY)`)** — isolation per table; **junction two-FK escape** blocked on both `scene_elements` and `scene_characters` (mirrors the 0004 test).
- **Re-anchoring integration** — confirmed tags survive a re-import: exact-anchor silently re-attaches, shifted text fuzzy-matches + flags, deleted text → `orphaned`; `confirmed` `status` preserved throughout.
- **Job lifecycle** — enqueue → running → cancel state transitions; concurrency bound respected.
- **(Execution-time) AI quality** — precision/recall vs the reference script — a measurement, documented, not a pass/fail gate.

---

## Deferred (seams exist, not built in Phase 2)

- `segment_id` stays nullable on both link tables → **Phase 3** (SceneSegment / the schedulable unit).
- `elements.estimated_cost` + budget accounts → **Phase 4**.
- **Cross-project People/Org reuse** (org-level scoping per platform spec §4.1) → later; this is a *scoping migration*, not additive — flagged so we don't promise additive-only.
- **FDX** adapter → Phase 1.5.
- **Realtime** job-panel updates → later (poll now).

## Designed-for (future, additive only — F4)

These are *not built*; documented so we keep IDs/shapes friendly. All are purely additive later (new tables FK-ing to the stable IDs above — the closeout-module discipline: no migration of existing tables):

- **`Shot`** entity under Scene — a *visual coverage* decomposition (storyboard/previs/video-gen), distinct from the *scheduling* `SceneSegment`. FKs `scene_id` + references confirmed `scene_elements`/`scene_characters`.
- **Reference-asset / "look"** table FK-ing `characters`/`elements`/`locations` (the same Supabase Storage pattern as script files + closeout docs; embeddings optional later) — visual-consistency anchors for generative pipelines. `description` (F3) is the textual precursor.
- **Per-scene continuity state** (wardrobe/prop state, blocking/positions) lives naturally on `scene_characters`/`scene_elements` — `notes` now, structured fields later.
- **The graph is the interchange:** the `confirmed`-only downstream query *is* the structured representation a future storyboard/previs/video module (à la ViMax/ScriptAgent) consumes. No separate export model needed.

---

## Done criteria

- A user can fully break down a scene **manually** — tag elements + characters (with presence), manage the catalog, manage/merge characters, manage people/orgs, cast people, assign vendors.
- Running **AI breakdown** enqueues a **cancellable** WDK job that fills in **suggested** elements/characters with confidence + descriptions + text anchors, reusing the existing catalog and proposing alias links; the user reviews and confirms.
- **Confirmed** elements/characters are visible to downstream queries; **suggested** ones are not.
- The **job-queue panel** shows progress and supports cancel + concurrent jobs.
- Breakdown **survives a re-import**: confirmed tags re-anchor (anchored/needs_review/orphaned) with status preserved.
- Full test suite green; AI precision/recall measured and documented; **browser smoke test** of the full flow passes.

---

## Prerequisites / environment

- `npm i ai @ai-sdk/google` (AI SDK v6 + Google provider) and the Vercel Workflow (WDK) package (exact package + API pinned at plan time via the `vercel:workflow` + `vercel:ai-sdk` skills / context7).
- `.env.local` (worktree-local, gitignored): add `GOOGLE_GENERATIVE_AI_API_KEY` once available; add it to the Vercel project env before the slice that runs live AI. Tests use a **mock model** and need no key.
- Local Supabase running; migrations applied; types regenerated after each migration (`npx supabase gen types typescript --local > lib/db/types.ts`).

## Open questions (empirical / plan-time)

- Exact Gemini Flash model id (swappable; pinned at plan time).
- Batch size for per-scene vs small-batch calls (tune against rate limits + quality).
- Confidence threshold for the `needs_review` fuzzy cutoff and for bulk-accept defaults (tune against the reference script).
- Whether `seedBreakdownTaxonomy` runs eagerly at project-create or lazily on first breakdown access (lean: both — eager + idempotent guard).
