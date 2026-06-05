# Phase 3 — Scheduling Research (verified findings)

> **Date:** 2026-06-04 · **Method:** deep-research harness (fan-out search → fetch 27 sources → 3-vote adversarial verification → synthesis). 25 claims verified, 21 confirmed, 4 killed.
> **Purpose:** ground the Phase 3 design in industry conventions + a build-vs-reuse verdict, so we don't reinvent (or mis-implement) DOOD. Folded into `2026-06-02-phase-3-schedule-design.md`.

## Build-vs-reuse verdict

**BUILD the derivation engine + stripboard from scratch; REUSE only generic UI/infra libraries.** The OSS landscape for film/TV stripboard / Day-Out-of-Days / call-sheet engines is sparse-to-nonexistent (GitHub `film-production` topic = AI-video/breakdown tools only; no scheduling/DOOD/call-sheet engine). **CGWire Kitsu/Zou confirmed NOT a fit** (animation/VFX production *data management* — projects/shots/assets/tasks/file metadata; its "scheduling" is studio crew-workload, not a shooting stripboard). *Confidence: high on Kitsu/Zou (3-0, primary sources); medium on "OSS landscape empty" (2-1 — a GitHub topic is a narrow proxy, but independent searches corroborated).*

Reuse: **dnd-kit** (nested sortable board), **Schedule-X (MIT core) or react-day-picker** (read-only calendar view), **ical-generator** (deferred `.ics`). See Libraries below.

## DOOD rules (EP / Movie Magic — primary docs, the convention to emulate)

`computeDOOD` is a **pure projection** over strip-to-day assignments (+ future work-equivalent events). Verified rules (sources: `mms-docs.ep.com/DayOutofDays/DOODRules.html`, `…/DayOutofDays.html`, `…/Reports/DOODReport.html`; corroborated SetHero/StudioBinder/Wrapbook):

| Code | Meaning | Derivation (implementable) |
|---|---|---|
| **W** Work | element scheduled to work that day | element is in a strip scheduled on that date. *Travel/Fitting/Rehearsal are separate work-equivalent event types that ALSO produce work days without a strip — `computeDOOD` must accept those as additional inputs (future; v1 = strip membership + `day_type='travel'`).* |
| **S** Start | first working day | first date the element works (rendered **SW** = Start+Work). |
| **F** Finish | last working day | last date the element works (rendered **WF**; single-day = **SWF**). |
| **H** Hold | not used, still on call/paid | **auto-fills every non-working day BETWEEN first and last work day, EXCEPT company-wide off days** — only when **"Allow Hold Days"** is enabled (per element or via Category default). |
| **D/P** Drop/Pickup | released then re-engaged | **two-step opt-in**: Allow Hold Days → Allow Drop/Pickup → a **configurable minimum number of *calendar* days** between drop and pickup; a qualifying gap triggers a Drop (placed in the first qualifying gap) + a Pickup on resumption. **Drops cannot fall on travel/fitting/rehearsal days.** |
| **I** Idle | not used, NOT paid | unpaid analogue of Hold. **Industry convention, NOT part of MMS auto-derivation** — treat as a manual/override distinction, not an auto-derived status. |
| **T** Travel | travel day | from `day_type='travel'` / a travel event; work-equivalent for Start/Finish. |

**Configurable inputs to `computeDOOD` (category/element-level, with v1 defaults):** `allowHoldDays` (default on for Cast), `allowDropPickup` (default off), `minDropPickupCalendarDays` (configurable — **do NOT hardcode**; the SAG 14-day and 7-day heuristics were *refuted* as unreliable), and the project's **company-wide off days**. **Override semantics:** a persisted `cast_day_statuses` row (`source='override'`) wins over the derived value and is marked.

**DOOD report layout (3-0):** elements as **rows** (default Category = Cast), each scheduled **day as a column**; cells carry the derived code; paginate on overflow.

## Stripboard conventions

- **Shooting order ≠ script order (3-0):** strips are reordered to group scenes sharing location/cast/crew (cost efficiency). Validates our **immutable scene/segment identity decoupled from both script order and shooting order**.
- **Auto-reorder deletes day-breaks (3-0, StudioBinder's own docs):** the documented data-loss failure. **Design against it** — day-breaks/banners must be preserved across any (re)sort (our non-destructive invariant; stage→diff→apply or explicit preservation).
- **Strip colors: CONFIGURABLE (refuted as standard).** The common INT/EXT × day/night → White/Yellow/Blue/Green mapping was **refuted (1-2)** — color schemes vary by production/template. Ship a sensible default palette but make it **user-overridable**; do NOT hardcode.

## Conflict / company-move detection

No OSS algorithm or verified source surfaced (under-covered angle) — which confirms it's simple enough to build directly. At pre-pro scale `computeConflicts` is a **group-by check, not a constraint solver / interval tree**: for each (date), group the confirmed resources (cast Person, location/gear Element) required by all scheduled segments; flag any resource required by ≥2 segments (cross-unit = same date, different `unit`); flag an actor with a derived work-day but an `override` hold/travel. **Company-move** = consecutive Sets at different parent-Location addresses in shooting order. *(An interval tree e.g. `static-interval-tree` is only relevant if we later need time-of-day overlap — Phase 5 call times — not for whole-day conflicts.)*

## Libraries (current, verified where noted)

- **dnd-kit** — nested/multi-container sortable for the board (days × strips). *Specific nested-sortable patterns/pitfalls were NOT verified — prototype against current dnd-kit + React 19 at build time (dnd-kit "multiple containers" example is the starting point).*
- **Read-only calendar view** — **Schedule-X** is **MIT-core** with a built-in `createViewMonthGrid` (good for read-only), BUT it's **open-core**: drag/drop, resize, resource scheduler, interactive modal are **paid premium** (3-0). For our **read-only** secondary view the MIT core suffices; **react-day-picker** (already vendored in `legacy/ui/calendar.tsx`) is the simpler alternative for the date-picker + a light grid. FullCalendar / react-big-calendar license + React-19/SSR specifics were NOT independently verified — evaluate only if Schedule-X/react-day-picker prove insufficient.
- **`.ics` export (deferred, Phase 5)** — **`ical-generator`** (Node); timezone/recurrence via *optional* peer deps (Luxon / moment-timezone / dayjs / rrule). Pair with Luxon or Temporal when implemented.

## Timezone / dates (Postgres-backed)

- **Use `timestamptz`, never `timestamp`,** for true instants (3-0, PostgreSQL project wiki). **But `ShootDay.date` is a wall-clock calendar date, not an instant → keep it `date`.**
- **Location-anchored call times (Phase 5):** store the **IANA timezone on `Location`** (our model already has `timezone`); represent call-time instants as `timestamptz` and derive local wall-clock at display via the location tz; for `.ics`, emit `TZID`+`VTIMEZONE` (RFC 5545). Store original local-time + zone for future events (tz rules change) rather than a baked UTC instant.

## Refuted / do-not-hardcode (heed these)
- SAG-AFTRA **14-day** consecutive-employment Drop/Pickup threshold (0-3) — refuted; gap is **configurable**.
- **7-day** WD/PW gap heuristic (1-2) — refuted.
- INT/EXT×day/night **White/Yellow/Blue/Green** strip colors (1-2) — refuted; **configurable**.

## Residual gaps (resolved by design, not blockers)
1. **Conflict algorithm** — no source; resolved by direct design (group-by, above). 2. **dnd-kit nested patterns** — prototype at build time. 3. **Strip color palette** — ship configurable default, confirm against an AD reference later. 4. **FullCalendar/RBC vs Schedule-X** specifics — only needed if the read-only pick proves insufficient.

## Key sources
EP/MMS primary: `mms-docs.ep.com/DayOutofDays/DOODRules.html`, `/DayOutofDays.html`, `/Reports/DOODReport.html` · `en.wikipedia.org/wiki/Production_board` · `support.studiobinder.com/en/articles/419884-auto-reorder-scene-strips` · `github.com/cgwire/zou` · `github.com/schedule-x/schedule-x` · `wiki.postgresql.org/wiki/Don't_Do_This` · `rfc-editor.org/rfc/rfc5545` · `npmjs.com/package/ical-generator`.
