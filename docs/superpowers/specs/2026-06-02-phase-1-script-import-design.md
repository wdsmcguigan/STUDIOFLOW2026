# Phase 1 — Script Import & Scene Model (Design Spec)

> **Status:** Draft for async review · **Date:** 2026-06-02
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phase 0 (walking skeleton) being built — this spec assumes Phase 0's patterns (Supabase migrations, RLS, typed data layer, server actions, Vitest) exist.
> **Implementation plan:** to be written just-in-time *after* Phase 0 is built, so it references the real foundation.

## Goal

Import a screenplay (Fountain + FDX) and turn it into the **Scene model** with stable identities, render a script/scene view, and support **non-destructive re-import** with a diff. This delivers the "import a script → instantly see structured scenes" wedge that the research flagged as the #1 onboarding moment.

---

## ⚠️ Decisions needed (review these first)

1. **Scene identity model — RECOMMENDED: stable, project-level Scene + reconciliation.** A `Scene` is a stable entity with an immutable `id`. Each `ScriptVersion` carries the raw source + parse; on (re)import a **reconciliation** step matches incoming parsed scenes to existing `Scene` rows (by content anchor/hash) and marks each *new / changed / removed*. Breakdown links (`SceneElement`, Phase 2) attach to the **stable Scene**, so they survive renumbering and revisions. *Alternative:* scenes belong to each ScriptVersion (simpler, but reproduces the industry's #1 data-loss bug). → **Confirm the stable-Scene model.**
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
- **Component tests:** import flow, scene list rendering, diff review screen.

## Done criteria

- Import a real Fountain and a real FDX script → correct Scene list with INT/EXT, slugs, D/N, page-eighths, synopsis.
- Re-import a revised draft → diff screen classifies changes correctly; matched scenes keep their `id`.
- Everything project-scoped under RLS; full test suite green.
