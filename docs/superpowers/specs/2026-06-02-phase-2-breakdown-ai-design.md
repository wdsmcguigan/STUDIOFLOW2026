# Phase 2 — Breakdown & AI Engine (Design Spec)

> **Status:** Draft for async review · **Date:** 2026-06-02
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phase 0 (patterns) + Phase 1 (Scenes exist to tag).
> **Implementation plan:** just-in-time after Phase 1. **AI-tuning is empirical** — see §"AI engine (validate during execution)".

## Goal

Tag scenes with breakdown **Elements** — manually first, then **AI-assisted** — where AI output is *suggestions* a human confirms before anything flows downstream. Introduce the **async job system** (first needed here, for the slow LLM work). This is the module where the "AI genius" actually lives, and where the production graph gains the element/character/department richness every later phase reads.

---

## ⚠️ Decisions needed (review these first)

1. **Job runner — RECOMMENDED: Trigger.dev or Inngest** (both purpose-built for durable, cancellable, concurrent jobs with progress; solo-friendly). Lean: **Trigger.dev** for first-class long-running tasks + built-in concurrency/cancel; Inngest is an equally fine event-driven alternative. *Avoid* hand-rolling. → **Pick one (or defer to start-of-phase spike comparing the two).**
2. **AI breakdown granularity — RECOMMENDED: per-scene (or small batches).** One LLM call per scene (or ~3–5 scenes) rather than the whole script at once → better progress granularity, clean cancel, and it respects Gemini rate limits. Trade-off: more calls. → **Confirm per-scene/batched.** *(Empirical — revisit after measuring.)*
3. **Element category taxonomy — RECOMMENDED: seed enum, configurable, Movie-Magic-aligned.** Ship a standard seed list (Cast, Background, Stunts, Vehicles, Props, Wardrobe, Makeup/Hair, Animals, Set Dressing, Special FX, VFX, Sound, Camera/Gear, Special Equipment, Notes), each mapped to a Department, and let it be edited per project. Align names to Movie Magic categories so MM import (later) maps cleanly. → **Confirm seed list + per-project configurability.**
4. **Character detection — RECOMMENDED: AI proposes alias groupings; human confirms.** The AI suggests which name variants are one character; the user confirms/merges, rather than the AI silently minting duplicates. → **Confirm AI-proposes-merges.**
5. **Confidence handling — RECOMMENDED: surface confidence, default-low to `suggested`.** All AI output enters as `status='suggested'`; nothing auto-confirms. A confidence score is shown to help triage. → **Confirm no auto-confirm (human gate always).**

---

## Data model (additions to the graph)

- **Element** — `{ id, project_id, category, name, description, estimated_cost, vendor_org_id?, created_at }`. Project-level catalog; reused across scenes.
- **SceneElement** — the Scene↔Element link. `{ id, scene_id, element_id, provenance ('auto'|'manual'), confidence (0–1, null if manual), status ('suggested'|'confirmed'|'rejected'), text_anchor_start, text_anchor_end, segment_id? (null until Phase 3), quantity?, notes }`. **Downstream queries (schedule/budget) filter `status='confirmed'` only.**
- **Character** — `{ id, project_id, primary_name, aliases (text[]), description }`. A merge operation re-points all links from the absorbed Character to the survivor.
- **Cast presence link** — when an Element/Character attaches to a Scene as cast, the link carries `presence_type ('speaking'|'silent_featured'|'background'|'voice_only')`. (Modeled as a typed `SceneElement` for the Cast category, or a dedicated `SceneCharacter` join — decide at plan time; the *attribute* is the requirement.)
- **Department mapping** — `category → department` mapping table (configurable per project), so an element's category routes to the right department (and later, budget account).
- **Job** — `{ id, project_id, type ('breakdown'|'import'|...), status ('queued'|'running'|'succeeded'|'failed'|'cancelled'), progress (int), params (jsonb), result (jsonb), error, created_by, created_at }`. Idempotent; powers the activity/queue panel.

---

## Manual breakdown (build first)

- **Tag from the script:** select text in the scene view → "Tag as…" → choose category + element (existing or new). Creates a `SceneElement` with `provenance='manual'`, `status='confirmed'`, and the `text_anchor` of the selection.
- **Element catalog:** manage the project's elements (CRUD, category, est. cost, vendor).
- **Character management:** list characters, edit aliases, **merge** duplicates (re-points links).
- Manual mode is the correctness baseline and must be fully usable on its own — AI is an accelerator layered on top.

## AI engine (validate during execution)

> This section is intentionally a *framework + hypotheses*, not locked numbers. Prompt design, output schema, batch size, and confidence calibration are tuned empirically against real scripts during implementation.

- **Trigger:** user runs "AI breakdown" on a scene range → a `breakdown` **Job** is enqueued on the job runner.
- **Engine:** for each scene (or small batch), call Gemini via the **Vercel AI SDK** with **structured output** (a schema: list of `{ category, name, confidence, text_span }`). Map results to `SceneElement` rows with `provenance='auto'`, `status='suggested'`, the `confidence`, and `text_anchor` from the span.
- **Character handling:** the engine proposes alias groupings; surfaced for human confirm/merge.
- **Idempotent re-runs:** re-running upserts suggestions (keyed by scene + category + normalized name), never duplicates.
- **Review UX:** a suggestions layer on the scene/breakdown view — accept / reject / edit each, plus bulk-accept by category or confidence threshold. Accepting flips `status` to `confirmed`.
- **The gate:** suggested links are invisible to schedule/budget until confirmed → cancelling or ignoring a breakdown job is always safe (no downstream corruption).
- **Measurement:** during execution, measure precision/recall against a hand-broken-down reference script; tune the prompt + confidence display until trustworthy. Document results in the plan's verification step.

## Job system (introduced here)

- Integrate the chosen runner (Trigger.dev/Inngest); persist a `Job` row mirroring runner state.
- **Job-queue panel UI:** shows running/queued jobs with progress; each **cancellable**; multiple concurrent (bounded by a pool that respects Gemini rate limits).
- Cancellation is cooperative (worker checks a flag / aborts the in-flight LLM call); partial suggestions are kept or discarded, never corrupting the graph.

---

## Testing

- **Manual tagging:** select-to-tag creates a correct `SceneElement` (anchor, provenance, confirmed); element catalog + character CRUD.
- **Character merge:** merging re-points all links to the survivor; aliases union.
- **AI orchestration with a mocked LLM:** a fake model returns a fixed structured payload → asserts SceneElements created as `auto`/`suggested` with correct anchors; **idempotent** on re-run.
- **Downstream gate:** a query simulating schedule/budget consumption returns only `confirmed` links (suggested excluded).
- **Job lifecycle:** enqueue → running → cancel → state transitions; concurrency bound respected.
- **(Execution-time, not unit) AI quality:** precision/recall vs a reference script — a measurement, not a pass/fail gate.

## Done criteria

- A user can fully break down a scene **manually** (tag elements, manage catalog, manage/merge characters).
- Running AI breakdown enqueues a cancellable job that fills in **suggested** elements with confidence + text anchors; user reviews and confirms.
- Confirmed elements are visible to downstream queries; suggested ones are not.
- Job-queue panel shows progress and supports cancel + concurrent jobs.
- Full test suite green; AI precision/recall measured and documented.
