# Phase 3 — Schedule / Stripboard (Design Spec)

> **Status:** ✅ Finalized 2026-06-04 (supersedes the 2026-06-02 "light/provisional" draft; decisions resolved in the Phase 3 brainstorm).
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phases 0–2 (scenes + **confirmed** breakdown exist; the Phase-2 junctions carry a nullable `segment_id` seam this phase fills).
> **Source research:** scheduling agent report in `2026-06-02-studioflow-competitor-research.md` (§B).
> **Verified research (2026-06-04):** `2026-06-04-phase-3-scheduling-research.md` — deep-research pass (EP/MMS DOOD rules from primary docs, build-vs-reuse verdict, libraries, timezone). The decisions below reflect its findings; the verdict is **BUILD the engine + stripboard** (no OSS film-scheduling/DOOD engine exists to reuse; CGWire Kitsu/Zou confirmed not a fit) and **reuse only generic UI/infra libs**.

## Goal

Arrange Scenes into a **stripboard** of ShootDays and — because each scene carries its confirmed breakdown — automatically surface **conflicts** (cast / location / gear, across units) and a **Day-Out-of-Days (DOOD)**. This is the first module that *reads* the production graph rather than building it: the proof that "the modules work together." The scheduling artifact is the **stripboard** (ordered shoot days × ordered scene strips), not a calendar grid; a month-grid calendar is a secondary read-only view.

---

## Decisions (resolved 2026-06-04)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | **Derivation Engine** | **Pure derived-on-read functions** | `(graph slice) → conflicts / DOOD / eighths / company-moves`, computed live on read; **nothing derived is persisted**. At pre-pro scale (hundreds of scenes) it's cheap, always correct (no stale cache — the #1 competitor bug), and gets its own pure test suite (graph X → result Y, per platform spec §6.4). Caching is a later optimization only if profiling demands. |
| 2 | **SceneSegment** (the schedulable unit) | **Lazy default segment + scene-level breakdown** | A scene gets one default full-scene `SceneSegment` auto-created when first placed on the board; splitting adds more (summing to the scene's eighths). Confirmed breakdown stays at the **scene** level — segments inherit the scene's cast/elements for conflict math; the Phase-2 `segment_id` junction seam is reserved for future segment-specific tags (deferred). No backfill churn. |
| 3 | **Conflict scope (v1)** | **Cast + location + gear, incl. cross-unit same-date** + actor-on-hold/travel | Full conflict math from confirmed breakdown — the differentiator. |
| 4 | **Location → Set** | **Build now; auto-map slugs** | `Location` (address, geo, timezone) → `Set` (name); scene references a Set. Auto-create a Set per distinct `scene.location_slug` on first use (re-mappable/merge-able). Powers company-move detection + later sun/weather (Phase 5). Stable IDs for the future closeout module. |
| 5 | **Multi-unit** | **`unit` on ShootDay now, light UI** | One calendar date → many ShootDays (per unit), so cross-unit conflict math is correct from day one; full multi-unit board UX is a later refinement. |
| 6 | **Stripboard ordering** | Ordered strips **within** ordered ShootDays; `day_break`/`banner` are Strip **subtypes** | Day-breaks/banners belong to a day, so re-sorting scene strips can't delete them (StudioBinder's documented auto-reorder data-loss bug — verified). |
| 6b | **Strip colors** | **Configurable palette, not hardcoded** | The INT/EXT × day/night → fixed White/Yellow/Blue/Green mapping was **refuted** as non-standard (varies by production). Color is **derived** from INT/EXT × time-of-day via a project-level palette (sensible default, user-overridable); not stored on the strip. |
| 7 | **DOOD storage + rules** | **Derived live + manual overrides persisted; rules per EP/MMS** | Derived by the engine; only manual **overrides** stored (`cast_day_statuses`, `source='override'`), merged on read (override wins, marked). **Verified rules:** S/F = first/last work day (rendered SW/WF/SWF); **Hold auto-fills non-work days between S and F, excluding company-wide off days, gated by a configurable per-element/category "allow hold days"**; **Drop/Pickup = two-step opt-in + a *configurable* minimum calendar-day gap (do NOT hardcode — SAG 14-day / 7-day heuristics were refuted)**; **Idle** (unpaid) is a manual distinction, NOT MMS-auto-derived. |
| 8 | **Calendar surface** | **Stripboard (primary) + light read-only secondary month-grid view** | The stripboard built fresh (dnd-kit) is the primary surface; the small `legacy/components/ui/calendar.tsx` date-picker is reused for assigning dates to ShootDays. A **read-only** month-grid view of ShootDays (color-coded by unit/day_type; click-through to the board) is ported from `legacy/components/globalmodules/original-calendar.tsx` (look/interaction only, wired to real ShootDay data). Editing happens on the stripboard, not the calendar. |
| 9 | **External calendar integration** | **`.ics` export = designed-for additive seam (Phase 5); two-way Google sync OUT OF SCOPE** | One-way `.ics` (shoot days / per-person call days) reads the derived schedule + DOOD — zero schema impact now; natural home is Phase 5 call-sheet distribution. Two-way OAuth/webhook sync is the "200+ integrations" scope-creep the platform spec holds the line against — later horizon. |
| 10 | **MMS / .mms import** | **Deferred** to a later interop pass | Categories already MM-aligned (Phase 2) so it stays feasible. |

> **The v0 `Schedule` module is a non-functional shell** (no stripboard/DOOD/eighths concepts) — **not** ported; the stripboard is built fresh using StudioBinder / Movie Magic *conventions* as the reference. The only meaningful v0 reuse is the `ui/calendar` date-picker and the `original-calendar` look for the secondary view.

---

## Data model (additions to the graph)

All new tables are **project-scoped** with owner-based RLS (Phase 1/2 pattern), per-op policies, CHECK-constraint "enums" (text + CHECK), FK indexes, and `updated_at` triggers. Tables with **two cross-entity FKs validate both** in insert/update with-check (the 0004/0006 lesson). New migrations continue from **0009**.

### Migration 0009 — Location / Set + scene mapping
- **`locations`** — `{ id, project_id, name, address?, geo_lat numeric?, geo_lng numeric?, timezone?, created_at, updated_at }`.
- **`sets`** — `{ id, project_id, location_id? (FK locations, on delete set null), name, created_at, updated_at }`. Auto-created per distinct script slug; `location_id` nullable until placed.
- **`scenes.set_id`** — *additive nullable FK* on the Phase-1 `scenes` table (`references public.sets(id) on delete set null`). The `scenes` UPDATE policy is hardened (two-FK with-check) to validate `set_id` ownership. A data-layer helper auto-creates/matches a Set per distinct `location_slug`.

### Migration 0010 — SceneSegment
- **`scene_segments`** — `{ id, project_id, scene_id (FK scenes), ordinal, page_eighths int, label?, created_at, updated_at }`. Default segment = `ordinal 0`, `page_eighths = scene.page_eighths`; splits add rows summing to the scene's eighths. Lazily created when a scene is first scheduled.

### Migration 0011 — ShootDay + Strip
- **`shoot_days`** — `{ id, project_id, date date? (nullable — board order can precede calendar dates), day_type ('prep'|'prelight'|'build'|'shoot'|'strike'|'travel'|'wrap'), unit ('main'|'second'|'splinter') not null default 'main', studio_or_location ('studio'|'location')?, ordinal int, name?, created_at, updated_at }`. One date → many ShootDays (per unit).
- **`strips`** — `{ id, project_id, shoot_day_id (FK shoot_days), ordinal int, type ('scene'|'day_break'|'banner'), scene_segment_id? (FK scene_segments, required when type='scene'), banner_text?, created_at, updated_at }`. **Both `shoot_day_id` and `scene_segment_id` validated in RLS.** Eighths contribution is **derived**, not stored.

### Migration 0012 — CastDayStatus (overrides only)
- **`cast_day_statuses`** — `{ id, project_id, person_id (FK people), date date, status ('work'|'hold'|'start'|'finish'|'travel'|'drop'|'pickup'), source 'override' (only overrides persisted), note?, created_at, updated_at }`, **unique(person_id, date)**. The derived DOOD is computed live and merged with these.

- **Conflicts** — *no table*; derived on read.

> **Migrations may be split/combined at plan time** (0009–0012 is the logical grouping). Regenerate `lib/db/types.ts` after each (`npx supabase gen types ... 2>/dev/null > lib/db/types.ts`).

---

## Derivation Engine (`lib/schedule/derive/*` — pure; the interconnection)

Pure functions over an already-loaded graph slice (no DB inside → trivially unit-testable; the data layer loads the slice and calls them):

- **`computeEighthsRollup(strips, segments)`** → per-ShootDay page-eighths total (day-balancing).
- **`computeConflicts(graph)`** → `Conflict[]` — a **group-by check, not a constraint solver / interval tree** (whole-day granularity at pre-pro scale; interval trees only matter later for time-of-day call-time overlap). For each date, group confirmed resources required by all scheduled segments and flag:
  - a confirmed cast **Person** required by two scheduled segments on one **date** (incl. different `unit`s);
  - a confirmed **location/gear element** required in two places on one date;
  - an actor with a derived work-day but an **override hold/travel** on that date.
- **`computeDOOD(graph, config)`** → per-Person × date status (EP/MMS rules — research doc): **W** = a date holding a scheduled segment whose scene confirms a Character that Person is cast to (+ `day_type='travel'` as work-equivalent); **S/F** = first/last work day (render SW/WF/SWF); **H** auto-fills non-work days between S and F **excluding company-wide off days**, gated by `config.allowHoldDays`; **D/P** only when `config.allowDropPickup`, using `config.minDropPickupCalendarDays` (configurable — never hardcoded), never on travel days; **merged with persisted overrides** (override wins, marked). DOOD view = **cast rows × date columns**. (`config` = per-category/element settings + project company-off-days, with v1 defaults: hold on for Cast, drop/pickup off.)
- **`computeCompanyMoves(orderedStripsWithSets)`** → consecutive Sets at different addresses → a move (surfaced as a banner or `day_type='travel'`).

**The chain already exists** (no new linking needed): `scene_characters` (confirmed) → `characters.cast_person_id` → `people`; `scene_elements` (confirmed, location/gear categories); `strips → scene_segments → scenes → set_id → locations`; `shoot_days.date/unit`. **Downstream reads only `status='confirmed'` breakdown** (the Phase-2 gate). Conflicts/DOOD that need dates compute over dated ShootDays only.

---

## Services & layout

- `lib/schedule/schema.ts` — Zod rows + write inputs + **derived-result types** (`Conflict`, `DoodEntry`, `EighthsRollup`, `CompanyMove`).
- `lib/schedule/data.ts` — the only place schedule queries live: CRUD (locations, sets, scene_segments, shoot_days, strips, cast_day_statuses) + **graph-slice loaders** + read fns that call the engine (`getStripboard`, `getConflicts`, `getDOOD`, `getCalendar`). parse-on-read; the slug→Set auto-map helper.
- `lib/schedule/derive/{eighths,conflicts,dood,moves}.ts` — pure engine (+ tests).
- `app/dashboard/[projectId]/schedule/{page.tsx,actions.ts}` — actions Zod-parsed, `use server` hygiene (addSceneToDay, reorderStrip, splitScene, createShootDay, setShootDayDate, insertDayBreak/banner, setCastDayOverride, mapSlugToSet, createLocation/Set).
- `components/schedule/*` — **stripboard** (ordered days × strips, **drag-reorder via `dnd-kit`** — new dep, per the platform library list), per-day **eighths rollup**, **conflict** surface, **DOOD** grid, and a **read-only month-grid calendar view** of ShootDays (ported from the v0 `original-calendar` look, wired to real data; click-through to the board). Ported onto the design system.
- **No async jobs** — derivation is synchronous + fast (WDK not needed here).

## Key flows

Drag a Scene onto a ShootDay → auto-create its default SceneSegment (if none) → create a `scene` Strip referencing the segment. Split a scene → add segments (eighths partition) + strips. Insert day-breaks/banners as Strip subtypes. Re-sort scene strips within a day → day-breaks/banners stay put. Assign a calendar date to a ShootDay via the date-picker. The board, rollups, conflicts, DOOD, moves, and the calendar view are all **computed live** from the confirmed graph — a breakdown change reflects with no sync step.

## Testing

- **SceneSegment split** partitions eighths; segments inherit the scene's confirmed breakdown for conflict math.
- **Re-sort safety:** reordering scene strips never deletes day-breaks/banners.
- **Conflict engine (pure unit tests):** graph X → expected conflicts (cast double-book, cross-unit same-date, location/gear clash, hold/travel); resolving the board clears them.
- **DOOD:** derived work/hold correct; an override sticks + is marked.
- **Company-move:** consecutive different-address Sets → flagged.
- **⭐ Cross-module integration test (the thesis):** confirm a cast member on a scene's breakdown → the schedule's conflicts + DOOD reflect it automatically (derived-on-read → no sync). The "modules work together" proof the platform spec wants.
- **RLS:** two-user isolation + junction two-FK escape (strips, sets, `scenes.set_id`), `describe.skipIf(!SUPABASE_SERVICE_ROLE_KEY)`.
- **Component tests:** board, day, DOOD grid, calendar view.

## Deferred (seams, not built in Phase 3)

Segment-level breakdown · `.ics`/iCal export (additive; Phase 5) · two-way Google Calendar sync (later horizon) · MMS/.mms import · sun/weather + Set photos (Phase 5) · large-board virtualization (TanStack Virtual) · full multi-unit board UX · derivation caching (only if profiling demands).

## Prerequisites / environment

- **Build vs reuse (verified):** BUILD the derivation engine + stripboard — no OSS film-scheduling/DOOD engine exists to reuse (Kitsu/Zou confirmed not a fit). Reuse only generic libs below.
- `npm i @dnd-kit/core @dnd-kit/sortable` — stripboard nested/multi-container drag-reorder (pin versions at plan time; nested-sortable patterns are a build-time prototype item — start from dnd-kit's "multiple containers" example).
- **Read-only calendar view:** prefer **react-day-picker** (already vendored in `legacy/ui/calendar.tsx`) or **Schedule-X MIT core** (`createViewMonthGrid`) — note Schedule-X is *open-core* (drag/resize/resource are paid; fine since our view is read-only). FullCalendar/react-big-calendar only if those prove insufficient.
- **`.ics` export (deferred → Phase 5):** `ical-generator` + a tz lib (Luxon/Temporal).
- **Dates/timezone:** `ShootDay.date` is a wall-clock calendar **`date`** (not an instant); `Location.timezone` holds the IANA tz (seam for Phase-5 call times → `timestamptz` + display-time conversion). Use `timestamptz` (never `timestamp`) for any true instants.
- No AI key / no job runner needed this phase. Local Supabase running; migrations applied; types regenerated after each migration.

## Open questions (plan-time)

- Exact migration split (0009–0012 vs fewer files).
- Whether the secondary calendar view supports light date-reassignment (drag a ShootDay to a date) or stays strictly read-only in v1 (lean: read-only + click-through; date edits via the picker).
- DOOD rules are now **resolved** (research doc). Remaining plan-time tuning: where the **config surface** lives (per-category `allowHoldDays`/`allowDropPickup`/`minDropPickupCalendarDays` + project company-off-days) — v1 defaults (hold-on for Cast, drop/pickup off) are fine; a settings UI can be a fast-follow.
- **dnd-kit nested-sortable** patterns + the default **strip-color palette** are build-time prototype/confirm items (research left these open; both non-blocking).
