# Phase 3 — Schedule / Stripboard (Design Spec — LIGHT / PROVISIONAL)

> **Status:** Light provisional draft for async review · **Date:** 2026-06-02
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phases 0–2 (scenes + confirmed breakdown exist).
> **Provisional:** captures the warm scheduling research + key decisions. A full deep-dive (like the Phase 1 versioning one) happens closer to building this phase; the implementation plan is written just-in-time against the real codebase.
> **Source research:** the scheduling agent report in `2026-06-02-studioflow-competitor-research.md` (§B).

## Goal

Arrange Scenes into a **stripboard** of ShootDays, and — because each scene carries its confirmed breakdown — automatically surface **conflicts** (cast/location/gear) and a **Day-Out-of-Days**. This is the first module that *reads* the production graph rather than building it, so it's the proof that "the modules work together."

---

## ⚠️ Decisions needed (provisional recommendations)

1. **Schedulable unit — RECOMMENDED: introduce `SceneSegment` here.** A Strip references a `SceneSegment` (a portion of a Scene in eighths), defaulting to one full-scene segment per Scene on first use. Lets scenes split across days without losing breakdown. → confirm.
2. **Stripboard ordering — RECOMMENDED: strips ordered *within* a ShootDay.** The board is an ordered list of ShootDays, each owning an ordered list of Strips. Day-breaks/banners are Strip subtypes that belong to a day, so re-sorting scene strips can't delete them (research: StudioBinder auto-reorder bug). → confirm.
3. **Conflict detection — RECOMMENDED: derived view via the Derivation Engine, recomputed on change** (dirty-flag), not stored. A conflict = same confirmed cast/location/gear element required by two units on one date, or an actor needed on a hold/travel day. → confirm.
4. **Day-Out-of-Days — RECOMMENDED: auto-derive + manual override.** Work days derive from scenes a character appears in; Hold auto-fills between first/last work day; Start/Finish/Drop/Pickup are rule-configurable; all overridable. → confirm.
5. **Multi-unit — RECOMMENDED: model `unit` now, light UI in v1.** Put `unit` (Main/2nd/Splinter) on ShootDay so conflict math is correct across units; full multi-unit board UX can be a refinement. → confirm.
6. **Location → Set hierarchy — RECOMMENDED: add now.** Scene/segment references a Set; Set belongs to a Location (address) with geo/timezone. Powers company-move detection (address change between consecutive Sets) and later sun/weather on call sheets. → confirm.
7. **Movie Magic (.mms) import — DEFER** to a later interop pass; design SceneElement categories MM-aligned so it's feasible. → confirm defer.

---

## Data model (additions)

- **SceneSegment** — `{ id, scene_id, ordinal, page_eighths, label? }`. Schedulable unit; sums to the Scene's eighths.
- **ShootDay** — `{ id, project_id, date, day_type ('prep'|'prelight'|'build'|'shoot'|'strike'|'travel'|'wrap'), unit ('main'|'second'|'splinter'), studio_or_location, ordinal }`. One date → many ShootDays (per unit).
- **Strip** — `{ id, shoot_day_id, ordinal, type ('scene'|'day_break'|'banner'), scene_segment_id?, banner_text?, page_eighths_contrib? }`.
- **CastDayStatus** — `{ id, person_id, date, status ('work'|'hold'|'start'|'finish'|'travel'|'drop'|'pickup'), shoot_day_id?, source ('derived'|'override') }`.
- **Location** gains a **Set/Area** sub-level: `Location { id, project_id, name, address, geo, timezone }` → `Set { id, location_id, name, photos }`. Scenes/segments reference a `Set`.
- **Conflict** *(derived, not necessarily persisted)* — computed by the Derivation Engine from confirmed SceneElements × ShootDay assignments × CastDayStatus.

## Key mechanics

- **Build:** drag scenes (segments) onto ShootDays; reorder within a day; insert day-breaks and banners (meal/company-move/notes). ShootDay shows a **page-eighths rollup** for day-balancing.
- **Conflict surfacing:** because each segment carries confirmed cast/location/gear, the engine flags actor double-booking (incl. across units on the same date), location moves, and gear clashes — recomputed when scenes, breakdown, or the board change.
- **Company-move:** consecutive Sets at different addresses within/between days surface a move (banner or `day_type='travel'`).
- **DOOD:** generated table per character across dates; export-ready.

## Testing

- SceneSegment split: splitting a scene partitions eighths and lets each segment schedule independently; confirmed SceneElements partition/inherit correctly.
- Re-sort safety: auto-reordering scene strips never deletes day-breaks/banners.
- Conflict engine: an actor in two units on one date → flagged; resolving the board clears it.
- DOOD: derived Work/Hold correct; manual override sticks and is marked.
- RLS/project-scoping; component tests (board, day, DOOD view).

## Done criteria

- Scenes schedule onto a multi-day stripboard with day-breaks/banners and eighths rollups.
- Conflicts (cast/location/gear, cross-unit) surface automatically from confirmed breakdown and update on change.
- A correct Day-Out-of-Days derives from the board, with overrides.
- Changing a scene/breakdown reflects in the schedule — the cross-module integration test stays green.
