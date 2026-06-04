# `lib/breakdown` — Breakdown & AI module

The Phase 2 module that tags scenes with breakdown **Elements** and **Characters** — manually first, then AI-assisted — and feeds the shared production graph that Schedule / Budget / Call Sheets read downstream.

> **Design docs:** spec `docs/superpowers/specs/2026-06-02-phase-2-breakdown-ai-design.md` · plan `docs/superpowers/plans/2026-06-04-phase-2-breakdown.md`. This README is the **as-built API + conventions** reference for extending the module.

## Non-negotiables this module upholds

1. **RLS is the only security boundary.** Every table is project-scoped and enforced in Postgres (owner-based, mirroring Phase 1). The data layer never re-implements authz. Junction tables validate **both** FK targets' ownership (the 0006 two-FK rule).
2. **One typed contract.** `schema.ts` (Zod) is the source of truth for shapes crossing the wire; DB row types come from `lib/db/types.ts`. **Parse-on-read** (every read returns a Zod-validated domain type) and **parse-at-boundary** (every write parses its input).
3. **Thin clients, smart server.** All cleverness lives here as independently-testable functions. The AI engine is a pure, model-injected service; the WDK job is a thin durable wrapper.
4. **Non-destructive AI.** AI output enters as `status='suggested'` and is invisible downstream until a human confirms. Cancelling/ignoring a breakdown job never corrupts the graph.

## File layout

```
schema.ts        Zod contract: enums, row schemas, write inputs, text_anchor, AI output schema
data.ts          The ONLY place breakdown Supabase queries live (parse-on-read). CRUD, seed, tagging, gate, jobs.
anchor.ts        Pure re-anchor engine: relocateAnchor(anchor, newText) -> anchored | needs_review | orphaned
reanchor.ts      reanchorSceneTags(client, sceneId, newText) — re-locates a scene's tags after a re-import (status preserved)
ai/prompt.ts     buildBreakdownPrompt({ sceneText, catalog }) — catalog-as-context (reuse, don't duplicate)
ai/engine.ts     runBreakdown({ model, sceneText, catalog }) — generateObject against an INJECTED model (mock in tests)
ai/apply.ts      applyBreakdownSuggestions(client, { projectId, sceneId, output }) — idempotent + confirm-safe upsert
ai/model.ts      getBreakdownModel() — production model factory (Gemini Flash via @ai-sdk/google); the swap point
ai/quality.ts    scoreBreakdown(expected, actual) — precision/recall/F1 (measurement, not a gate)
__fixtures__/    hand-broken-down reference scene for the (gated) live AI quality measurement
```

Server actions live in `app/dashboard/[projectId]/breakdown/actions.ts`; the WDK workflow in `workflows/breakdown.ts`; UI in `components/breakdown/*`.

## Migrations (the data model)

| Migration | Adds |
|---|---|
| `0005_breakdown_graph.sql` | `departments`, `element_categories`, `organizations`, `people`, `characters`, `elements` — project-scoped, owner-RLS, `updated_at` triggers |
| `0006_scene_links.sql` | `scene_elements`, `scene_characters` junctions — **two-FK RLS** (both scene + element/character ownership checked) |
| `0007_character_merge_rpc.sql` | `merge_characters(survivor, absorbed)` — atomic plpgsql, `security invoker` (RLS still gates) |
| `0008_jobs.sql` | `jobs` — async job rows (the WDK run mirrors state here) |

**People vs Elements:** people (named or grouped, incl. background atmosphere via `presence_type`) → `characters`. Everything non-human → `elements` in a category. "Cast"/"Background" are **not** element categories — they're `presence_type`s.

After any migration: `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts` (the `2>/dev/null` strips the CLI's stray "Connecting to db" line).

## Conventions for the data layer (`data.ts`)

- Every function takes a Supabase client as its first arg, typed `DbClient = SupabaseClient<Database>`. Pass the **SSR cookie client** (`@/lib/supabase/server`) from request-context code (RLS = the user), or the **service-role client** (`@/lib/supabase/service`) only from trusted background contexts (WDK steps), where ownership was already proven at enqueue.
- **Reads** map rows through the Zod schema: `(data ?? []).map((r) => element.parse(r))`. **Writes** parse input: `const p = createElementInput.parse(input)`.
- Errors: `throw new Error(error.message, { cause: error })`.

### API surface

**Seed / catalog**
- `seedBreakdownTaxonomy(client, projectId)` — idempotent; seeds 17 departments + 15 MM-aligned categories (call on project create; safe every load).
- `listDepartments`, `listElementCategories`, `listElements`, `listCharacters`, `listOrganizations`, `listPeople`.
- `createElement`, `createCharacter`, `createOrganization`, `createPerson`.
- `setCharacterCast(client, { characterId, personId })` — assign/clear the actor on a character.
- `mergeCharacter(client, { projectId, survivorId, absorbedId })` — atomic via the RPC (re-points links, unions aliases, deletes absorbed).
- `findOrCreateElement`, `findOrCreateCharacter`, `resolveCategoryId` — normalized-name dedupe helpers used by AI apply (the idempotency keys).

**Tagging + the downstream gate**
- `tagSceneElement(client, input)` / `tagSceneCharacter(client, input)` — upsert on `(scene_id, element_id|character_id)`; defaults `provenance='manual'`, `status='confirmed'`, `anchor_state='anchored'`.
- `listSceneTags(client, sceneId)` → `{ elements, characters }` (all statuses).
- **`listConfirmedSceneTags(client, sceneId)` — THE GATE.** Downstream phases (schedule/budget) must consume only this. Suggested/rejected links are invisible here.
- `setSceneElementStatus` / `setSceneCharacterStatus` — flip a tag's status (the accept/reject path).

**Jobs**
- `createJob`, `listJobs`, `getJob`, `updateJobProgress`, `setJobStatus`, `isJobCancelled` — the queue panel's source of truth.
- `listScenesForBreakdown(client, scriptId)` → `{ id, text }[]` — the scene text the AI breakdown job iterates.

## Re-anchoring (survives script rewrites)

A tag's `text_anchor` is a robust `{ quote, prefix, suffix, hintOffset }` bound to the **scene UUID** (never the scene number). `anchor.ts#relocateAnchor` (pure) re-locates a quote against new scene text → `anchored` (exact) / `needs_review` (fuzzy ≥ 0.6) / `orphaned` (gone). On re-import, the **action layer** (`confirmReimportAction`) calls `reanchorSceneTags` for matched/modified scenes — so `lib/scripts` and `lib/breakdown` stay decoupled, and a `confirmed` tag is **never silently demoted** because prose moved.

## AI engine (provider-swappable, non-destructive)

`runBreakdown({ model, sceneText, catalog })` builds a catalog-as-context prompt and calls AI SDK v6 `generateObject` with the discriminated `aiBreakdownOutput` schema. The `model` is **injected** — production passes `getBreakdownModel()` (Gemini `gemini-2.5-flash` via `@ai-sdk/google`, env `GOOGLE_GENERATIVE_AI_API_KEY`); tests pass `MockLanguageModelV3` from `ai/test`. `applyBreakdownSuggestions` maps output to `auto`/`suggested` tags — **idempotent** (find-or-create dedupes the catalog; tagging upserts) and **confirm-safe** (skips any tag already `confirmed`/`rejected`, so a re-run never overrides a human decision).

> Gemini's native structured output rejects unions; the engine passes `providerOptions: { google: { structuredOutputs: false } }`.

## Async jobs (Vercel Workflow)

`workflows/breakdown.ts` defines `breakdownWorkflow` (`"use workflow"`) that fans over scenes, each a `"use step"` calling the engine + apply, with progress + cooperative cancel (checks `jobs.status` between scenes) and a failure handler (marks the job `failed` on a step error). Steps run in a **background, no-request** context → they use the **service-role client**; ownership was proven at enqueue (`startBreakdownAction` lists scenes + creates the job under the user's RLS, then `start(breakdownWorkflow, [...])`).

## Testing

- **Unit / pure:** `anchor.ts`, `ai/prompt.ts`, `ai/quality.ts`, `schema.ts` — no DB, run anywhere.
- **AI engine:** mock model via `ai/test` (`MockLanguageModelV3`) — asserts parsed/validated output + idempotency.
- **Live-DB (RLS / integration):** guarded `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)`; use the two-user `makeUser`/`newProject` harness (assert isolation + the junction two-FK escape, which RLS denies with code `42501`). Run with `npx dotenv -e .env.local -- npm test`.
- **AI quality:** `scoreBreakdown` is unit-tested; the *live* precision/recall measurement is `describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)` and prints (not a pass/fail gate) — see `docs/superpowers/notes/phase-2-ai-quality.md`.

## Extending the module

- **New entity** → migration (project-scoped + owner-RLS, FK indexes, `updated_at` trigger) → regen types → row + input schemas in `schema.ts` → data-layer fns (parse-on-read) → RLS two-user test.
- **New tag attribute** → add the column (migration) → extend the row/input schema → thread through `tagScene*` → keep the downstream gate filtering on `status='confirmed'`.
- **Swap the AI model/provider** → edit `ai/model.ts` only (one line). Everything else takes the injected `LanguageModel`.
- **New async job type** → add to the `jobs.type` CHECK + the `jobType` enum, define a workflow under `workflows/`, enqueue from a server action (prove ownership under the user's RLS first).
