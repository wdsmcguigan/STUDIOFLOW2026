# Phase 3 — Schedule / Stripboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arrange scenes into a stripboard of ShootDays and auto-derive conflicts (cast/location/gear, cross-unit) + a Day-Out-of-Days from the confirmed production graph — the first module that *reads* the graph.

**Architecture:** Project-scoped Postgres tables under Phase 1/2 owner-RLS. The **Derivation Engine is a set of PURE functions** (`(graph slice) → eighths / conflicts / DOOD / company-moves`) computed on read — nothing derived is persisted (only manual DOOD *overrides*). One typed Zod↔DB contract; the only Supabase queries for the domain live in `lib/schedule/data.ts`. UI is a thin client (dnd-kit stripboard + read-only calendar) over actions + the data layer.

**Tech Stack:** Next.js 16 / React 19 / TS · Supabase (Postgres + RLS) · Zod v4 · `@dnd-kit/core` + `@dnd-kit/sortable` (board) · `date-fns` (date math / month grid) · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-phase-3-schedule-design.md` · **Research:** `docs/superpowers/specs/2026-06-04-phase-3-scheduling-research.md` (EP/MMS DOOD rules — implement exactly).

---

## Conventions (apply to every task)

- **Parse-on-read / parse-at-boundary.** Reads return Zod-validated domain types; writes parse input; server actions re-parse `FormData` with Zod before the data layer. `"use server"` modules export ONLY locally-defined async actions (never re-export an import — the Phase-1 manifest footgun).
- **RLS pattern (mirror Phase 1/2 exactly):** project-scoped tables use `exists (select 1 from public.projects p where p.id = <t>.project_id and p.owner_id = auth.uid())`; tables with two cross-entity FKs validate BOTH in insert AND update with-check (the 0004/0006 lesson).
- **Pure engine.** `lib/schedule/derive/*` functions take already-loaded plain data and return results — NO DB, NO `Date.now()`/`new Date()` without an injected "today", NO I/O. Trivially unit-testable.
- **Tests** run with `npx dotenv -e .env.local -- npm test`. Live-DB suites: `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)` + the two-user `makeUser`/`newProject` harness (copy the header from `lib/breakdown/data.test.ts`).
- **Type regen after each migration:** `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts` (the `2>/dev/null` strips the CLI's stray first line; verify line 1 is `export type Json =`).
- **Commit after each green step.** Conventional commits, scope `phase-3`.
- **DOOD codes** (implement per EP/MMS): `W` work, `S`/`F` first/last work (compound `SW`/`WF`/`SWF`), `H` hold (paid), `D`/`P` drop/pickup, `T` travel, `O` company-off. `I` (idle) is override-only, not auto-derived.

---

## File Structure

**Migrations (forward-only, from 0009):**
- `0009_locations_sets.sql` — `locations`, `sets`, `scenes.set_id` (additive FK + hardened scenes UPDATE policy).
- `0010_scene_segments.sql` — `scene_segments`.
- `0011_shoot_days_strips.sql` — `shoot_days`, `strips` (two-FK RLS).
- `0012_cast_day_statuses.sql` — `cast_day_statuses`.

**Domain:**
- `lib/schedule/schema.ts` (+`.test.ts`) — Zod rows, write inputs, derived-result types, DOOD config + codes.
- `lib/schedule/data.ts` (+`.test.ts`) — CRUD, slug→Set auto-map, graph-slice loader, engine-wiring read fns.
- `lib/schedule/derive/eighths.ts` (+`.test.ts`) — `computeEighthsRollup`.
- `lib/schedule/derive/conflicts.ts` (+`.test.ts`) — `computeConflicts`.
- `lib/schedule/derive/dood.ts` (+`.test.ts`) — `computeDOOD`.
- `lib/schedule/derive/moves.ts` (+`.test.ts`) — `computeCompanyMoves`.

**App:**
- `app/dashboard/[projectId]/schedule/{page.tsx,actions.ts}`.
- `components/schedule/{stripboard,shoot-day,strip,conflict-panel,dood-grid,calendar-view}.tsx`.

**Cross-module test:** `lib/schedule/integration.test.ts`.

---

## Task 0: Install deps

**Files:** Modify `package.json`.

- [ ] **Step 1:** `npm i @dnd-kit/core @dnd-kit/sortable date-fns` (pin whatever resolves; record versions).
- [ ] **Step 2:** Verify the lock is in sync for CI's strict `npm ci`: `rm -rf node_modules && npm ci` → must succeed (the Phase-2 lesson: lenient `npm install` can leave an inconsistent lock; CI uses `npm ci`). If `npm ci` errors, run `npm install` once more to reconcile, then re-verify.
- [ ] **Step 3:** Baseline: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` → green (118 + 1 skipped).
- [ ] **Step 4:** Commit:
```bash
git add package.json package-lock.json
git commit -m "chore(phase-3): add dnd-kit + date-fns"
```

---

## Task 1: Migration 0009 — Location / Set + scene.set_id

**Files:** Create `supabase/migrations/0009_locations_sets.sql`; modify `lib/db/types.ts`; create `lib/schedule/data.test.ts` (RLS harness + smoke).

- [ ] **Step 1: Write the migration.** Reference `0005_breakdown_graph.sql` for the exact RLS/grant/trigger style.

```sql
-- ============================================================================
-- Phase 3: Location -> Set hierarchy; scenes resolve to a Set.
-- ============================================================================
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  address text,
  geo_lat numeric,
  geo_lng numeric,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scenes add column set_id uuid references public.sets(id) on delete set null;

create index locations_project_id_idx on public.locations(project_id);
create index sets_project_id_idx on public.sets(project_id);
create index sets_location_id_idx on public.sets(location_id);
create index scenes_set_id_idx on public.scenes(set_id);

alter table public.locations enable row level security;
alter table public.sets enable row level security;

-- locations: project-scoped (4 policies)
create policy "locations - select" on public.locations for select using (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
create policy "locations - insert" on public.locations for insert with check (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
create policy "locations - update" on public.locations for update using (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
create policy "locations - delete" on public.locations for delete using (exists (select 1 from public.projects p where p.id = locations.project_id and p.owner_id = auth.uid()));
-- sets: project-scoped (4 policies)
create policy "sets - select" on public.sets for select using (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));
create policy "sets - insert" on public.sets for insert with check (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));
create policy "sets - update" on public.sets for update using (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));
create policy "sets - delete" on public.sets for delete using (exists (select 1 from public.projects p where p.id = sets.project_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.sets to authenticated;
create trigger locations_set_updated_at before update on public.locations for each row execute function extensions.moddatetime(updated_at);
create trigger sets_set_updated_at before update on public.sets for each row execute function extensions.moddatetime(updated_at);

-- Harden the scenes UPDATE policy so set_id must also belong to the caller's project
-- (the 0004 two-FK lesson: scenes.set_id is a new cross-entity FK).
drop policy "scenes - update" on public.scenes;
create policy "scenes - update" on public.scenes for update using (
  exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = scenes.project_id and p.owner_id = auth.uid())
  and (set_id is null or exists (select 1 from public.sets s join public.projects p2 on p2.id = s.project_id where s.id = scenes.set_id and p2.owner_id = auth.uid()))
);
```

- [ ] **Step 2: Apply + regen types.** `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts`; confirm line 1 is `export type Json =` and `locations`/`sets`/`scenes.set_id` appear.

- [ ] **Step 3: Create `lib/schedule/data.test.ts`** — copy the harness header (lines ~1-30) from `lib/breakdown/data.test.ts` (`makeUser`, `newProject`, the `url/anon/service` consts), then:
```ts
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("schedule: locations/sets RLS (0009)", () => {
  let alice: SupabaseClient<Database>, bob: SupabaseClient<Database>, project: string;
  beforeAll(async () => { alice = await makeUser(`alice-${crypto.randomUUID()}@t.dev`); bob = await makeUser(`bob-${crypto.randomUUID()}@t.dev`); project = await newProject(alice); });
  it("owner creates a location+set; another user can't see them", async () => {
    const { data: loc } = await alice.from("locations").insert({ project_id: project, name: "Diner Bldg", timezone: "America/New_York" }).select("id").single();
    const { data: set } = await alice.from("sets").insert({ project_id: project, location_id: loc!.id, name: "DINER" }).select("id").single();
    expect((await bob.from("sets").select("*").eq("id", set!.id)).data ?? []).toHaveLength(0);
  });
  it("blocks pointing your scene's set_id at another user's set (hardened scenes UPDATE)", async () => {
    const { data: aliceSet } = await alice.from("sets").insert({ project_id: project, name: "ALICE SET" }).select("id").single();
    const bobProject = await newProject(bob);
    const { data: bobScript } = await bob.from("scripts").insert({ project_id: bobProject, title: "B" }).select("id").single();
    const { data: bobScene } = await bob.from("scenes").insert({ project_id: bobProject, script_id: bobScript!.id, ordinal: 0, status: "active" }).select("id").single();
    const { error } = await bob.from("scenes").update({ set_id: aliceSet!.id }).eq("id", bobScene!.id);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });
});
```

- [ ] **Step 4: Run + verify pass.** `npx dotenv -e .env.local -- npm test -- lib/schedule/data.test.ts`
- [ ] **Step 5: Typecheck + commit.**
```bash
git add supabase/migrations/0009_locations_sets.sql lib/db/types.ts lib/schedule/data.test.ts
git commit -m "feat(phase-3): migration 0009 locations/sets + scenes.set_id (two-FK RLS)"
```

---

## Task 2: Migration 0010 — SceneSegment

**Files:** `supabase/migrations/0010_scene_segments.sql`; `lib/db/types.ts`; extend `lib/schedule/data.test.ts`.

- [ ] **Step 1: Migration.**
```sql
-- ============================================================================
-- Phase 3: SceneSegment — the schedulable unit (eighths). Default = full scene.
-- ============================================================================
create table public.scene_segments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  ordinal int not null default 0,
  page_eighths int not null default 0,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scene_segments_project_id_idx on public.scene_segments(project_id);
create index scene_segments_scene_id_idx on public.scene_segments(scene_id);

alter table public.scene_segments enable row level security;
create policy "scene_segments - select" on public.scene_segments for select using (exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid()));
create policy "scene_segments - insert" on public.scene_segments for insert with check (
  exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.scenes sc join public.projects p2 on p2.id = sc.project_id where sc.id = scene_segments.scene_id and p2.owner_id = auth.uid()));
create policy "scene_segments - update" on public.scene_segments for update using (
  exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.scenes sc join public.projects p2 on p2.id = sc.project_id where sc.id = scene_segments.scene_id and p2.owner_id = auth.uid()));
create policy "scene_segments - delete" on public.scene_segments for delete using (exists (select 1 from public.projects p where p.id = scene_segments.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.scene_segments to authenticated;
create trigger scene_segments_set_updated_at before update on public.scene_segments for each row execute function extensions.moddatetime(updated_at);
```
- [ ] **Step 2:** Apply + regen types (+ stray-line check).
- [ ] **Step 3: Test** (append): owner creates a segment for their scene; cross-project scene_id is denied (42501).
```ts
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("scene_segments RLS (0010)", () => {
  it("a segment requires a scene in the caller's project", async () => {
    const alice = await makeUser(`alice-${crypto.randomUUID()}@t.dev`); const project = await newProject(alice);
    const { data: script } = await alice.from("scripts").insert({ project_id: project, title: "S" }).select("id").single();
    const { data: scene } = await alice.from("scenes").insert({ project_id: project, script_id: script!.id, ordinal: 0, status: "active", page_eighths: 8 }).select("id").single();
    const { data: seg, error } = await alice.from("scene_segments").insert({ project_id: project, scene_id: scene!.id, ordinal: 0, page_eighths: 8 }).select("id").single();
    expect(error).toBeNull(); expect(seg!.id).toBeTruthy();
  });
});
```
- [ ] **Step 4-5:** Run, verify pass; commit `feat(phase-3): migration 0010 scene_segments + RLS`.

---

## Task 3: Migration 0011 — ShootDay + Strip (two-FK RLS)

**Files:** `supabase/migrations/0011_shoot_days_strips.sql`; `lib/db/types.ts`; extend test.

- [ ] **Step 1: Migration.** `strips` has TWO cross-entity FKs (`shoot_day_id` + `scene_segment_id`) → validate both.
```sql
-- ============================================================================
-- Phase 3: ShootDay (per-unit, optional date) + Strip (scene/day_break/banner).
-- ============================================================================
create table public.shoot_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date,
  day_type text not null default 'shoot' check (day_type in ('prep','prelight','build','shoot','strike','travel','wrap')),
  unit text not null default 'main' check (unit in ('main','second','splinter')),
  studio_or_location text check (studio_or_location in ('studio','location')),
  ordinal int not null default 0,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.strips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  ordinal int not null default 0,
  type text not null default 'scene' check (type in ('scene','day_break','banner')),
  scene_segment_id uuid references public.scene_segments(id) on delete cascade,
  banner_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shoot_days_project_id_idx on public.shoot_days(project_id);
create index shoot_days_date_idx on public.shoot_days(date);
create index strips_project_id_idx on public.strips(project_id);
create index strips_shoot_day_id_idx on public.strips(shoot_day_id);
create index strips_scene_segment_id_idx on public.strips(scene_segment_id);

alter table public.shoot_days enable row level security;
alter table public.strips enable row level security;
-- shoot_days: project-scoped 4 policies
create policy "shoot_days - select" on public.shoot_days for select using (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
create policy "shoot_days - insert" on public.shoot_days for insert with check (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
create policy "shoot_days - update" on public.shoot_days for update using (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
create policy "shoot_days - delete" on public.shoot_days for delete using (exists (select 1 from public.projects p where p.id = shoot_days.project_id and p.owner_id = auth.uid()));
-- strips: BOTH shoot_day_id and scene_segment_id (when present) must belong to the caller.
create policy "strips - select" on public.strips for select using (exists (select 1 from public.projects p where p.id = strips.project_id and p.owner_id = auth.uid()));
create policy "strips - insert" on public.strips for insert with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = strips.shoot_day_id and p.owner_id = auth.uid())
  and (scene_segment_id is null or exists (select 1 from public.scene_segments sg join public.projects p2 on p2.id = sg.project_id where sg.id = strips.scene_segment_id and p2.owner_id = auth.uid())));
create policy "strips - update" on public.strips for update using (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = strips.shoot_day_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.shoot_days d join public.projects p on p.id = d.project_id where d.id = strips.shoot_day_id and p.owner_id = auth.uid())
  and (scene_segment_id is null or exists (select 1 from public.scene_segments sg join public.projects p2 on p2.id = sg.project_id where sg.id = strips.scene_segment_id and p2.owner_id = auth.uid())));
create policy "strips - delete" on public.strips for delete using (exists (select 1 from public.projects p where p.id = strips.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.shoot_days to authenticated;
grant select, insert, update, delete on public.strips to authenticated;
create trigger shoot_days_set_updated_at before update on public.shoot_days for each row execute function extensions.moddatetime(updated_at);
create trigger strips_set_updated_at before update on public.strips for each row execute function extensions.moddatetime(updated_at);
```
- [ ] **Step 2:** Apply + regen types.
- [ ] **Step 3: Two-FK escape test** (append): Bob creates his own shoot_day; tries to attach a strip referencing ALICE's scene_segment → denied (42501). (Mirror the 0006 escape test shape from `lib/breakdown/data.test.ts`.)
- [ ] **Step 4-5:** Run, verify pass (assert `error.code === "42501"`); commit `feat(phase-3): migration 0011 shoot_days + strips (two-FK RLS) + escape test`.

---

## Task 4: Migration 0012 — CastDayStatus (overrides)

**Files:** `supabase/migrations/0012_cast_day_statuses.sql`; `lib/db/types.ts`; extend test.

- [ ] **Step 1: Migration.**
```sql
-- ============================================================================
-- Phase 3: CastDayStatus — persisted DOOD OVERRIDES only (derived merged on read).
-- ============================================================================
create table public.cast_day_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  date date not null,
  status text not null check (status in ('work','hold','start','finish','travel','drop','pickup','idle')),
  source text not null default 'override' check (source in ('override')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, date)
);
create index cast_day_statuses_project_id_idx on public.cast_day_statuses(project_id);
create index cast_day_statuses_person_id_idx on public.cast_day_statuses(person_id);
alter table public.cast_day_statuses enable row level security;
create policy "cast_day_statuses - select" on public.cast_day_statuses for select using (exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid()));
create policy "cast_day_statuses - insert" on public.cast_day_statuses for insert with check (
  exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_statuses.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_statuses - update" on public.cast_day_statuses for update using (
  exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid())
  and exists (select 1 from public.people pe join public.projects p2 on p2.id = pe.project_id where pe.id = cast_day_statuses.person_id and p2.owner_id = auth.uid()));
create policy "cast_day_statuses - delete" on public.cast_day_statuses for delete using (exists (select 1 from public.projects p where p.id = cast_day_statuses.project_id and p.owner_id = auth.uid()));
grant select, insert, update, delete on public.cast_day_statuses to authenticated;
create trigger cast_day_statuses_set_updated_at before update on public.cast_day_statuses for each row execute function extensions.moddatetime(updated_at);
```
- [ ] **Step 2-5:** Apply + regen; test (owner upserts an override; isolation); commit `feat(phase-3): migration 0012 cast_day_statuses + RLS`. After this task run `npx supabase db reset` once to confirm 0001→0012 replay clean.

---

## Task 5: `lib/schedule/schema.ts` — typed contract

**Files:** Create `lib/schedule/schema.ts`, `lib/schedule/schema.test.ts`.

- [ ] **Step 1: Write failing tests** covering enums + a row + the DOOD code type:
```ts
import { describe, it, expect } from "vitest";
import { dayType, unit, stripType, doodCode, shootDay, createShootDayInput } from "@/lib/schedule/schema";
describe("schedule schema", () => {
  it("enums reject junk", () => {
    expect(unit.safeParse("aerial").success).toBe(false);
    expect(dayType.safeParse("party").success).toBe(false);
    expect(stripType.safeParse("scene").success).toBe(true);
    expect(doodCode.safeParse("SWF").success).toBe(true);
    expect(doodCode.safeParse("ZZ").success).toBe(false);
  });
  it("createShootDayInput requires project + valid unit/day_type with defaults", () => {
    const r = createShootDayInput.parse({ projectId: crypto.randomUUID() });
    expect(r.unit).toBe("main"); expect(r.dayType).toBe("shoot");
  });
});
```
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement `lib/schedule/schema.ts`** (mirror `lib/breakdown/schema.ts` conventions — loose strings on read rows, strict enums on write):
```ts
import { z } from "zod";

export const dayType = z.enum(["prep","prelight","build","shoot","strike","travel","wrap"]);
export const unit = z.enum(["main","second","splinter"]);
export const stripType = z.enum(["scene","day_break","banner"]);
export const castStatus = z.enum(["work","hold","start","finish","travel","drop","pickup","idle"]);
export const doodCode = z.enum(["S","W","F","SW","WF","SWF","H","D","P","T","O","I"]);
export type DoodCode = z.infer<typeof doodCode>;

// read rows (loose where DB is text)
export const location = z.object({ id: z.uuid(), project_id: z.uuid(), name: z.string(), address: z.string().nullable(), geo_lat: z.number().nullable(), geo_lng: z.number().nullable(), timezone: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export const set_ = z.object({ id: z.uuid(), project_id: z.uuid(), location_id: z.uuid().nullable(), name: z.string(), created_at: z.string(), updated_at: z.string() });
export const sceneSegment = z.object({ id: z.uuid(), project_id: z.uuid(), scene_id: z.uuid(), ordinal: z.number().int(), page_eighths: z.number().int(), label: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export const shootDay = z.object({ id: z.uuid(), project_id: z.uuid(), date: z.string().nullable(), day_type: z.string(), unit: z.string(), studio_or_location: z.string().nullable(), ordinal: z.number().int(), name: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export const strip = z.object({ id: z.uuid(), project_id: z.uuid(), shoot_day_id: z.uuid(), ordinal: z.number().int(), type: z.string(), scene_segment_id: z.uuid().nullable(), banner_text: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export const castDayStatus = z.object({ id: z.uuid(), project_id: z.uuid(), person_id: z.uuid(), date: z.string(), status: z.string(), source: z.string(), note: z.string().nullable(), created_at: z.string(), updated_at: z.string() });
export type Location = z.infer<typeof location>; export type Set_ = z.infer<typeof set_>; export type SceneSegment = z.infer<typeof sceneSegment>; export type ShootDay = z.infer<typeof shootDay>; export type Strip = z.infer<typeof strip>; export type CastDayStatus = z.infer<typeof castDayStatus>;

// write inputs
export const createLocationInput = z.object({ projectId: z.uuid(), name: z.string().trim().min(1).max(200), address: z.string().trim().max(500).nullable().default(null), timezone: z.string().trim().max(64).nullable().default(null) });
export const createSetInput = z.object({ projectId: z.uuid(), name: z.string().trim().min(1).max(200), locationId: z.uuid().nullable().default(null) });
export const createShootDayInput = z.object({ projectId: z.uuid(), dayType: dayType.default("shoot"), unit: unit.default("main"), date: z.string().nullable().default(null), ordinal: z.number().int().default(0), name: z.string().trim().max(120).nullable().default(null) });
export const splitSegmentInput = z.object({ projectId: z.uuid(), sceneId: z.uuid(), eighths: z.array(z.number().int().positive()).min(2) }); // partition sums validated in data layer
export const setCastOverrideInput = z.object({ projectId: z.uuid(), personId: z.uuid(), date: z.string(), status: castStatus, note: z.string().trim().max(500).nullable().default(null) });
export type CreateShootDayInput = z.infer<typeof createShootDayInput>;

// derived-result types (engine outputs — not persisted)
export interface EighthsRollup { shootDayId: string; eighths: number }
export type ConflictType = "cast" | "element" | "cast_status";
export interface Conflict { type: ConflictType; date: string; unit?: string | null; resourceId: string; resourceLabel?: string; segmentIds: string[]; detail?: string }
export interface DoodEntry { personId: string; date: string; code: DoodCode; source: "derived" | "override" }
export interface CompanyMove { date: string; fromSetId: string; toSetId: string }
```
- [ ] **Step 4-5:** Run → pass; typecheck; commit `feat(phase-3): schedule Zod contract + derived-result types`.

---

## Task 6: `lib/schedule/data.ts` — CRUD + slug→Set auto-map

**Files:** Create `lib/schedule/data.ts`; extend `lib/schedule/data.test.ts`.

- [ ] **Step 1: Failing tests** for: `createShootDay`, `listShootDays`, `createStrip`/`listStrips`, `getOrCreateDefaultSegment` (lazy default), `ensureSetForSlug` (auto-map distinct `location_slug` → one Set + assign scene.set_id), `setCastOverride`/`listCastOverrides`. (Use the harness; seed a script + scene.) Example assertions:
```ts
it("getOrCreateDefaultSegment is idempotent and uses the scene's eighths", async () => {
  const seg1 = await getOrCreateDefaultSegment(alice as never, { projectId: project, sceneId });
  const seg2 = await getOrCreateDefaultSegment(alice as never, { projectId: project, sceneId });
  expect(seg1.id).toBe(seg2.id); expect(seg1.page_eighths).toBe(8);
});
it("ensureSetForSlug creates one Set per distinct slug and assigns scene.set_id", async () => {
  const set = await ensureSetForSlug(alice as never, { projectId: project, sceneId, slug: "DINER" });
  expect(set.name).toBe("DINER");
  const again = await ensureSetForSlug(alice as never, { projectId: project, sceneId, slug: "DINER" });
  expect(again.id).toBe(set.id); // reused
});
```
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement** (mirror `lib/breakdown/data.ts`: `type DbClient = SupabaseClient<Database>`, parse-on-read, `throw new Error(msg,{cause})`, write inputs parsed). Functions: `createLocation/listLocations`, `createSet/listSets`, `getOrCreateDefaultSegment` (read segments for scene; if none, insert ordinal 0 with `page_eighths` = the scene's `page_eighths ?? 0`), `splitSegment` (replace the scene's segments with N summing to the scene's eighths — validate sum), `ensureSetForSlug` (find a Set named = slug in project; create if missing; `update scenes set set_id`), `createShootDay/listShootDays/updateShootDay`, `createStrip/listStrips/reorderStrips` (bulk ordinal update), `deleteStrip`, `setCastOverride` (upsert on (person_id,date))/`listCastOverrides`. Keep each function small.
- [ ] **Step 4-5:** Run → pass; typecheck; commit `feat(phase-3): schedule data layer — CRUD + lazy segment + slug→Set auto-map`.

---

## Task 7: `lib/schedule/data.ts` — graph-slice loader

**Files:** Modify `lib/schedule/data.ts`; extend test.

- [ ] **Step 1: Failing test:** `loadScheduleGraph(client, projectId)` returns the plain-data slice the pure engine needs: `{ shootDays, strips, segments, scenes (id,set_id), sets, locations, sceneCharactersConfirmed:[{scene_id,character_id}], characters:[{id,cast_person_id}], sceneElementsConfirmed:[{scene_id,element_id}], castOverrides }`. Assert it only includes `status='confirmed'` breakdown (the Phase-2 gate) and is project-scoped.
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement `loadScheduleGraph`** — a handful of project-scoped selects (shoot_days, strips, scene_segments, scenes(id,set_id,location_slug), sets, locations, cast_day_statuses) + the confirmed-only breakdown reads (`scene_elements`/`scene_characters` filtered `eq("status","confirmed")`, joined to scenes in this project's scripts) + characters(id, cast_person_id). Return plain objects (parse rows). This is the ONLY place the engine's input is assembled.
- [ ] **Step 4-5:** Run → pass; commit `feat(phase-3): loadScheduleGraph slice (confirmed-only) for the derivation engine`.

---

## Task 8: `derive/eighths.ts` — page-eighths rollup (pure)

**Files:** Create `lib/schedule/derive/eighths.ts`, `lib/schedule/derive/eighths.test.ts`.

- [ ] **Step 1: Failing test.**
```ts
import { computeEighthsRollup } from "@/lib/schedule/derive/eighths";
it("sums segment eighths per shoot day from scene strips", () => {
  const strips = [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "s1" }, { shoot_day_id: "d1", type: "scene", scene_segment_id: "s2" }, { shoot_day_id: "d1", type: "day_break", scene_segment_id: null }, { shoot_day_id: "d2", type: "scene", scene_segment_id: "s3" }];
  const segments = [{ id: "s1", page_eighths: 8 }, { id: "s2", page_eighths: 4 }, { id: "s3", page_eighths: 2 }];
  const r = computeEighthsRollup(strips as never, segments as never);
  expect(r.find(x => x.shootDayId === "d1")!.eighths).toBe(12);
  expect(r.find(x => x.shootDayId === "d2")!.eighths).toBe(2);
});
```
- [ ] **Step 2-4:** Implement: build `Map<segId, eighths>`; for each `type==='scene'` strip with a segment, add to its day's total; return `EighthsRollup[]`. Pure. Run → pass.
- [ ] **Step 5:** commit `feat(phase-3): derive computeEighthsRollup (pure)`.

---

## Task 9: `derive/conflicts.ts` — conflict detection (pure, group-by)

**Files:** Create `lib/schedule/derive/conflicts.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests** — cast cross-unit double-book; element double-book; resolve clears; cast on override hold:
```ts
import { computeConflicts } from "@/lib/schedule/derive/conflicts";
const base = {
  shootDays: [{ id: "d1", date: "2026-07-01", unit: "main" }, { id: "d2", date: "2026-07-01", unit: "second" }, { id: "d3", date: "2026-07-02", unit: "main" }],
  strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }, { shoot_day_id: "d2", type: "scene", scene_segment_id: "g2" }],
  segments: [{ id: "g1", scene_id: "sc1" }, { id: "g2", scene_id: "sc2" }],
  scenes: [{ id: "sc1", set_id: null }, { id: "sc2", set_id: null }],
  sceneCharactersConfirmed: [{ scene_id: "sc1", character_id: "ch1" }, { scene_id: "sc2", character_id: "ch1" }],
  characters: [{ id: "ch1", cast_person_id: "p1" }],
  sceneElementsConfirmed: [], castOverrides: [],
};
it("flags a cast member needed in two units on the same date (cross-unit)", () => {
  const c = computeConflicts(base as never);
  const cast = c.filter(x => x.type === "cast" && x.resourceId === "p1");
  expect(cast).toHaveLength(1);
  expect(cast[0].date).toBe("2026-07-01");
  expect(cast[0].segmentIds.sort()).toEqual(["g1", "g2"]);
});
it("clears when one segment moves to another date", () => {
  const moved = { ...base, strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }, { shoot_day_id: "d3", type: "scene", scene_segment_id: "g2" }] };
  expect(computeConflicts(moved as never).filter(x => x.type === "cast")).toHaveLength(0);
});
it("flags an actor scheduled on an override hold day", () => {
  const withHold = { ...base, strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }], sceneCharactersConfirmed: [{ scene_id: "sc1", character_id: "ch1" }], castOverrides: [{ person_id: "p1", date: "2026-07-01", status: "hold" }] };
  expect(computeConflicts(withHold as never).some(x => x.type === "cast_status" && x.resourceId === "p1")).toBe(true);
});
```
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement** — index `dayById`, `segById→scene`, `sceneCharsByScene`, `castPersonByCharacter`, `sceneElementsByScene`. Build `byDate: Map<dateISO, { persons: Map<personId, {segIds:Set, units:Set}>, elements: Map<elementId, {segIds:Set, units:Set}> }>` by walking `type==='scene'` strips on **dated** days → segment → scene → confirmed cast persons + confirmed elements. Emit a `cast` conflict for any person with `segIds.size ≥ 2`; an `element` conflict for any element with `segIds.size ≥ 2` (`unit` set null if multiple). Emit a `cast_status` conflict for any (person, date) where the person has a derived work day (appears in byDate persons) AND an override status in `{hold,travel,drop,idle}`. Pure.
- [ ] **Step 4-5:** Run → pass; commit `feat(phase-3): derive computeConflicts (pure group-by; cross-unit + override)`.

---

## Task 10: `derive/dood.ts` — Day-Out-of-Days (pure; EP/MMS rules)

**Files:** Create `lib/schedule/derive/dood.ts`, `.test.ts`.

> Implement the EP/MMS rules from the research doc. Inputs: per-person work dates (derived from scheduled segments' confirmed characters cast to a person, + `day_type='travel'` days), the sorted distinct shoot dates, `companyOffDays: Set<dateISO>`, `config { allowHoldDays, allowDropPickup, minDropPickupCalendarDays }`, and `overrides`. Output: `DoodEntry[]`.

- [ ] **Step 1: Failing tests** (the rule table):
```ts
import { computeDOOD } from "@/lib/schedule/derive/dood";
const graph = {
  shootDays: [
    { id: "d1", date: "2026-07-01", unit: "main", day_type: "shoot" },
    { id: "d2", date: "2026-07-02", unit: "main", day_type: "shoot" },
    { id: "d3", date: "2026-07-03", unit: "main", day_type: "shoot" },
    { id: "d4", date: "2026-07-04", unit: "main", day_type: "shoot" },
    { id: "d5", date: "2026-07-05", unit: "main", day_type: "shoot" },
  ],
  strips: [
    { shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" },
    { shoot_day_id: "d5", type: "scene", scene_segment_id: "g2" },
  ],
  segments: [{ id: "g1", scene_id: "sc1" }, { id: "g2", scene_id: "sc1" }],
  sceneCharactersConfirmed: [{ scene_id: "sc1", character_id: "ch1" }],
  characters: [{ id: "ch1", cast_person_id: "p1" }],
  castOverrides: [],
  companyOffDays: [],
};
const cfg = { allowHoldDays: true, allowDropPickup: false, minDropPickupCalendarDays: 2 };
it("derives SW / H / WF across a work span (hold on)", () => {
  const d = computeDOOD(graph as never, cfg);
  const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
  expect(byDate["2026-07-01"]).toBe("SW");
  expect(byDate["2026-07-02"]).toBe("H");
  expect(byDate["2026-07-03"]).toBe("H");
  expect(byDate["2026-07-04"]).toBe("H");
  expect(byDate["2026-07-05"]).toBe("WF");
});
it("single work day renders SWF", () => {
  const g2 = { ...graph, strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }], segments: [{ id: "g1", scene_id: "sc1" }] };
  const d = computeDOOD(g2 as never, cfg);
  expect(d.find(e => e.personId === "p1" && e.date === "2026-07-01")!.code).toBe("SWF");
});
it("excludes company-off days from Hold", () => {
  const d = computeDOOD({ ...graph, companyOffDays: ["2026-07-03"] } as never, cfg);
  expect(d.find(e => e.personId === "p1" && e.date === "2026-07-03")).toBeUndefined(); // off day → no DOOD cell (or 'O')
});
it("drop/pickup when enabled and the gap meets the configurable minimum", () => {
  const d = computeDOOD(graph as never, { allowHoldDays: true, allowDropPickup: true, minDropPickupCalendarDays: 2 });
  const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
  expect(byDate["2026-07-01"]).toBe("SW");
  expect(byDate["2026-07-03"]).toBe("D");     // gap (3 non-work days >= 2) -> dropped
  expect(byDate["2026-07-05"]).toBe("P");     // resumes -> pickup
  expect(byDate["2026-07-02"]).toBeUndefined(); // released, not held
});
it("an override wins and is marked", () => {
  const d = computeDOOD({ ...graph, castOverrides: [{ person_id: "p1", date: "2026-07-02", status: "travel" }] } as never, cfg);
  const cell = d.find(e => e.personId === "p1" && e.date === "2026-07-02")!;
  expect(cell.code).toBe("T"); expect(cell.source).toBe("override");
});
```
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement** the algorithm (pure):
  1. Build `workDatesByPerson: Map<personId, Set<dateISO>>` — for each `type==='scene'` strip on a dated day → segment → scene → confirmed characters → `cast_person_id`; add the day's date. Also add `day_type==='travel'` days for any person already working in the span (v1: treat travel days as work-equivalent only via override; keep derivation from segments — note in a comment).
  2. For each person: `work = sorted(workDates)`. If empty, skip. `first = work[0]`, `last = work[last]`.
  3. Walk every calendar date from `first` to `last` (use `date-fns eachDayOfInterval`):
     - if it's a work date → `W` (then post-process: first→`SW`, last→`WF`, if first===last→`SWF`);
     - else if `companyOffDays.has(date)` → skip (no cell) or `O`;
     - else (non-work gap day): collect into the current gap run.
  4. Gap handling: for each maximal non-work, non-off gap run inside `[first,last]`:
     - if `allowDropPickup` AND `run.calendarLength >= minDropPickupCalendarDays` → mark the FIRST gap day `D`; the work day that RESUMES after the run → `P` (overrides its `W`/inner code; the pre-gap work day keeps its code); the remaining gap days get NO cell (released).
     - else if `allowHoldDays` → every gap day → `H`.
     - else → no cell.
  5. Merge overrides last: for each override (person,date) in range, set that cell's `code` to the status's code (`work→W, hold→H, travel→T, start→S, finish→F, drop→D, pickup→P, idle→I`) and `source='override'` (override wins over derived).
  6. Return `DoodEntry[]`. Render SW/WF/SWF only for derived (overrides use their direct code).
  Use `date-fns` for date iteration/diffing; the function takes only data (no `Date.now`).
- [ ] **Step 4: Run → pass.** If a rule case is ambiguous, encode the research-doc rule and keep the test asserting it; do NOT weaken a test to pass.
- [ ] **Step 5:** commit `feat(phase-3): derive computeDOOD (pure; EP/MMS rules + overrides)`.

---

## Task 11: `derive/moves.ts` — company-move detection (pure)

**Files:** Create `lib/schedule/derive/moves.ts`, `.test.ts`.

- [ ] **Step 1: Failing test** — consecutive scene strips (in board order) whose scenes resolve to Sets at different parent Locations → a move; same Location → none.
- [ ] **Step 2-4: Implement** — walk strips in (shoot_day ordinal, strip ordinal) order; for each `type==='scene'` strip resolve segment→scene→`set_id`→`location_id`; when the location_id changes between consecutive scene strips, emit a `CompanyMove { date, fromSetId, toSetId }`. Pure. Run → pass.
- [ ] **Step 5:** commit `feat(phase-3): derive computeCompanyMoves (pure)`.

---

## Task 12: `lib/schedule/data.ts` — engine-wiring read fns

**Files:** Modify `lib/schedule/data.ts`; extend test (live-DB integration).

- [ ] **Step 1: Failing test** — seed a script+scene+segment+shoot day+strip + confirmed cast; `getStripboard`, `getConflicts`, `getDOOD` return engine output over the loaded graph.
- [ ] **Step 2-4: Implement** thin wrappers: each loads the slice via `loadScheduleGraph` then calls the pure engine: `getStripboard(client, projectId)` → `{ shootDays, stripsByDay, eighths: computeEighthsRollup(...), moves: computeCompanyMoves(...) }`; `getConflicts(client, projectId)` → `computeConflicts(graph)`; `getDOOD(client, projectId, config?)` → `computeDOOD(graph, config ?? defaults)`; `getCalendar(client, projectId)` → dated shoot days for the month grid. Defaults: `{ allowHoldDays: true, allowDropPickup: false, minDropPickupCalendarDays: 2 }`. Run → pass.
- [ ] **Step 5:** commit `feat(phase-3): wire derivation engine into read fns (stripboard/conflicts/dood/calendar)`.

---

## Task 13: Server actions

**Files:** Create `app/dashboard/[projectId]/schedule/actions.ts`.

- [ ] **Step 1-4:** `"use server"` module, each action Zod-parses FormData, calls the data layer with the SSR client (`@/lib/supabase/server`), `revalidatePath`. Actions: `createShootDayAction`, `setShootDayDateAction`, `addSceneToDayAction` (calls `getOrCreateDefaultSegment` then `createStrip`), `reorderStripsAction` (parse an ordered id list), `splitSceneAction`, `insertDayBreakAction`/`insertBannerAction`, `deleteStripAction`, `setCastOverrideAction`, `createLocationAction`/`createSetAction`/`mapSlugToSetAction`. Export ONLY local async fns (grep `export {` → empty). No dedicated unit test (covered by data-layer + the browser smoke); ensure `npm run typecheck` + `npm run build` pass.
- [ ] **Step 5:** commit `feat(phase-3): schedule server actions (Zod-parsed)`.

---

## Task 14: Stripboard UI (dnd-kit)

**Files:** Create `app/dashboard/[projectId]/schedule/page.tsx`, `components/schedule/{stripboard,shoot-day,strip}.tsx`. Port look/interaction from `legacy/components/projectmodules/Schedule` only as a visual hint; wire to real data + the design system.

- [ ] **Step 1-4:** Server `page.tsx` fetches `getStripboard(projectId)`; renders ShootDays (ordered) each with its ordered Strips + the eighths rollup. A client `Stripboard` uses `@dnd-kit/core` + `@dnd-kit/sortable` **multiple-containers** pattern (days = containers, strips = sortable items) → on drag end, call `reorderStripsAction` with the new order. **Day-breaks/banners are rendered as non-scene strips that MUST be preserved on reorder** (they're real Strip rows with ordinals — reordering scene strips around them keeps them; never drop them). "Add scene to day" control → `addSceneToDayAction`; date assignment via a native `<input type="date">` → `setShootDayDateAction`. Use design tokens; no hardcoded colors (strip color derived from INT/EXT × time via a small configurable palette helper). Verify `npm run lint/typecheck/build`.
- [ ] **Step 5:** commit `feat(phase-3): stripboard UI (dnd-kit nested sortable; day-breaks preserved)`.

---

## Task 15: Conflict panel + DOOD grid

**Files:** Create `components/schedule/{conflict-panel,dood-grid}.tsx`; extend `page.tsx`.

- [ ] **Step 1-4:** `ConflictPanel` renders `getConflicts(projectId)` grouped by date/type (cast/element/cast_status), with the resource label + the offending segments. `DoodGrid` renders `getDOOD(projectId)` as **cast rows × dated-day columns**, each cell showing the code (SW/W/H/WF/SWF/D/P/T), override cells visually marked; a cell action sets an override via `setCastOverrideAction`. Read-only derivation; overrides are the only writes. `npm run lint/typecheck/build`.
- [ ] **Step 5:** commit `feat(phase-3): conflict panel + DOOD grid (cast rows × day columns, override-aware)`.

---

## Task 16: Read-only calendar view (month grid)

**Files:** Create `components/schedule/calendar-view.tsx`; extend `page.tsx` (a tab/toggle).

- [ ] **Step 1-4:** A **read-only** month grid built with `date-fns` (`startOfMonth`/`endOfMonth`/`eachDayOfInterval`/`startOfWeek`): render the month, place each dated ShootDay (from `getCalendar`) on its date, color-coded by `unit`/`day_type` (via the same configurable palette), click-through to that day on the stripboard. No drag/edit (date edits live on the stripboard). Add a small pure unit test for the month-grid date helper (e.g. `monthMatrix(year, month)` returns 6×7 dates) if you extract one. `npm run lint/typecheck/build`.
- [ ] **Step 5:** commit `feat(phase-3): read-only month-grid calendar view of shoot days`.

---

## Task 17: ⭐ Cross-module integration test + browser smoke

**Files:** Create `lib/schedule/integration.test.ts`.

- [ ] **Step 1-4: The thesis test** (live-DB, two-user harness): seed a project with two scenes sharing a character, schedule both segments on the SAME date in DIFFERENT units, **confirm** the shared character on both scenes' breakdown (insert `scene_characters` `status='confirmed'` + a `characters.cast_person_id`), then assert `getConflicts(projectId)` reports a cross-unit cast conflict; flip one scene's tag to `rejected` (or move a strip to another date) and assert the conflict **clears** — proving the schedule derives from confirmed breakdown with no sync step. Also assert `getDOOD` reflects the cast member's work days. Run → pass.
- [ ] **Step 5: Browser smoke** (per the Phase-2 playbook — native-setter for controlled inputs; pre-create a confirmed user; localhost:3000): sign in → open a project with an imported+broken-down script → open Schedule → create a ShootDay → drag a scene onto it (segment+strip created) → assign a date → confirm a shared cast member appears as a conflict + in the DOOD grid → check the calendar view shows the dated day. Confirm `"use server"` actions resolve at runtime (no manifest 404). Record results. Commit `test(phase-3): cross-module integration (breakdown→schedule derivation) + smoke notes`.

---

## Task 18: Final verification + branch finish

- [ ] **Step 1:** Full green: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`.
- [ ] **Step 2:** `npx supabase db reset` (replay 0001→0012 clean) → re-run the suite.
- [ ] **Step 3:** `npm run build` passes; `rm -rf node_modules && npm ci` succeeds (CI lock sanity — the Phase-2 lesson).
- [ ] **Step 4:** Walk the spec §"Done criteria"; confirm each is demonstrable.
- [ ] **Step 5:** Use `superpowers:finishing-a-development-branch`. **Do NOT merge without the user's explicit go** (merge auto-deploys + auto-applies 0009–0012 to hosted Supabase). After an approved merge, verify the merge commit's checks green (`gh ... /check-runs` + the Vercel + Supabase statuses), exactly as in Phase 2.

---

## Self-Review (plan vs spec)

- **Spec coverage:** data model 0009–0012 (T1–4) · SceneSegment lazy default (T6) · slug→Set auto-map (T6) · pure engine eighths/conflicts/DOOD/moves (T8–11) · derived-on-read read-fns (T12) · DOOD overrides persisted + merged (T4/T10/T12) · conflict scope cast+element+cross-unit+override (T9) · stripboard + day-break preservation (T14) · DOOD grid cast×day (T15) · read-only calendar (T16) · cross-module thesis test (T17) · two-user RLS + two-FK escapes (T1/T3) · configurable strip colors via palette helper (T14/T16) · timezone seam (Location.timezone, ShootDay.date as date — T1/T3). **All mapped.**
- **Deferred honored:** segment-level breakdown, `.ics`, Google sync, sun/weather, virtualization, derivation caching — none built.
- **Type consistency:** `EighthsRollup/Conflict/DoodEntry/CompanyMove`, `computeEighthsRollup/computeConflicts/computeDOOD/computeCompanyMoves`, `loadScheduleGraph`, `getOrCreateDefaultSegment/ensureSetForSlug`, `getStripboard/getConflicts/getDOOD/getCalendar`, DOOD config `{allowHoldDays,allowDropPickup,minDropPickupCalendarDays}` — used consistently across tasks.
- **Known build-time prototyping items (flagged, non-blocking):** dnd-kit nested-sortable exact wiring (T14, start from the multiple-containers example); the default strip-color palette (configurable); the precise travel-as-work-equivalent rule in DOOD (v1 derives work from segments; travel via override) — encode the spec rule and TDD it.
