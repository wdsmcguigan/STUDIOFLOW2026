# Phase 5 — Call Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A call sheet generated per shoot day as a **live projection** of the production graph — the day's scenes (stripboard) + cast (DOOD) + an authored crew roster with cascaded call times + a header (Day X of Y, sun times, weather, hospital) — exported to a revision-stamped PDF. The fifth module that reads the graph and the first that emits a document.

**Architecture:** Project-scoped Postgres tables under Phase 1–4 owner-RLS, call-sheet tables scoping through `shoot_day_id → shoot_days.project_id`. The **derivation engine is a set of PURE functions** (`(loaded slice) → resolved call sheet`) computed on read — nothing derived persisted (only the authored crew/calls/header). One typed Zod↔DB contract; the only Supabase queries for the domain live in `lib/callsheet/data.ts`, whose graph-slice loader **reuses `lib/schedule`** (stripboard scenes + `getDOOD` cast) + `lib/breakdown` (people). PDF via `@react-pdf/renderer`. Thin-client UI over actions + the data layer.

**Tech Stack:** Next.js 16 / React 19 / TS · Supabase (Postgres + RLS) · Zod v4 · Vitest · **`@react-pdf/renderer`** (server-side PDF) · **`suncalc`** (sun times). **Two new deps** (first since Phase 2).

**Spec:** `docs/superpowers/specs/2026-06-05-phase-5-callsheets-design.md` (the 7 decisions + soft-modeling guards — implement exactly).

---

## Conventions (apply to every task)

- **Parse-on-read / parse-at-boundary.** Reads return Zod-validated domain types; writes parse input; server actions re-parse `FormData` with Zod before the data layer. `"use server"` modules export ONLY locally-defined async actions (never re-export an import — the Phase-1/3 manifest footgun; verified again by the browser smoke).
- **RLS pattern (mirror Phases 1–4 exactly):** project-scoped. Call-sheet tables scope via `exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = <t>.shoot_day_id and p.owner_id = auth.uid())`. Tables with a second cross-entity FK (`crew_members.person_id`, `crew_day_calls.crew_member_id`, `cast_day_calls.person_id`) validate BOTH FKs in insert AND update with-check (the 0004/0006/0011 lesson).
- **Pure engine.** `lib/callsheet/derive/*` functions take already-loaded plain data and return results — NO DB, NO `Date.now()`/`new Date()`, NO I/O. Inline structural `*Like` input types. Trivially unit-testable.
- **Tests** run with `npx dotenv -e .env.local -- npm test`. Live-DB suites: `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)` + the two-user `makeUser`/`newProject` harness (copy the header from `lib/budget/data.test.ts`). RFC-4122-valid UUIDs in fixtures where minted by hand (Zod v4 `z.uuid()` is strict).
- **Type regen after each migration:** `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts` (verify line 1 is `export type Json =`).
- **Commit after each green step.** Conventional commits, scope `phase-5`. `git add` ONLY the specific files for the task — NEVER `git add -A`, never stage `package-lock.json` except in the dedicated deps task (T3).
- **Times are text** (`"07:30"`) in v1 — no time parsing; the engine treats them as opaque strings (cascade picks one; never arithmetic).

---

## File Structure

**Migrations (forward-only, from 0017):**
- `0017_crew_roster.sql` — `crew_members` (+ optional `person_id` two-FK). (SunCalc reuses the EXISTING `locations.geo_lat`/`geo_lng` from 0009 — no new coordinate columns.)
- `0018_call_sheets.sql` — `call_sheets` (1:1 shoot_day) + `crew_dept_calls` + `crew_day_calls` (two-FK) + `cast_day_calls` (two-FK).

**Domain:**
- `lib/callsheet/schema.ts` (+`.test.ts`) — Zod rows, write inputs, derived-result types (`AssembledCallSheet` — the engine's output doc; named to avoid colliding with the `CallSheet` read-row inferred type — plus `CallSheetHeader`, `CallSheetScene`, `CastCallRow`, `CrewDepartmentBlock`, `CrewCallRow`).
- `lib/callsheet/data.ts` (+`.test.ts`) — CRUD, `getOrCreateCallSheet`, `loadCallSheetInputs` (reuses `lib/schedule` + `lib/breakdown`), `getCallSheet`, `listCrewMembers`.
- `lib/callsheet/derive/calls.ts` (+`.test.ts`) — `resolveCrewCallTime` / `resolveCastCallTime`.
- `lib/callsheet/derive/sun.ts` (+`.test.ts`) — `computeSunTimes` (suncalc).
- `lib/callsheet/derive/assemble.ts` (+`.test.ts`) — `assembleCallSheet`.
- `lib/callsheet/pdf/call-sheet-document.tsx` (+ a render test) — the `@react-pdf/renderer` `<Document>`.

**App:**
- `app/dashboard/[projectId]/callsheets/{page.tsx,actions.ts}` + a per-day view.
- `app/dashboard/[projectId]/callsheets/[shootDayId]/pdf/route.ts` — streams the PDF.
- `components/callsheet/{day-picker,call-sheet-view,crew-roster-editor,day-calls-editor,header-editor}.tsx`.

**Cross-module test:** `lib/callsheet/integration.test.ts`.

---

## Task 0: Worktree + environment baseline

**Files:** none (verification only).

- [ ] **Step 1:** Confirm `git branch --show-current` → `phase-5-callsheets`; worktree at `.claude/worktrees/phase-5-callsheets` based off `studioflowv2/main` (includes Phases 1–4; HEAD has migration 0016).
- [ ] **Step 2:** `.env.local` exists (regenerate from `npx supabase status -o env` if missing — NOT inherited across worktrees: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Local Supabase up; `npx supabase migration list --local` shows 0001–0016.
- [ ] **Step 3:** `npm install`; confirm green baseline: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` (expect the merged-main baseline: ~391 passed + 1 skipped). If `npm install` rewrote `package-lock.json`, `git checkout -- package-lock.json` (no dep change yet).
- [ ] **Step 4:** No commit (nothing changed).

---

## Task 1: Migration 0017 — crew roster + location coordinates

**Files:** Create `supabase/migrations/0017_crew_roster.sql`; modify `lib/db/types.ts`; create `lib/callsheet/data.test.ts` (RLS harness + smoke).

- [ ] **Step 1: Write the migration.** Reference `0009`/`0013` for RLS/grant/trigger style.

```sql
-- ============================================================================
-- Phase 5: Crew roster (authored). SunCalc reuses the EXISTING
-- locations.geo_lat / geo_lng columns (from 0009) — no new coordinate columns.
-- ============================================================================
create table public.crew_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,   -- optional contact link
  name text not null,
  department text not null default '',
  position text not null default '',
  email text,
  phone text,
  day_rate numeric,                       -- display-only; NO engine reads this
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crew_members_project_id_idx on public.crew_members(project_id);
create index crew_members_person_id_idx on public.crew_members(person_id);

alter table public.crew_members enable row level security;

-- crew_members: project owned AND (person_id null OR person in caller's project)
create policy "crew_members - select" on public.crew_members for select using (exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid()));
create policy "crew_members - insert" on public.crew_members for insert with check (
  exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid())
  and (person_id is null or exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = crew_members.person_id and p2.owner_id = auth.uid())));
create policy "crew_members - update" on public.crew_members for update using (
  exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid())
  and (person_id is null or exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = crew_members.person_id and p2.owner_id = auth.uid())));
create policy "crew_members - delete" on public.crew_members for delete using (exists (select 1 from public.projects p where p.id = crew_members.project_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.crew_members to authenticated;
create trigger crew_members_set_updated_at before update on public.crew_members for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2: Apply + regen types.** `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts`. Confirm line 1 is `export type Json =`; `crew_members` appears. (No `locations` change — SunCalc reuses the existing `geo_lat`/`geo_lng`.)
- [ ] **Step 3: Create `lib/callsheet/data.test.ts`** — copy the harness header (imports of createClient/SupabaseClient/Database, `url`/`anon`/`service` consts, `makeUser`, `newProject`) from `lib/budget/data.test.ts` lines ~1–44 (drop the budget-specific imports; use raw `client.from(...)` for this task). Then `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("crew roster RLS (0017)", ...)` with:
  - **isolation:** Alice inserts a `crew_members` row (`{ project_id: aliceProject, name: "Grip 1", department: "Grip" }`); Bob sees 0 rows.
  - **two-FK escape:** Alice creates a `people` row (hers). Bob creates HIS own project; tries to insert a `crew_members` row with `project_id` = Bob's project but `person_id` = ALICE's person → `error.code === "42501"`.
- [ ] **Step 4: Run + verify pass.** `npx dotenv -e .env.local -- npm test -- lib/callsheet/data.test.ts`.
- [ ] **Step 5: Typecheck + commit** `git add supabase/migrations/0017_crew_roster.sql lib/db/types.ts lib/callsheet/data.test.ts && git commit -m "feat(phase-5): migration 0017 crew roster + location coords (two-FK RLS)"`.

---

## Task 2: Migration 0018 — call sheets + per-day calls

**Files:** Create `supabase/migrations/0018_call_sheets.sql`; modify `lib/db/types.ts`; extend `lib/callsheet/data.test.ts`.

- [ ] **Step 1: Migration.** `crew_day_calls` (shoot_day + crew_member) and `cast_day_calls` (shoot_day + person) each have TWO cross-entity FKs → validate both in insert AND update with-check (the 0006 lesson). `call_sheets` and `crew_dept_calls` are single-FK (shoot_day).

```sql
-- ============================================================================
-- Phase 5: Call sheet header (1:1 shoot_day) + cascaded per-day calls.
-- ============================================================================
create table public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null unique references public.shoot_days(id) on delete cascade,
  general_call_time text,
  weather_note text,
  hospital_name text,
  hospital_address text,
  notes text,
  revision int not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.crew_dept_calls (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  department text not null,
  call_time text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, department)
);
create table public.crew_day_calls (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  call_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, crew_member_id)
);
create table public.cast_day_calls (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  call_time text,
  makeup_time text,
  wardrobe_time text,
  on_set_time text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, person_id)
);

create index call_sheets_shoot_day_idx on public.call_sheets(shoot_day_id);
create index crew_dept_calls_shoot_day_idx on public.crew_dept_calls(shoot_day_id);
create index crew_day_calls_shoot_day_idx on public.crew_day_calls(shoot_day_id);
create index crew_day_calls_crew_member_idx on public.crew_day_calls(crew_member_id);
create index cast_day_calls_shoot_day_idx on public.cast_day_calls(shoot_day_id);
create index cast_day_calls_person_idx on public.cast_day_calls(person_id);

alter table public.call_sheets enable row level security;
alter table public.crew_dept_calls enable row level security;
alter table public.crew_day_calls enable row level security;
alter table public.cast_day_calls enable row level security;

-- helper predicate (inlined): shoot_day belongs to caller
-- call_sheets: shoot_day-scoped (4 policies)
create policy "call_sheets - select" on public.call_sheets for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));
create policy "call_sheets - insert" on public.call_sheets for insert with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));
create policy "call_sheets - update" on public.call_sheets for update using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));
create policy "call_sheets - delete" on public.call_sheets for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = call_sheets.shoot_day_id and p.owner_id = auth.uid()));

-- crew_dept_calls: shoot_day-scoped (4 policies)
create policy "crew_dept_calls - select" on public.crew_dept_calls for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_dept_calls - insert" on public.crew_dept_calls for insert with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_dept_calls - update" on public.crew_dept_calls for update using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_dept_calls - delete" on public.crew_dept_calls for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_dept_calls.shoot_day_id and p.owner_id = auth.uid()));

-- crew_day_calls: BOTH shoot_day and crew_member must belong to the caller (two-FK)
create policy "crew_day_calls - select" on public.crew_day_calls for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "crew_day_calls - insert" on public.crew_day_calls for insert with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.crew_members c join public.projects p2 on p2.id = c.project_id where c.id = crew_day_calls.crew_member_id and p2.owner_id = auth.uid()));
create policy "crew_day_calls - update" on public.crew_day_calls for update using (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.crew_members c join public.projects p2 on p2.id = c.project_id where c.id = crew_day_calls.crew_member_id and p2.owner_id = auth.uid()));
create policy "crew_day_calls - delete" on public.crew_day_calls for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = crew_day_calls.shoot_day_id and p.owner_id = auth.uid()));

-- cast_day_calls: BOTH shoot_day and person must belong to the caller (two-FK)
create policy "cast_day_calls - select" on public.cast_day_calls for select using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid()));
create policy "cast_day_calls - insert" on public.cast_day_calls for insert with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_calls.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_calls - update" on public.cast_day_calls for update using (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_calls.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_calls - delete" on public.cast_day_calls for delete using (exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = cast_day_calls.shoot_day_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.call_sheets to authenticated;
grant select, insert, update, delete on public.crew_dept_calls to authenticated;
grant select, insert, update, delete on public.crew_day_calls to authenticated;
grant select, insert, update, delete on public.cast_day_calls to authenticated;
create trigger call_sheets_set_updated_at before update on public.call_sheets for each row execute function extensions.moddatetime(updated_at);
create trigger crew_dept_calls_set_updated_at before update on public.crew_dept_calls for each row execute function extensions.moddatetime(updated_at);
create trigger crew_day_calls_set_updated_at before update on public.crew_day_calls for each row execute function extensions.moddatetime(updated_at);
create trigger cast_day_calls_set_updated_at before update on public.cast_day_calls for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2:** Apply + regen types. Confirm all four tables appear.
- [ ] **Step 3: Tests** (append a `("call sheet tables RLS (0018)")` block). To seed a shoot day you need a project + a `shoot_days` row (insert directly: `{ project_id, ordinal: 0, date: "2026-09-01", day_type: "shoot", unit: "main" }` — check `lib/schedule/data.test.ts` for exact columns). Tests:
  - owner creates a `call_sheets` row for their shoot day — succeeds; isolation (Bob sees 0).
  - **two-FK escapes (assert `42501`):** Bob's `crew_day_calls` referencing ALICE's `crew_member_id` (with Bob's own shoot day); Bob's `cast_day_calls` referencing ALICE's `person_id`.
- [ ] **Step 4-5:** Run, verify pass; commit `feat(phase-5): migration 0018 call sheets + per-day calls (two-FK RLS) + escape tests`. **After this task run `npx supabase db reset` once to confirm 0001→0018 replay clean.**

---

## Task 3: Add deps (`@react-pdf/renderer` + `suncalc`) — CI-safe lock

**Files:** `package.json`, `package-lock.json`.

- [ ] **Step 1:** `npm i @react-pdf/renderer suncalc && npm i -D @types/suncalc` (suncalc ships no types). (`@react-pdf/renderer` bundles its own types.)
- [ ] **Step 2: Regenerate the lock with npm 10 INCREMENTALLY (the CI trap — do NOT regen from scratch).** Regenerating from scratch (`rm package-lock.json && npm install`) reshuffles transitive resolution (chokidar `^5` vs `4.0.3`, readdirp) and produces a lock that `npm ci` rejects — even with npm 10. Instead, start from the CI-green base lock and let npm 10 add only the new deps: `git checkout <base-main-sha> -- package-lock.json && rm -rf node_modules && npx --yes npm@10 install`. Then **verify** `npx --yes npm@10 ci` exits 0 (capture the real exit code — `EUSAGE`/"chokidar does not satisfy"/"Missing from lock file" = the trap; if you see it, you regenerated from scratch — redo incrementally from the base lock).
- [ ] **Step 3:** Confirm green: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` (baseline unchanged; deps not yet imported).
- [ ] **Step 4: Commit** `git add package.json package-lock.json && git commit -m "build(phase-5): add @react-pdf/renderer + suncalc (lock regenerated with npm@10)"`.

---

## Task 4: `lib/callsheet/schema.ts` — typed contract

**Files:** Create `lib/callsheet/schema.ts`, `lib/callsheet/schema.test.ts`.

- [ ] **Step 1: Failing tests** covering a read row, a write input, and the derived-result shape:
```ts
import { crewMember, createCrewMemberInput, setCrewDayCallInput, upsertCallSheetHeaderInput } from "@/lib/callsheet/schema";
it("createCrewMemberInput requires name + projectId", () => {
  expect(createCrewMemberInput.safeParse({ projectId: crypto.randomUUID(), name: "Grip", department: "Grip", position: "Key Grip" }).success).toBe(true);
  expect(createCrewMemberInput.safeParse({ projectId: crypto.randomUUID() }).success).toBe(false); // name required
});
it("setCrewDayCallInput allows null call_time (cascade)", () => {
  expect(setCrewDayCallInput.safeParse({ shootDayId: crypto.randomUUID(), crewMemberId: crypto.randomUUID(), callTime: null }).success).toBe(true);
});
it("crewMember row parses loose strings", () => {
  expect(crewMember.safeParse({ id: crypto.randomUUID(), project_id: crypto.randomUUID(), person_id: null, name: "X", department: "", position: "", email: null, phone: null, day_rate: null, ordinal: 0, created_at: "t", updated_at: "t" }).success).toBe(true);
});
```
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement** (mirror `lib/budget/schema.ts`: loose strings/nullables on read rows, strict on write inputs, `z.uuid()`):
  - **Read rows:** `crewMember`, `callSheet`, `crewDeptCall`, `crewDayCall`, `castDayCall` (numeric `day_rate` → `z.number().nullable()`; all time fields `z.string().nullable()`; `revision` `z.number().int()`; `published_at` `z.string().nullable()`).
  - **Write inputs:** `createCrewMemberInput` / `updateCrewMemberInput` (name/department/position/email?/phone?/dayRate?/personId?/ordinal), `setCrewDeptCallInput` (`{ shootDayId, department, callTime }`), `setCrewDayCallInput` (`{ shootDayId, crewMemberId, callTime: string|null }`), `removeCrewDayCallInput`, `setCastDayCallInput` (`{ shootDayId, personId, callTime?, makeupTime?, wardrobeTime?, onSetTime?, notes? }`), `upsertCallSheetHeaderInput` (`{ shootDayId, generalCallTime?, weatherNote?, hospitalName?, hospitalAddress?, notes? }`), `bumpRevisionInput` (`{ shootDayId }`).
  - **Derived-result types** (plain TS interfaces, like budget): `CallSheetHeader` (production/dayNumber/dayCount/date/generalCallTime/sunrise/sunset/weather/hospitalName/hospitalAddress/notes/revision), `CallSheetScene` (sceneNumber/intExt/setOrLocation/timeOfDay/pageEighths/synopsis), `CastCallRow` (personId/name/characterName/callTime/makeup/wardrobe/onSet/contactPhone/contactEmail/notes), `CrewCallRow` (crewMemberId/name/position/callTime/contactPhone/contactEmail), `CrewDepartmentBlock` (department/members: CrewCallRow[]), `CallSheet` (header/scenes/cast/crewByDepartment).
  - Export inferred types for each schema.
- [ ] **Step 4-5:** Run → pass; typecheck; commit `feat(phase-5): call sheet Zod contract + derived-result types`.

---

## Task 5: `lib/callsheet/data.ts` — CRUD + header get-or-create

**Files:** Create `lib/callsheet/data.ts`; extend `lib/callsheet/data.test.ts`.

- [ ] **Step 1: Failing tests** for `createCrewMember`/`listCrewMembers`/`updateCrewMember`/`deleteCrewMember`; `getOrCreateCallSheet` (idempotent — twice ⇒ same id); `upsertCallSheetHeader` (updates fields); `setCrewDeptCall`/`listCrewDeptCalls`; `setCrewDayCall` (upsert on `(shoot_day_id, crew_member_id)`) / `removeCrewDayCall` / `listCrewDayCalls`; `setCastDayCall` (upsert) / `listCastDayCalls`; `bumpRevision` (increments `revision`).
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement** (mirror `lib/budget/data.ts`: `type DbClient = SupabaseClient<Database>`, parse-on-read, `throw new Error(msg,{cause})`, parsed write inputs). Upserts use `.upsert(row, { onConflict: "shoot_day_id,crew_member_id" })` etc. `getOrCreateCallSheet(client, shootDayId)` reads the row or inserts one (the `shoot_day_id` UNIQUE makes a concurrent double-insert fail with `23505` → re-read; handle it the way Phase-4 `getOrCreateDefaultBudget` does). Keep each function small.
- [ ] **Step 4-5:** Run → pass; typecheck; commit `feat(phase-5): call sheet data layer — crew + calls + header CRUD (idempotent get-or-create)`.

---

## Task 6: `lib/callsheet/data.ts` — graph-slice loader (reuses lib/schedule + lib/breakdown)

**Files:** Modify `lib/callsheet/data.ts`; extend test.

- [ ] **Step 1: Failing test:** `loadCallSheetInputs(client, shootDayId)` returns the plain-data slice the engine needs: `{ shootDay, orderedDatedDayIds (string[] for Day X of Y), scenes (for this day, ordered), castPeople (DOOD-working that day → person rows + characterName), crewMembers, crewDayCalls, crewDeptCalls, castDayCalls, callSheet (header), location (with the EXISTING `geo_lat`/`geo_lng` columns from 0009) }`. Assert it reads the right day's scenes (from strips) and the right cast (DOOD work codes on that date), project-scoped.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement `loadCallSheetInputs`** — **reuse `lib/schedule`**: resolve the shoot day's `project_id`; get the project's ordered dated shoot days (via `listShootDays` filtered to dated, sorted by ordinal) for Day-X-of-Y + to find this day's position; get this day's scenes from the stripboard projection (reuse `getStripboard`/`loadScheduleGraph` and filter strips to `shoot_day_id`); get cast via `getDOOD(client, projectId)` filtered to **work codes** on this day's date, mapped to `people` + the character name (join through `characters.cast_person_id`); load this project's `crew_members` + this day's `crew_day_calls`/`crew_dept_calls`/`cast_day_calls` + the `call_sheets` header (via `getOrCreateCallSheet`) + the day's `location` (read its EXISTING `geo_lat`/`geo_lng` columns — added in 0009, NOT new ones; pass them to `computeSunTimes`). Return plain objects. This is the ONLY place the engine's input is assembled. (Import schedule/breakdown read fns; do not duplicate their queries. Define which DOOD codes mean "on set today" — `SW/W/WF/SWF` (working); `H`(hold)/`T`(travel) are typically listed too — decide and comment; lean: working codes `{SW,W,WF,SWF}` appear in the cast block, hold/travel noted separately or included — keep it a clearly-commented constant, freely revisable.)
- [ ] **Step 4-5:** Run → pass; commit `feat(phase-5): loadCallSheetInputs (reuses schedule stripboard + DOOD + breakdown people)`.

---

## Task 7: `derive/calls.ts` — call-time cascade (pure)

**Files:** Create `lib/callsheet/derive/calls.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests:** `resolveCrewCallTime` returns individual `call_time` when set; else the department call; else the general call; else null. `resolveCastCallTime` returns the cast override else general; passes makeup/wardrobe/on-set through.
- [ ] **Step 2-4:** Implement pure functions with inline `*Like` types: `resolveCrewCallTime(member, dayCall, deptCallByDept, generalCallTime)` and `resolveCastCallTime(castDayCall, generalCallTime)`. No DB/Date. Run → pass.
- [ ] **Step 5:** commit `feat(phase-5): derive call-time cascade (pure; individual > dept > general)`.

---

## Task 8: `derive/sun.ts` — sun times (pure, suncalc)

**Files:** Create `lib/callsheet/derive/sun.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests:** `computeSunTimes(lat, lng, "2026-09-01")` returns `{ sunrise, sunset }` (HH:mm strings) for known coords; returns `null` when lat or lng is null/undefined. (Assert sunrise < sunset and plausible; don't hard-assert exact minutes — assert format `^\d\d:\d\d$` and ordering to stay deterministic across SunCalc versions.)
- [ ] **Step 2-4:** Implement `computeSunTimes(latitude, longitude, dateISO)` using `suncalc` (`SunCalc.getTimes(new Date(dateISO + "T12:00:00Z"), lat, lng)`), formatting `sunrise`/`sunset` to `HH:mm`. **Note:** this is the ONE allowed `new Date()` — it is constructed from the passed `dateISO` argument (deterministic), NOT `Date.now()`. Keep the function pure w.r.t. its inputs. Return null when coords absent. Run → pass.
- [ ] **Step 5:** commit `feat(phase-5): derive computeSunTimes (suncalc; pure given coords+date)`.

---

## Task 9: `derive/assemble.ts` — assemble the call sheet (pure)

**Files:** Create `lib/callsheet/derive/assemble.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests:** given a plain slice, `assembleCallSheet` returns `{ header, scenes, cast, crewByDepartment }` with: **Day X of Y** correct (this day's 1-based index in `orderedDatedDayIds` + total); scenes mapped in strip order; cast rows resolved (call time cascades to general; makeup/wardrobe pass through; characterName + contact present); crew grouped by department, ordered, each member's call time resolved via the cascade; sun times included when coords present, null otherwise; weather/hospital/notes/revision copied from the header.
- [ ] **Step 2-4:** Implement `assembleCallSheet(slice)` calling `resolveCrewCallTime`/`resolveCastCallTime`/`computeSunTimes`. Inline `*Like` input types. Pure. Run → pass.
- [ ] **Step 5:** commit `feat(phase-5): derive assembleCallSheet (pure; Day X of Y + scenes + cast + crew blocks)`.

---

## Task 10: `lib/callsheet/data.ts` — engine-wiring read fn

**Files:** Modify `lib/callsheet/data.ts`; extend test (live-DB integration).

- [ ] **Step 1: Failing test** — seed a project + script + scene + confirmed cast (character + `cast_person_id`) + a dated shoot day holding the scene (segment + strip) + a crew member + a `crew_day_call`; assert `getCallSheet(shootDayId)` returns the derived doc (the scene in `scenes`, the cast person in `cast`, the crew member in the right department block with the resolved call time).
- [ ] **Step 2-4: Implement** `getCallSheet(client, shootDayId)` = `loadCallSheetInputs` → `assembleCallSheet`. Run → pass.
- [ ] **Step 5:** commit `feat(phase-5): wire call sheet engine into getCallSheet (derived-on-read)`.

---

## Task 11: PDF document + route handler

**Files:** Create `lib/callsheet/pdf/call-sheet-document.tsx`, `lib/callsheet/pdf/call-sheet-document.test.ts`, `app/dashboard/[projectId]/callsheets/[shootDayId]/pdf/route.ts`.

- [ ] **Step 1: Failing test:** `renderToBuffer(<CallSheetDocument callSheet={fixture} />)` (from `@react-pdf/renderer`) returns a Buffer whose first bytes are `%PDF`. Use a hand-built `AssembledCallSheet` fixture (no DB). (NOTE: the engine's output type is `AssembledCallSheet`, not `CallSheet` — `CallSheet` is the read-row inferred type.)
- [ ] **Step 2-4: Implement** `CallSheetDocument` — a `@react-pdf/renderer` `<Document>` with a `<Page>`: header band (production / Day X of Y / date / general call / sun / weather / hospital), a scenes table, a cast table, crew grouped by department. Use `StyleSheet.create` with colors mirroring the design tokens (hard-code the hex equivalents of the Tungsten & Sage palette in ONE local stylesheet — react-pdf can't read CSS vars; reference `app/globals.css` for the values and add a comment). The route handler (`route.ts`): `GET` → resolve params, `createClient()` (SSR), `getCallSheet(supabase, shootDayId)`, `renderToStream`/`renderToBuffer`, return a `Response` with `content-type: application/pdf` and a `content-disposition` filename including the revision. Run the render test → pass; `npm run build` passes.
- [ ] **Step 5:** commit `feat(phase-5): call sheet PDF document + streaming route (react-pdf)`.

---

## Task 12: Server actions

**Files:** Create `app/dashboard/[projectId]/callsheets/actions.ts`.

- [ ] **Step 1-4:** `"use server"` module, each action Zod-parses FormData, calls the data layer with the SSR client (`@/lib/supabase/server`), `revalidatePath`. Actions: `createCrewMemberAction`/`updateCrewMemberAction`/`deleteCrewMemberAction`, `setCrewDeptCallAction`, `setCrewDayCallAction`/`removeCrewDayCallAction`, `setCastDayCallAction`, `upsertCallSheetHeaderAction`, `bumpRevisionAction`. Export ONLY local async fns (`grep "^export"` → all `export async function`). Numeric fields via `z.coerce.number()`. `npm run typecheck` + `npm run build` pass.
- [ ] **Step 5:** commit `feat(phase-5): call sheet server actions (Zod-parsed, manifest-safe)`.

---

## Task 13: Call sheet view UI

**Files:** Create `app/dashboard/[projectId]/callsheets/page.tsx`, `components/callsheet/{day-picker,call-sheet-view}.tsx`. Reach it from the schedule (link each shoot day → its call sheet) and/or a nav entry.

- [ ] **Step 1-4:** Server `page.tsx`: list the project's dated shoot days (reuse `listShootDays`); a **day picker**; for the selected day, `getCallSheet(supabase, shootDayId)` → render the **call-sheet view** (header with Day X of Y / date / general call / sun / weather / hospital; scenes table; cast block with resolved times; crew grouped by department) + an **Export PDF** link to the `/pdf` route. Design tokens; NO hardcoded colors (web view; the PDF is the only place hex is allowed). Verify lint/typecheck/build. Add a "Call Sheets" nav entry if the module nav pattern makes it a one-liner (check `components/layout/app-sidebar.tsx`).
- [ ] **Step 5:** commit `feat(phase-5): call sheet view (day picker + header + scenes + cast + crew)`.

---

## Task 14: Editors (crew roster, per-day calls, header)

**Files:** Create `components/callsheet/{crew-roster-editor,day-calls-editor,header-editor}.tsx`; extend `page.tsx`.

- [ ] **Step 1-4:** Client components (`"use client"`, `<form action={...}>`): a **crew-roster editor** (add/edit/remove crew_members: name/department/position/email/phone/optional day-rate); a **day-calls editor** (toggle which crew are called today → `setCrewDayCallAction`/`removeCrewDayCallAction`; set department calls → `setCrewDeptCallAction`; set per-cast times → `setCastDayCallAction`); a **header editor** (general call / weather / hospital / notes → `upsertCallSheetHeaderAction`; a "Mark revised" button → `bumpRevisionAction`). Tokens only. Verify lint/typecheck/build.
- [ ] **Step 5:** commit `feat(phase-5): call sheet editors (crew roster + per-day calls + header)`.

---

## Task 15: ⭐ Cross-module integration test + browser smoke

**Files:** Create `lib/callsheet/integration.test.ts`.

- [ ] **Step 1-4: The thesis test** (live-DB, two-user harness): seed a project + script + two scenes + **confirmed** cast (character + `cast_person_id`) + two dated shoot days, each holding one scene (segment + strip) + a crew roster + a `crew_day_call`. Assert `getCallSheet(day1)` shows day1's scene + the cast working day1 + the crew member with the resolved call time, and correct **Day 1 of 2**. Then **move the scene's strip from day1 to day2** (update the strip's `shoot_day_id`) → assert `getCallSheet(day1)` no longer lists that scene/cast and `getCallSheet(day2)` now does — no sync step. **Reject the cast tag** (`scene_characters.status = 'rejected'`) → the person drops from the relevant day's cast block. **Set a department call then an individual override** → assert the cascade resolves to the individual. Run → pass.
- [ ] **Step 5: Browser smoke** (per the Phase 2–4 playbook — preview MCP can't run on the external volume, so run the dev server via Bash and drive the **Claude-in-Chrome** extension; OTP/PKCE login pulling the magic link from Mailpit `:54324`; native-setter for controlled inputs): seed a confirmed user + project with breakdown + schedule via a throwaway service-role script (delete after; do NOT commit it) → sign in → open Call Sheets → pick a day → see derived scenes/cast → add a crew member + a call → see it on the sheet → open the **/pdf** route and confirm it returns a `%PDF` (200, `content-type: application/pdf`) → confirm a `"use server"` action POSTs 200 (no manifest 404). Record results. Commit `test(phase-5): cross-module integration (schedule+breakdown→call sheet) + smoke notes`.

---

## Task 16: Final verification + branch finish

- [ ] **Step 1:** Full green: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`.
- [ ] **Step 2:** `npx supabase db reset` (replay 0001→0018 clean) → re-run the suite.
- [ ] **Step 3:** `npm run build` passes; **lock sanity** — deps WERE added (T3), so verify `npx npm@10 ci` (exit 0) — the recurring npm10-vs-npm11 CI trap.
- [ ] **Step 4:** Walk the spec §"Testing"/decisions; confirm each is demonstrable.
- [ ] **Step 5:** Use `superpowers:finishing-a-development-branch`. Push to **`studioflowv2`**, open a PR to `main`; wait for the CI `build` check green; **Do NOT merge without the user's explicit go** (merge auto-deploys + auto-applies 0017–0018 to hosted Supabase). After an approved merge, verify the merge commit's checks green (`gh api repos/wdsmcguigan/StudioFlowV2/commits/<sha>/check-runs` + Vercel + Supabase statuses). This reaches the **⭐ v1 milestone**.

---

## Self-Review (plan vs spec)

- **Spec coverage:** full crew roster (T1/T5/T14) · location coords + SunCalc (T1/T8) · call_sheets header + revision (T2/T5/T14) · cascade calls dept/day/cast (T2/T5/T7) · derived-on-read engine (T7–T9) · graph-slice loader reusing schedule/DOOD + breakdown (T6) · getCallSheet wiring (T10) · PDF via react-pdf + streaming route (T11) · actions (T12) · view + editors UI (T13–T14) · cross-module thesis test + smoke (T15) · two-user RLS + two-FK escapes (T1/T2) · new deps with npm@10 lock (T3/T16). **All mapped.**
- **Deferred honored:** email distribution/recipients/confirmations, published-version snapshots (`call_sheet_versions`), live weather API, crew→budget wiring, mobile on-set view — none built (seams only: `revision`/`published_at`, manual weather field, optional `day_rate`).
- **Decisions → tasks:** D1 full crew → T1/T5/T14; D2 display-only day_rate (no engine reads) → T1 schema + comment; D3 cascade → T7; D4 PDF-only → T11 (no send); D5 react-pdf → T3/T11; D6 SunCalc + manual weather → T1/T8; D7 derived + revision + seam → T2/T5/T10.
- **CI/merge gotchas baked in:** npm10-vs-npm11 lock (T3 + T16), `"use server"` local-exports-only (T12), `2>/dev/null` type regen (migration tasks), the ONE legitimate `new Date(dateISO)` in sun.ts flagged (T8), push to `studioflowv2` + merge-gate pause (T16).
- **Type consistency:** the derived-result types defined in T4 (`CallSheet`/`CallSheetHeader`/`CastCallRow`/`CrewCallRow`/`CrewDepartmentBlock`/`CallSheetScene`) are produced by the engine in T9 and consumed by the PDF (T11) and UI (T13) — names align.
