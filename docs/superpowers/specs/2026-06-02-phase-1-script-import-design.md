# Phase 1 — Script Import & Scene Model (Design Spec)

> **Status:** Draft for async review · **Date:** 2026-06-02
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phase 0 (walking skeleton) being built — this spec assumes Phase 0's patterns (Supabase migrations, RLS, typed data layer, server actions, Vitest) exist.
> **Implementation plan:** to be written just-in-time *after* Phase 0 is built, so it references the real foundation.

## Goal

Import a screenplay (Fountain + FDX) and turn it into the **Scene model** with stable identities, render a script/scene view, and support **non-destructive re-import** with a diff. This delivers the "import a script → instantly see structured scenes" wedge that the research flagged as the #1 onboarding moment.

---

## ⚠️ Decisions needed (review these first)

> **Resolved in the 2026-06-02 versioning deep-dive** (see new §"Versioning, Reconciliation & Final Draft Compatibility"): #1 confirmed (stable Scene + reconciliation). **Editor stance = import/export + light edits** (Final Draft stays the writing tool; StudioFlow is system-of-record). **Conflict default = Final-Draft-wins, in-app edit flagged & kept in history.**

1. **Scene identity model — CONFIRMED: stable, project-level Scene + reconciliation.** A `Scene` is a stable entity with an immutable `id`. Each `ScriptVersion` carries the raw source + parse; on (re)import a **reconciliation** step matches incoming parsed scenes to existing `Scene` rows (by content anchor/hash) and marks each *new / changed / removed*. Breakdown links (`SceneElement`, Phase 2) attach to the **stable Scene**, so they survive renumbering and revisions. *Alternative:* scenes belong to each ScriptVersion (simpler, but reproduces the industry's #1 data-loss bug). → **Confirm the stable-Scene model.**
2. **Sync vs async import — RECOMMENDED: synchronous for v1.** Fountain/FDX parse in well under a second even for a feature; the async job system isn't built until Phase 2 (it exists for the *slow* AI breakdown). So Phase 1 import runs synchronously with a loading state. *(This slightly revises the platform spec's "big imports as jobs" — revisit only if real-world import proves slow.)* → **OK to keep import synchronous in v1?**
3. **SceneSegment timing — RECOMMENDED: introduce in Phase 3.** The schedulable unit is the `SceneSegment` (a fraction of a scene). In Phase 1 a Scene needs no segments yet; we add `SceneSegment` in Phase 3 (scheduling), defaulting each Scene to one full-scene segment then. Phase 1 stores `page_eighths` on the Scene. → **OK to defer SceneSegment to Phase 3?**
4. **Format coverage — RECOMMENDED: Fountain + FDX both in Phase 1.** FDX is *the* interchange format (carries scene boundaries + who's in each scene); Fountain is the simpler open format. Both serve the import-first wedge. *Alternative:* Fountain-first, FDX as a fast-follow. → **Both now, or Fountain-first?**

---

## Data model (additions to the graph)

- **Script** — `{ id, project_id, title, created_at }`. One per screenplay in a project (a project may have more than one, e.g. episodes).
- **ScriptVersion** — `{ id, script_id, label, source_format ('fountain'|'fdx'), raw_source (text), revision_color, locked (bool), imported_at, created_by }`. Immutable record of an imported draft.
- **Scene** — stable, project-scoped, **immutable `id`**. `{ id, project_id, ordinal, scene_number (string, mutable), number_locked (bool), int_ext ('INT'|'EXT'|'INT/EXT'), location_slug (text), time_of_day (text), synopsis (text), page_eighths (int), script_day (text), status ('active'|'omitted'), created_at, updated_at }`.
- **SceneSource** *(internal, for reconciliation)* — `{ scene_id, script_version_id, content_hash, text_anchor_start, text_anchor_end }`. Links a Scene to the version(s) it appeared in and where, enabling cross-version matching. (Lightweight; the heavy diff UX is below.)

> Page-eighths and synopsis are **stored** on the Scene (recomputed on import), never inferred live from Fountain — per the research finding that Fountain can't carry pagination.

---

## Import pipeline (non-destructive)

1. **Ingest** — user uploads a `.fountain`/`.fdx` file or pastes Fountain text. A `ScriptVersion` row is created with the raw source.
2. **Parse** — the matching adapter (Fountain parser / FDX XML parser) produces a normalized list of parsed scenes: `{ scene_number?, int_ext, location_slug, time_of_day, body_text, page_eighths, text_anchor }`.
3. **Stage** — parsed scenes land in a staging structure, **not** the live Scene table.
4. **Diff / reconcile** —
   - *First import:* all scenes are "new" → straight apply.
   - *Re-import:* match staged scenes to existing Scenes by content anchor/hash + number heuristics; classify each as **unchanged / modified / new / removed**. Present a review screen.
5. **Apply** — on user confirmation, create/update/omit Scenes. Existing Scene `id`s are preserved for matched scenes (so Phase 2 breakdown links survive). Removed scenes are marked `status='omitted'`, not deleted.

> Phase 1 ships the full **first-import** path and the staging/diff *framework*; the richer cross-version tag-migration polish (research item: "version diff/reconciliation") can be hardened when the second version is imported and Phase 2 breakdown exists to migrate. Flag as a refinement, not a blocker.

---

## Versioning, Reconciliation & Final Draft Compatibility

> Added from the 2026-06-02 deep-dive (research: Final Draft KB, FDX format inspection, screenwriting.info). The exact FDX attribute names for scene numbers, ScriptNotes, and Tagger tags are **not publicly documented** — confirm them against real locked/numbered/tagged FDX exports and build a fixture corpus before relying on them.

### Scene identity (the foundation)
Every Scene gets an internal immutable **UUID** at creation. When a production locks scene numbers, the **locked number becomes an additional stable alias** (not the primary key). Locked numbers follow Final Draft's append-only rule *exactly*, so our numbers and FD's stay identical on round-trip:
- Numbers, once assigned, never change or get reused.
- Inserted scenes get letter suffixes: `5` → `5A` → `5B`; between `5` and `5A` → `5aA`.
- Deletions are **not removed** — the number is retired as an **OMITTED** placeholder.

All breakdown/schedule/budget references foreign-key to the scene UUID (and may display the locked number).

### Revision-set model (mirrors FDX)
A `revisions` table `{ id, name, color, active }` mirrors FDX `<Revisions ActiveSet>` / `<Revision Color ID Name>`, seeded with the standard order: White → Blue → Pink → Yellow → Green → Goldenrod → Buff → Salmon → Cherry → Tan. Per-paragraph "changed in revision set X" flags let us emit the standard right-margin **asterisks** on export.

### The 3-tier reconciliation matcher (on re-import)
Cheapest → most expensive:
1. **Locked-number key join** — if both drafts are locked, `5A`↔`5A` is an exact O(n) match; OMITTED = explicit delete. This is why locking matters.
2. **Slugline + content hash** — for unlocked drafts, detect unchanged scenes cheaply.
3. **Fuzzy similarity** (e.g. `SequenceMatcher` / diff-match-patch) — match edited/reordered scenes; detect splits/merges.
4. **Human review** — low-confidence matches confirmed in the diff screen before commit. The resolved mapping is persisted (computed once).

Outcome: a structured diff (added / deleted→OMITTED / modified / moved). Matched scenes keep UUID + locked number. **Every import and every issued revision is snapshotted as an immutable version, storing the original FDX bytes** — a true version history (which Final Draft itself lacks).

### Two write paths (the "on-the-fly changes" model — editor stance = import/export + light edits)
- **In-app edits** operate directly on scene UUIDs; recorded into the active revision set.
- **Re-imported FDX** runs through the matcher → diff → review → commit.

"Light edit" splits into two categories with different behavior:
- **Production-metadata edits** (breakdown tags, scene props like INT/EXT or script-day, mark OMITTED, synopsis, quantities) — our domain; never conflict with FD prose; always survive re-import (anchored to the stable scene UUID). This is the common case.
- **Prose/text edits** — allowed but tracked as local divergence. On re-import: if the incoming draft did **not** also change that scene, the in-app edit stands; if it **did**, it's a genuine conflict surfaced in the diff-review screen. **Default resolution: Final-Draft-wins, with the in-app edit shown side-by-side and kept in history for one-click re-apply.** Never silently lose either side.

### Final Draft compatibility principles
- **Mirror the FDX model:** ordered typed paragraphs (Scene Heading / Action / Character / Parenthetical / Dialogue / Transition / General) + `SceneProperties` (eighths `Length`, `Page`, `Title`).
- **Passthrough bag:** store any FDX element we don't model (ScriptNotes, Tagger tag data, watermarking, page layout, SmartType macros) verbatim, keyed per scene/paragraph, so re-export loses nothing. *Single biggest fidelity win.*
- **FDX is the only contract** — there is no Final Draft API. StudioFlow is the system-of-record that ingests FDX between FD sessions; round-trip back to FD is FDX-mediated and manual. (FD's own collaboration is peer-to-peer, version-locked, with no shared history.)
- **Build on an existing FDX parser** (e.g. `wildwinter/screenplay-tools`, `rsdoiel/fdx`) rather than from scratch; assemble a corpus of real FDX exports (locked, numbered, tagged, multi-revision) as test fixtures.

## Adapters

- **Fountain** — use/reference an existing Fountain parser (e.g. `fountain-js`); validate against sample feature scripts. Capture scene headings, action, the synopsis (from `=` synopsis lines or first action line), and compute page-eighths from length.
- **FDX** — parse the XML; FDX paragraphs carry types (Scene Heading, Action, Character, Dialogue). Extract scene boundaries and bodies; preserve any existing scene numbers. If the FDX contains tagged elements/ScriptNotes, capture them for Phase 2 to map into `SceneElement` (don't discard).

---

## UX (defers to the UI/UX foundation for styling)

- **Import entry:** an "Import script" action on the project dashboard → upload/paste → parse → (diff if re-import) → apply.
- **Script view:** the formatted screenplay (read view) with scene anchors.
- **Scene list:** sortable/filterable list — number, INT/EXT, slug, D/N, page-eighths, synopsis. Click → scene detail.
- **Scene detail:** the scene's body + its attributes; this is where Phase 2 breakdown tagging will attach.
- Per-module UX (interaction polish) follows the **design foundation** once that session lands.

---

## Testing

- **Parser unit tests:** sample Fountain + FDX → expected scene list (counts, headings, INT/EXT, page-eighths). Include tricky cases (INT/EXT combos, scene-number suffixes like `5A`, omitted scenes, dual dialogue present in source).
- **Reconciliation tests:** given v1 scenes + a v2 with one modified / one added / one removed scene, assert correct classification and that matched Scene `id`s are preserved.
- **RLS / data-layer tests:** scripts/scenes are project-scoped and owner/member-visible only.
- **FDX round-trip fidelity:** import a tagged/locked/numbered FDX → export FDX → assert the screenplay body, scene numbers, revision sets, and passthrough elements (ScriptNotes, tags) are preserved (no silent loss).
- **Reconciliation conflict:** a scene edited in-app + also changed in a re-imported draft → assert it's surfaced as a conflict with the FD version pre-selected and the in-app edit retained in history.
- **Component tests:** import flow, scene list rendering, diff review screen.

## Done criteria

- Import a real Fountain and a real FDX script → correct Scene list with INT/EXT, slugs, D/N, page-eighths, synopsis.
- Re-import a revised draft → diff screen classifies changes correctly; matched scenes keep their `id`.
- Everything project-scoped under RLS; full test suite green.
