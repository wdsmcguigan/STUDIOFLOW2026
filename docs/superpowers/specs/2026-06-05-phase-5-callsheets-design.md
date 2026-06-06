# Phase 5 — Call Sheets (Design Spec)

> **Status:** ✅ Finalized 2026-06-05 (resolved in the Phase 5 brainstorm).
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phases 0–4 (scenes + confirmed breakdown + the schedule/DOOD + budget all exist and are merged to main; hosted Supabase at 0016).
> **Build order:** Phase 5 (Call Sheets) → **⭐ v1 milestone**.

## Goal

The last module before v1: a **call sheet generated per shoot day** as a **live projection of the production graph** — the day's scenes (from the stripboard), the **cast working that day** (derived from the schedule/DOOD), an authored **crew** roster with per-day call scheduling, and a header (production info, Day X of Y, date, sun times, weather, nearest hospital, notes). It is the fifth proof of the thesis — *change the schedule or the breakdown → the call sheet recomputes* — because the day's scene/cast content is **derived-on-read**, not re-entered. It is the first module that **reads three upstream modules** (breakdown + schedule, and people/contacts) and the first that **emits a document artifact** (a PDF).

This is **not** Set Hero / Croogloo. We build the focused, genuinely-useful call sheet with a live derivation spine, a real crew roster, and PDF export — and hold the line against email distribution, read-receipts/confirmations, live weather APIs, and mobile on-set views (all deferred seams).

---

## Decisions (resolved 2026-06-05)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | **Crew model** | **Full crew roster + per-day scheduling** | A real `crew_members` roster (person/name, department, position, contact) plus per-shoot-day assignment with call times. Cast is derived from DOOD; crew is authored. (User chose the full option over cast-only or lightweight.) Scoped as a *complete roster + call scheduling*, **not** an HR/payroll system. |
| 2 | **Crew rates / budget linkage** | **Optional `day_rate` on crew — display-only** | Crew may carry an optional day-rate for reference on internal lists. It is **explicitly NOT a source of truth** and the **budget engine ignores it** (Phase 4 remains the single home for labor cost). No derivation either way. Documented as such to prevent drift. |
| 3 | **Call-time scoping** | **Cascade: general → department → individual** | The shoot day has a general crew call; departments may override; individuals may override. Resolver: **most-specific wins** (individual → dept → general). Cast get individual calls plus optional makeup/wardrobe/on-set times (default to general). Resolved by a **pure function**, derived-on-read. |
| 4 | **Distribution** | **Generate + export PDF only (no sending)** | v1 produces a polished, revision-stamped call-sheet **PDF** the user downloads/prints/attaches themselves. **No** email sending, recipient management, or confirmations. The exported file IS the distributed artifact. (Email distribution + read-receipts is a deferred seam.) |
| 5 | **PDF engine** | **`@react-pdf/renderer` (server-side)** | Declarative React → PDF, runs in Node with **no headless Chromium** (Vercel-serverless safe, testable). Authored with its own `StyleSheet` primitives (View/Text), mirroring the Tungsten & Sage palette. First new deps since Phase 2 (Phases 3–4 added none) — **regenerate the lock with `npm@10`** (the CI trap). |
| 6 | **Sun & weather** | **SunCalc now (offline), weather manual + seam** | Add `suncalc` (deterministic, no key); reuse the EXISTING nullable `geo_lat`/`geo_lng` on `locations` (added in 0009 — no new coordinate columns); a **pure** sun-times helper yields sunrise/sunset when coords are present. **Weather** is a manual header text field in v1 + a provider **seam** for later (mirrors how Phase 2/4 deferred live external calls to keep tests deterministic and avoid API keys). |
| 7 | **Versioning** | **Derived preview + revision counter + PDF-is-snapshot; versions table is a seam** | The on-screen call sheet is **derived-on-read** (always reflects the current graph). A `revision` int + optional `published_at` is tracked per shoot day; the **exported PDF** is the frozen record (no sending in v1, so the file the user keeps IS the snapshot). An immutable `call_sheet_versions` snapshot table is a **designed-for seam**, not built now. |

> **Soft-modeling guards (additive seams, cost ~nothing now):** (i) **weather** is a manual field behind a provider interface — a live provider is data/config, not a schema change; (ii) **published versions** are a future append-only `call_sheet_versions` snapshot table — `revision`/`published_at` on the call sheet today make that retrofit additive; (iii) **crew↔budget** is intentionally unwired — a future seam can bind a crew position to a budget line without re-scoping; (iv) **distribution** (recipients/send-log/confirmations) hangs off the existing people contacts + the call-sheet doc with no migration of existing tables.

---

## Data model (additions to the graph)

All new tables are **project-scoped** with owner-based RLS (Phase 1–4 pattern), per-op policies, CHECK-constraint "enums" where used (text + CHECK), FK indexes, `updated_at` triggers. Tables with **two cross-entity FKs validate both** in insert/update with-check (the 0004/0006/0011 lesson). Forward-only migrations continue from **0017**. Call-sheet-scoped tables scope through `shoot_day_id → shoot_days.project_id`.

### Migration 0017 — Crew roster (locations already has geo_lat/geo_lng from 0009)
- **`crew_members`** — `{ id, project_id (FK projects, cascade), name text, department text, position text, email text?, phone text?, day_rate numeric? (display-only; NOT used by any engine), person_id uuid? (nullable FK people — optional contact link), ordinal int, created_at, updated_at }`. If `person_id` is set the UI may surface the linked person's contact; the row also carries its own `name`/`email`/`phone` so crew need not be `people` first. Two-FK with-check (project + person both in caller's project when person_id set).
- **`locations`** — NO change; SunCalc reuses the existing nullable `geo_lat`/`geo_lng` columns (added in 0009). No new table, no new columns.

### Migration 0018 — Call sheet header + per-day calls
- **`call_sheets`** — one per shoot day (lazy get-or-create, like the default budget): `{ id, shoot_day_id uuid not null UNIQUE (FK shoot_days, cascade), general_call_time text?, weather_note text?, hospital_name text?, hospital_address text?, notes text?, revision int not null default 1, published_at timestamptz?, created_at, updated_at }`. Scoped via `shoot_day_id → shoot_days.project_id`. (One call sheet per day — a partial-unique safety like Phase 4's 0016 is unnecessary because `shoot_day_id` is itself `UNIQUE`.)
- **`crew_dept_calls`** — department-level call time for a day: `{ id, shoot_day_id (FK, cascade), department text, call_time text, created_at, updated_at }`. Unique `(shoot_day_id, department)`.
- **`crew_day_calls`** — per-day crew roster + optional individual time: `{ id, shoot_day_id (FK, cascade), crew_member_id (FK crew_members, cascade), call_time text?, created_at, updated_at }`. Unique `(shoot_day_id, crew_member_id)`. **Two-FK** with-check (shoot_day + crew_member both owned). Presence of a row = "this crew member is called today."
- **`cast_day_calls`** — per-cast call overrides for a day: `{ id, shoot_day_id (FK, cascade), person_id (FK people, cascade), call_time text?, makeup_time text?, wardrobe_time text?, on_set_time text?, notes text?, created_at, updated_at }`. Unique `(shoot_day_id, person_id)`. **Two-FK** with-check (shoot_day + person both owned). The cast *list* derives from DOOD; this row only **authors times** for a derived cast member.

> Times are stored as text (`"07:30"`) for v1 — simple, timezone-free, matches how call sheets are authored. (A typed time column is a trivial later change if needed.) Regenerate `lib/db/types.ts` after each migration (`… gen types … 2>/dev/null > lib/db/types.ts`).

> **No new graph linking needed** beyond the above — the chain already exists: the day's **scenes** come from `strips → scene_segments → scenes` (Phase 3); the day's **cast** comes from `getDOOD(projectId)` filtered to work codes on that date (Phase 3) joined to `characters.cast_person_id → people` (Phase 2); **contacts** from `people`. Crew + calls + header are the only authored additions.

---

## Derivation engine (`lib/callsheet/derive/*` — pure; the interconnection)

Pure functions over an already-loaded slice (no DB, no `Date.now`/`new Date`, no I/O → trivially unit-testable; the data layer loads the slice and calls them). Inline structural `*Like` input types (the Phase-3/4 decoupling).

- **`resolveCrewCallTime(crewMember, dayCall, deptCallsByDept, generalCallTime)`** → cascade: `dayCall.call_time ?? deptCallsByDept[crewMember.department] ?? generalCallTime ?? null`.
- **`resolveCastCallTime(castDayCall, generalCallTime)`** → `castDayCall?.call_time ?? generalCallTime ?? null` (plus pass-through of makeup/wardrobe/on-set when present).
- **`sun.ts` → `computeSunTimes(latitude, longitude, dateISO)`** → `{ sunrise, sunset } | null` via SunCalc; `null` when coords missing. (SunCalc itself is deterministic; the helper is pure given inputs.)
- **`assembleCallSheet(slice)`** → the resolved document:
  - **header:** production name, **Day X of Y** (this day's 1-based position among the project's ordered *dated* shoot days, and the total count), date, `general_call_time`, sun times, weather (manual), hospital, notes, `revision`.
  - **scenes:** the day's strips in order → scene rows (scene number, INT/EXT, set/location, time-of-day, page eighths, synopsis) — reusing the Phase-3 stripboard projection.
  - **castBlock:** the people **cast-working that day** (from DOOD work codes) → `{ person (name/contact), characterName, callTime, makeup, wardrobe, onSet, notes }` with times resolved.
  - **crewBlock:** the crew **called that day** (`crew_day_calls` rows) grouped by **department**, each → `{ name, position, callTime (resolved), contact }`, departments ordered.

**The chain:** schedule (strips → scenes; DOOD → cast) + breakdown (people/contacts) + authored crew/calls/header → **all derived live**. A schedule or breakdown change reflects in the call sheet with no sync step.

---

## Services & layout

- `lib/callsheet/schema.ts` — Zod rows + write inputs + **derived-result types** (`CallSheetHeader`, `CallSheetScene`, `CastCallRow`, `CrewCallRow`, `CrewDepartmentBlock`, `CallSheet`).
- `lib/callsheet/data.ts` — the only place call-sheet queries live: CRUD (crew_members, crew_dept_calls, crew_day_calls, cast_day_calls, call_sheets header) + `getOrCreateCallSheet(shootDayId)` (idempotent) + a **graph-slice loader** that **reuses `lib/schedule`** (the day's strips/scenes via the stripboard read fns; `getDOOD` for cast) + `lib/breakdown` (people) + the authored tables, then calls the pure engine. Read fns: `getCallSheet(shootDayId)`, `listCrewMembers(projectId)`. parse-on-read; never re-queries schedule/breakdown directly.
- `lib/callsheet/derive/{calls,sun,assemble}.ts` — pure engine (+ tests).
- `lib/callsheet/pdf/call-sheet-document.tsx` — the `@react-pdf/renderer` `<Document>` built from a `CallSheet`; a route handler (`app/dashboard/[projectId]/callsheets/[shootDayId]/pdf/route.ts`) streams it (revision-stamped).
- `app/dashboard/[projectId]/callsheets/{page.tsx,actions.ts}` (+ a per-day view) — actions Zod-parsed, `"use server"` hygiene (**only local async exports** — the manifest footgun): crew CRUD, set/clear dept & day & cast calls, edit header (general call/weather/hospital/notes), bump revision.
- `components/callsheet/*` — day picker, the call-sheet view (header + scenes + cast + crew blocks), crew-roster editor, per-day call editors, header editor, Export-PDF button. Ported onto the design system; **design tokens only**.
- **No async jobs / no email** — generation is synchronous; PDF streams on request (WDK/email not needed).

## Key flows

Open the Call Sheets module → pick a shoot day (the dated days from the schedule). The call sheet renders **live**: header (Day X of Y, date, sun times when the location has coords, manual weather, hospital, notes), the day's **scenes** (from the stripboard), the **cast** working that day (from DOOD) with resolved call/MU/wardrobe times, and the **crew** called that day grouped by department with cascaded call times. Author the crew **roster** once (name/department/position/contact, optional day-rate), then per day pick which crew are called and set general/department/individual call times; set per-cast times as needed; fill the header. **Export PDF** → a revision-stamped document. Move a scene or change the schedule → the affected days' call sheets recompute with no sync step.

## Testing

- **Engine (pure unit tests):** cascade call-time resolution (individual > dept > general); cast call default + MU/wardrobe pass-through; sun times from coords (and null when absent); **Day X of Y** from ordered dated days; scene/cast/crew block assembly. Graph X → document Y.
- **Seed/idempotency:** `getOrCreateCallSheet` twice ⇒ same row.
- **⭐ Cross-module integration test (the thesis):** seed a project + script + scenes + **confirmed** cast + dated shoot days holding scenes + a crew roster. Assert `getCallSheet` shows the right scenes + the DOOD-derived cast + the crew with cascaded times. Then **move a scene to another day** → both days' call sheets update (scene + cast blocks shift) with no sync. **Reject a cast tag** → that person drops from the day's cast block. **Add a crew_day_call** → the crew member appears with the resolved (cascaded) call time. Proves the call sheet derives from breakdown **and** schedule.
- **RLS:** two-user isolation + two-FK escapes on `crew_members` (person_id), `crew_day_calls` (shoot_day + crew_member), `cast_day_calls` (shoot_day + person); `describe.skipIf(!SUPABASE_SERVICE_ROLE_KEY)`.
- **PDF:** a unit test that `renderToBuffer`/`renderToStream` of the `<Document>` for a seeded `CallSheet` produces a non-empty PDF (magic bytes `%PDF`) — no snapshot brittleness, just "it renders."
- **Component/browser smoke** (dev server + Chrome ext + Mailpit OTP/PKCE per the Phase 2–4 playbook; preview MCP can't run on the external volume): sign in → open a project with breakdown + schedule → open Call Sheets → pick a day → see derived scenes/cast → add a crew member + call → see it on the sheet → **Export PDF** (route returns a `%PDF`) → confirm a `"use server"` action POSTs 200 (no manifest 404).

## Deferred (seams, not built in Phase 5)

Email **distribution + recipients + read-receipts/confirmations** (the people-contacts + call-sheet doc are the growth primitive) · immutable **published-version snapshots** (`call_sheet_versions`; `revision`/`published_at` are the seam) · **live weather API** (manual field + provider interface is the seam) · **crew → budget** cost wiring (intentionally unwired) · **mobile on-set view** (Phase 7) · typed time columns / multi-unit per-day call sheets / second-unit splits.

## Prerequisites / environment

- Reuses Phases 0–4: the schedule (`shoot_days`, strips, `getDOOD` via `lib/schedule`), confirmed breakdown cast (`characters.cast_person_id → people`), and `people` contacts. Local Supabase running; migrations applied through 0016; regenerate types after each new migration.
- **New deps (the first since Phase 2; Phases 3–4 added none):** `@react-pdf/renderer` + `suncalc` (both pure-JS, serverless-safe). **CI lock trap:** local **npm 11** can rewrite `package-lock.json` in a way CI's Node-22 **npm 10** rejects — after adding deps, **regenerate the lock with `npx npm@10 install` and verify `npx npm@10 ci` (exit 0)** before pushing.
- **No AI key / no job runner / no email provider** needed this phase.

## Open questions (plan-time)

- Exact migration split (0017 crew+coords / 0018 header+calls vs a different grouping).
- Whether the **crew roster** is global-per-project or can vary per day beyond the `crew_day_calls` assignment (lean: roster is per-project; per-day is just which roster members are called).
- Whether **Day X of Y** counts only `shoot`-type dated days or all dated shoot days (lean: all dated `shoot_days`, matching the calendar; revisit if needed — engine logic, freely revisable).
- PDF layout fidelity to a real call-sheet template (header band, two-column cast/crew, scene strip table) — refine at plan/implementation time; a mock can be produced then.
