# Phase 4 — Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hybrid estimating budget on a flexible chart of accounts where **quantities derive live from the confirmed breakdown + the schedule/DOOD** and rates are authored — with globals, stackable fringes, contingency, and an append-only actuals ledger. The second module that reads the graph (and the first that reads *two* upstream modules: breakdown **and** schedule).

**Architecture:** Project-scoped Postgres tables under Phase 1–3 owner-RLS, scoped through a **`budgets` parent** (`budget_id → budgets.project_id`) so a future versions retrofit is additive. The **derivation engine is a set of PURE functions** (`(loaded slice) → resolved line costs / rollups / variance`) computed on read — nothing derived persisted (only authored inputs + the actuals ledger). One typed Zod↔DB contract; the only Supabase queries for the domain live in `lib/budget/data.ts`, whose **graph-slice loader reuses `lib/schedule` read fns** (`getDOOD`, shoot-day counts) + confirmed breakdown counts. UI is a thin client (top sheet + account detail + actuals ledger) over actions + the data layer.

**Tech Stack:** Next.js 16 / React 19 / TS · Supabase (Postgres + RLS) · Zod v4 · Vitest. **No new deps.**

**Spec:** `docs/superpowers/specs/2026-06-05-phase-4-budget-design.md` (the 10 decisions + soft-modeling guards — implement exactly).

---

## Conventions (apply to every task)

- **Parse-on-read / parse-at-boundary.** Reads return Zod-validated domain types; writes parse input; server actions re-parse `FormData` with Zod before the data layer. `"use server"` modules export ONLY locally-defined async actions (never re-export an import — the Phase-1 manifest footgun; the Phase-3 lesson re-confirmed it).
- **RLS pattern (mirror Phases 1–3 exactly):** project-scoped via the budget — `exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = <t>.budget_id and p.owner_id = auth.uid())`; tables with a second cross-entity FK (parent account, account, rate_global, fringe, line) validate BOTH in insert AND update with-check (the 0004/0006/0011 lesson).
- **Pure engine.** `lib/budget/derive/*` functions take already-loaded plain data and return results — NO DB, NO `Date.now()`/`new Date()`, NO I/O. Trivially unit-testable. Inline structural input types (the Phase-3 `*Like` decoupling).
- **Tests** run with `npx dotenv -e .env.local -- npm test`. Live-DB suites: `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)` + the two-user `makeUser`/`newProject` harness (copy the header from `lib/breakdown/data.test.ts`).
- **Type regen after each migration:** `npx supabase migration up && npx supabase gen types typescript --local 2>/dev/null > lib/db/types.ts` (the `2>/dev/null` strips the CLI's stray first line; verify line 1 is `export type Json =`).
- **Commit after each green step.** Conventional commits, scope `phase-4`.
- **Soft seams (don't harden):** line→graph binding is `quantity_source jsonb` (a `{kind, params}` discriminated union in Zod); chart nesting via nullable `parent_account_id`; manual↔global rate via nullable `rate_global_id`.

---

## File Structure

**Migrations (forward-only, from 0013):**
- `0013_budget_root_chart.sql` — `budgets` (+ `contingency_percent`/`contingency_basis`), `budget_accounts` (self-FK parent), `budget_globals`, `fringes`.
- `0014_budget_lines.sql` — `budget_lines` (two-FK: account + rate_global), `budget_line_fringes` (both-FK junction).
- `0015_cost_entries.sql` — `cost_entries` (append-only: no UPDATE policy).

**Domain:**
- `lib/budget/schema.ts` (+`.test.ts`) — Zod rows, write inputs, `quantitySource` union, derived-result types.
- `lib/budget/data.ts` (+`.test.ts`) — CRUD, `getOrCreateDefaultBudget`, idempotent default-chart seed, `loadBudgetDerivationInputs` (reuses `lib/schedule`), engine-wiring read fns.
- `lib/budget/derive/cost.ts` (+`.test.ts`) — `resolveLineQuantity`/`resolveLineRate`/`computeLineCost`.
- `lib/budget/derive/rollups.ts` (+`.test.ts`) — `computeRollups`.
- `lib/budget/derive/variance.ts` (+`.test.ts`) — `computeVariance`.

**App:**
- `app/dashboard/[projectId]/budget/{page.tsx,actions.ts}`.
- `components/budget/{top-sheet,account-detail,line-row,globals-editor,fringes-editor,quantity-source-picker,actuals-ledger}.tsx`.

**Cross-module test:** `lib/budget/integration.test.ts`.

---

## Task 0: Worktree + environment baseline

**Files:** none (verification only).

- [ ] **Step 1:** Confirm `git branch --show-current` → `phase-4-budget`; worktree at `.claude/worktrees/phase-4-budget` based off `studioflowv2/main` (includes Phase 3).
- [ ] **Step 2:** `.env.local` exists (regenerate from `npx supabase status -o env` if missing — NOT inherited across worktrees). Local Supabase up (`npx supabase start`); `npx supabase migration list --local` shows 0001–0012.
- [ ] **Step 3:** `npm install` (no new deps); confirm green baseline: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test` (expect the Phase-3 baseline: 211 passed + 1 skipped).
- [ ] **Step 4:** No commit (nothing changed).

---

## Task 1: Migration 0013 — budget root + chart + globals + fringes

**Files:** Create `supabase/migrations/0013_budget_root_chart.sql`; modify `lib/db/types.ts`; create `lib/budget/data.test.ts` (RLS harness + smoke).

- [ ] **Step 1: Write the migration.** Reference `0005`/`0009` for RLS/grant/trigger style.

```sql
-- ============================================================================
-- Phase 4: Budget root (versions seam) + flexible chart + globals + fringes.
-- ============================================================================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default 'Budget',
  is_default boolean not null default true,
  contingency_percent numeric not null default 0,
  contingency_basis text not null default 'btl' check (contingency_basis in ('btl','total','none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.budget_accounts (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  parent_account_id uuid references public.budget_accounts(id) on delete set null,
  code text not null,
  name text not null,
  section text not null default 'btl' check (section in ('atl','btl','post','other')),
  ordinal int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.budget_globals (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  name text not null,
  kind text not null default 'rate' check (kind in ('rate','percent')),
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.fringes (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  name text not null,
  percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budgets_project_id_idx on public.budgets(project_id);
create index budget_accounts_budget_id_idx on public.budget_accounts(budget_id);
create index budget_accounts_parent_idx on public.budget_accounts(parent_account_id);
create index budget_globals_budget_id_idx on public.budget_globals(budget_id);
create index fringes_budget_id_idx on public.fringes(budget_id);

alter table public.budgets enable row level security;
alter table public.budget_accounts enable row level security;
alter table public.budget_globals enable row level security;
alter table public.fringes enable row level security;

-- budgets: project-scoped (4 policies)
create policy "budgets - select" on public.budgets for select using (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));
create policy "budgets - insert" on public.budgets for insert with check (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));
create policy "budgets - update" on public.budgets for update using (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));
create policy "budgets - delete" on public.budgets for delete using (exists (select 1 from public.projects p where p.id = budgets.project_id and p.owner_id = auth.uid()));

-- helper predicate (inlined per table): budget_id belongs to caller
-- budget_accounts: budget owned AND (parent null OR parent in same caller's project)
create policy "budget_accounts - select" on public.budget_accounts for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid()));
create policy "budget_accounts - insert" on public.budget_accounts for insert with check (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid())
  and (parent_account_id is null or exists (select 1 from public.budget_accounts a join public.budgets b2 on b2.id = a.budget_id join public.projects p2 on p2.id = b2.project_id where a.id = budget_accounts.parent_account_id and p2.owner_id = auth.uid())));
create policy "budget_accounts - update" on public.budget_accounts for update using (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid())
  and (parent_account_id is null or exists (select 1 from public.budget_accounts a join public.budgets b2 on b2.id = a.budget_id join public.projects p2 on p2.id = b2.project_id where a.id = budget_accounts.parent_account_id and p2.owner_id = auth.uid())));
create policy "budget_accounts - delete" on public.budget_accounts for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_accounts.budget_id and p.owner_id = auth.uid()));

-- budget_globals + fringes: budget-scoped (4 policies each)
create policy "budget_globals - select" on public.budget_globals for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "budget_globals - insert" on public.budget_globals for insert with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "budget_globals - update" on public.budget_globals for update using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "budget_globals - delete" on public.budget_globals for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_globals.budget_id and p.owner_id = auth.uid()));
create policy "fringes - select" on public.fringes for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));
create policy "fringes - insert" on public.fringes for insert with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));
create policy "fringes - update" on public.fringes for update using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));
create policy "fringes - delete" on public.fringes for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = fringes.budget_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.budget_accounts to authenticated;
grant select, insert, update, delete on public.budget_globals to authenticated;
grant select, insert, update, delete on public.fringes to authenticated;
create trigger budgets_set_updated_at before update on public.budgets for each row execute function extensions.moddatetime(updated_at);
create trigger budget_accounts_set_updated_at before update on public.budget_accounts for each row execute function extensions.moddatetime(updated_at);
create trigger budget_globals_set_updated_at before update on public.budget_globals for each row execute function extensions.moddatetime(updated_at);
create trigger fringes_set_updated_at before update on public.fringes for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2: Apply + regen types.** Confirm line 1 is `export type Json =` and `budgets`/`budget_accounts`/`budget_globals`/`fringes` appear.
- [ ] **Step 3: Create `lib/budget/data.test.ts`** — copy the harness header (~lines 1–44) from `lib/breakdown/data.test.ts`, then:
  - owner creates a budget + account; another user can't see them (isolation).
  - **two-FK escape:** Bob creates his own budget; tries to insert a `budget_accounts` row whose `parent_account_id` points at ALICE's account → `error.code === "42501"`.
- [ ] **Step 4: Run + verify pass.** `npx dotenv -e .env.local -- npm test -- lib/budget/data.test.ts`
- [ ] **Step 5: Typecheck + commit** `feat(phase-4): migration 0013 budget root + chart + globals + fringes (two-FK RLS)`.

---

## Task 2: Migration 0014 — budget lines (+ line↔fringe junction)

**Files:** `supabase/migrations/0014_budget_lines.sql`; `lib/db/types.ts`; extend test.

- [ ] **Step 1: Migration.** `budget_lines` has TWO cross-entity FKs (`account_id` + nullable `rate_global_id`) → validate both. `budget_line_fringes` has TWO (`line_id` + `fringe_id`) → validate both (the 0006 lesson).

```sql
-- ============================================================================
-- Phase 4: Budget lines (manual or graph-bound quantity; manual or global rate)
--          + stackable line↔fringe junction.
-- ============================================================================
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  account_id uuid not null references public.budget_accounts(id) on delete cascade,
  description text not null default '',
  unit text,
  ordinal int not null default 0,
  quantity numeric,                        -- manual quantity (when not derived)
  quantity_source jsonb,                   -- { kind, params } soft binding; null => manual
  rate numeric,                            -- manual rate
  rate_global_id uuid references public.budget_globals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.budget_line_fringes (
  budget_id uuid not null references public.budgets(id) on delete cascade,
  line_id uuid not null references public.budget_lines(id) on delete cascade,
  fringe_id uuid not null references public.fringes(id) on delete cascade,
  primary key (line_id, fringe_id)
);
create index budget_lines_budget_id_idx on public.budget_lines(budget_id);
create index budget_lines_account_id_idx on public.budget_lines(account_id);
create index budget_lines_rate_global_idx on public.budget_lines(rate_global_id);
create index budget_line_fringes_line_idx on public.budget_line_fringes(line_id);
create index budget_line_fringes_fringe_idx on public.budget_line_fringes(fringe_id);

alter table public.budget_lines enable row level security;
alter table public.budget_line_fringes enable row level security;

-- budget_lines: budget owned AND account in caller's project AND (rate_global null OR owned)
create policy "budget_lines - select" on public.budget_lines for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_lines.budget_id and p.owner_id = auth.uid()));
create policy "budget_lines - insert" on public.budget_lines for insert with check (
  exists (select 1 from public.budget_accounts a join public.budgets b on b.id = a.budget_id join public.projects p on p.id = b.project_id where a.id = budget_lines.account_id and b.id = budget_lines.budget_id and p.owner_id = auth.uid())
  and (rate_global_id is null or exists (select 1 from public.budget_globals g join public.budgets b2 on b2.id = g.budget_id join public.projects p2 on p2.id = b2.project_id where g.id = budget_lines.rate_global_id and p2.owner_id = auth.uid())));
create policy "budget_lines - update" on public.budget_lines for update using (
  exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_lines.budget_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.budget_accounts a join public.budgets b on b.id = a.budget_id join public.projects p on p.id = b.project_id where a.id = budget_lines.account_id and b.id = budget_lines.budget_id and p.owner_id = auth.uid())
  and (rate_global_id is null or exists (select 1 from public.budget_globals g join public.budgets b2 on b2.id = g.budget_id join public.projects p2 on p2.id = b2.project_id where g.id = budget_lines.rate_global_id and p2.owner_id = auth.uid())));
create policy "budget_lines - delete" on public.budget_lines for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_lines.budget_id and p.owner_id = auth.uid()));

-- budget_line_fringes: BOTH line and fringe must belong to the caller
create policy "budget_line_fringes - select" on public.budget_line_fringes for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_line_fringes.budget_id and p.owner_id = auth.uid()));
create policy "budget_line_fringes - insert" on public.budget_line_fringes for insert with check (
  exists (select 1 from public.budget_lines l join public.budgets b on b.id = l.budget_id join public.projects p on p.id = b.project_id where l.id = budget_line_fringes.line_id and p.owner_id = auth.uid())
  and exists (select 1 from public.fringes f join public.budgets b2 on b2.id = f.budget_id join public.projects p2 on p2.id = b2.project_id where f.id = budget_line_fringes.fringe_id and p2.owner_id = auth.uid()));
create policy "budget_line_fringes - delete" on public.budget_line_fringes for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = budget_line_fringes.budget_id and p.owner_id = auth.uid()));

grant select, insert, update, delete on public.budget_lines to authenticated;
grant select, insert, delete on public.budget_line_fringes to authenticated;
create trigger budget_lines_set_updated_at before update on public.budget_lines for each row execute function extensions.moddatetime(updated_at);
```

- [ ] **Step 2:** Apply + regen types.
- [ ] **Step 3: Tests** (append): owner creates a line under their account (manual qty+rate) — succeeds; **two-FK escapes** — Bob's line referencing ALICE's `account_id` → 42501; Bob's line referencing ALICE's `rate_global_id` → 42501; Bob's `budget_line_fringes` referencing ALICE's `fringe_id` → 42501.
- [ ] **Step 4-5:** Run, verify pass (assert `42501`); commit `feat(phase-4): migration 0014 budget_lines + line↔fringe (two-FK RLS) + escape tests`.

---

## Task 3: Migration 0015 — cost_entries (append-only ledger)

**Files:** `supabase/migrations/0015_cost_entries.sql`; `lib/db/types.ts`; extend test.

- [ ] **Step 1: Migration.** Append-only: select + insert + delete policies, **NO update policy** (and no `updated_at`).

```sql
-- ============================================================================
-- Phase 4: CostEntry — append-only actuals ledger (no UPDATE; correct via offset).
-- ============================================================================
create table public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  account_id uuid not null references public.budget_accounts(id) on delete cascade,
  line_id uuid references public.budget_lines(id) on delete cascade,
  amount numeric not null,
  entry_date date not null,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index cost_entries_budget_id_idx on public.cost_entries(budget_id);
create index cost_entries_account_id_idx on public.cost_entries(account_id);
create index cost_entries_line_id_idx on public.cost_entries(line_id);

alter table public.cost_entries enable row level security;
create policy "cost_entries - select" on public.cost_entries for select using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = cost_entries.budget_id and p.owner_id = auth.uid()));
create policy "cost_entries - insert" on public.cost_entries for insert with check (
  exists (select 1 from public.budget_accounts a join public.budgets b on b.id = a.budget_id join public.projects p on p.id = b.project_id where a.id = cost_entries.account_id and b.id = cost_entries.budget_id and p.owner_id = auth.uid())
  and (line_id is null or exists (select 1 from public.budget_lines l join public.budgets b2 on b2.id = l.budget_id join public.projects p2 on p2.id = b2.project_id where l.id = cost_entries.line_id and p2.owner_id = auth.uid())));
create policy "cost_entries - delete" on public.cost_entries for delete using (exists (select 1 from public.budgets b join public.projects p on p.id = b.project_id where b.id = cost_entries.budget_id and p.owner_id = auth.uid()));
-- NO "cost_entries - update" policy: append-only.
grant select, insert, delete on public.cost_entries to authenticated;  -- NOT update
```

- [ ] **Step 2:** Apply + regen types.
- [ ] **Step 3: Tests** (append): owner appends an entry for their line — succeeds; isolation; **append-only proof** — owner `update` of an existing entry returns an error / affects 0 rows (no UPDATE policy → RLS denies); two-FK escape (Bob's entry referencing ALICE's `account_id`/`line_id` → 42501).
- [ ] **Step 4-5:** Run, verify pass; commit `feat(phase-4): migration 0015 cost_entries append-only ledger + RLS`. After this task run `npx supabase db reset` once to confirm **0001→0015** replay clean.

---

## Task 4: `lib/budget/schema.ts` — typed contract

**Files:** Create `lib/budget/schema.ts`, `lib/budget/schema.test.ts`.

- [ ] **Step 1: Failing tests** covering enums, a row, and the **`quantitySource` discriminated union**:
```ts
import { section, globalKind, contingencyBasis, quantitySource, createLineInput } from "@/lib/budget/schema";
it("enums reject junk", () => { expect(section.safeParse("xtl").success).toBe(false); expect(section.safeParse("atl").success).toBe(true); });
it("quantitySource union validates per kind", () => {
  expect(quantitySource.safeParse({ kind: "manual" }).success).toBe(true);
  expect(quantitySource.safeParse({ kind: "dood_cast_days", params: { personId: crypto.randomUUID() } }).success).toBe(true);
  expect(quantitySource.safeParse({ kind: "element_count", params: { categoryId: crypto.randomUUID() } }).success).toBe(true);
  expect(quantitySource.safeParse({ kind: "shoot_day_count", params: { dayType: "shoot" } }).success).toBe(true);
  expect(quantitySource.safeParse({ kind: "dood_cast_days", params: {} }).success).toBe(false); // personId required
});
```
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement** (mirror `lib/breakdown/schema.ts`/`lib/schedule/schema.ts` — loose strings on read rows, strict enums on write): enums `section`/`globalKind`/`contingencyBasis`; read rows `budget`/`budgetAccount`/`budgetGlobal`/`fringe`/`budgetLine`/`costEntry` (loose where text/jsonb); `quantitySource` = `z.discriminatedUnion("kind", [...])` (`manual` | `element_count{categoryId?|department?}` | `shoot_day_count{dayType?}` | `dood_cast_days{personId}`); write inputs `createBudgetInput`/`createAccountInput`/`createGlobalInput`/`createFringeInput`/`createLineInput`/`setLineFringesInput`/`addCostEntryInput`/`setContingencyInput`; derived-result types `ResolvedLine`/`AccountRollup`/`SectionRollup`/`TopSheet`/`Variance`.
- [ ] **Step 4-5:** Run → pass; typecheck; commit `feat(phase-4): budget Zod contract + quantitySource union + derived-result types`.

---

## Task 5: `lib/budget/data.ts` — CRUD + default-chart seed

**Files:** Create `lib/budget/data.ts`; extend `lib/budget/data.test.ts`.

- [ ] **Step 1: Failing tests** for `getOrCreateDefaultBudget` (idempotent — twice ⇒ same id), `seedDefaultChart` (idempotent — re-seed no-ops; creates the A–F+ sections/accounts), `createAccount`/`listAccounts`, `createGlobal`/`createFringe`/`listGlobals`/`listFringes`, `createLine`/`listLines`/`updateLine`, `setLineFringes` (replace set), `addCostEntry`/`listCostEntries`, `setContingency`.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3: Implement** (mirror `lib/breakdown/data.ts`/`lib/schedule/data.ts`: `type DbClient = SupabaseClient<Database>`, parse-on-read, `throw new Error(msg,{cause})`, parsed write inputs). `seedDefaultChart` ports the v0 `legacy/components/projectmodules/Budget/budget-presets.ts` account/line **structure** (sections + account names; **blank rates** — leave `rate` null); idempotent (check existing accounts first, early-return). `getOrCreateDefaultBudget` reads the project's default budget or inserts one. Keep each function small.
- [ ] **Step 4-5:** Run → pass; typecheck; commit `feat(phase-4): budget data layer — CRUD + idempotent default-chart seed`.

---

## Task 6: `lib/budget/data.ts` — graph-slice loader (reuses lib/schedule)

**Files:** Modify `lib/budget/data.ts`; extend test.

- [ ] **Step 1: Failing test:** `loadBudgetDerivationInputs(client, projectId)` returns the plain-data inputs the engine needs: `{ elementCountsByCategory: Record<categoryId, number>, elementCountsByDepartment: Record<deptId, number>, shootDayCountsByType: Record<dayType, number>, doodPaidDaysByPerson: Record<personId, number> }`. Assert it reads only **confirmed** breakdown + **dated** shoot days, project-scoped; `doodPaidDaysByPerson` counts paid DOOD codes (work/hold/travel, idle excluded).
- [ ] **Step 2:** fail.
- [ ] **Step 3: Implement `loadBudgetDerivationInputs`** — **reuse `lib/schedule`**: call `getDOOD(client, projectId)` and count paid codes per person; count `shoot_days` by `day_type` (via `listShootDays`); count confirmed `scene_elements` joined to `elements.category_id`/`department_id` for the project (confirmed-only gate). Return plain objects. This is the ONLY place the engine's input is assembled. (Import from `@/lib/schedule/data`; do not duplicate its queries.)
- [ ] **Step 4-5:** Run → pass; commit `feat(phase-4): loadBudgetDerivationInputs (reuses schedule/DOOD; confirmed-only)`.

---

## Task 7: `derive/cost.ts` — line cost (pure)

**Files:** Create `lib/budget/derive/cost.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests:** manual line (`qty×rate`); each derived `kind` resolves qty from `derivedInputs`; `rate_global_id` overrides manual rate; **stackable fringes** (two fringes → both applied to base); a missing/`manual` source uses `line.quantity`; null qty/rate ⇒ 0.
- [ ] **Step 2-4:** Implement `resolveLineQuantity(line, derivedInputs)`, `resolveLineRate(line, globalsById)`, `computeLineCost(line, derivedInputs, globalsById, fringesById, lineFringeIds)` → `{ base, fringeCosts:[{fringeId,amount}], total }`. Inline structural input types (the Phase-3 `*Like` decoupling). Pure. Run → pass.
- [ ] **Step 5:** commit `feat(phase-4): derive computeLineCost (pure; derived qty + global rate + stackable fringes)`.

---

## Task 8: `derive/rollups.ts` — account/section/top-sheet (pure)

**Files:** Create `lib/budget/derive/rollups.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests:** lines roll into their account; accounts into their **section** (atl/btl/post/other); section subtotals + grand subtotal; **fringe roll-up** (total per fringe across lines); **contingency** = `percent × basis` (basis `btl` ⇒ BTL section subtotal; `total` ⇒ grand; `none` ⇒ 0); **estimate grand total** = subtotal + fringes + contingency.
- [ ] **Step 2-4:** Implement `computeRollups(lines, accounts, costResultsByLine, budgetSettings)` → `TopSheet { accounts: AccountRollup[], sections: SectionRollup[], fringeTotals, subtotal, contingency, grandTotal }`. Pure. Run → pass.
- [ ] **Step 5:** commit `feat(phase-4): derive computeRollups (pure; section/top-sheet + fringe roll-up + contingency)`.

---

## Task 9: `derive/variance.ts` — actuals variance (pure)

**Files:** Create `lib/budget/derive/variance.ts`, `.test.ts`.

- [ ] **Step 1: Failing tests:** per-line actual = Σ entries for that line; per-account actual = Σ entries for the account (incl. account-level entries with null line_id); variance = estimate − actual at line/account/budget; offsetting entries net out.
- [ ] **Step 2-4:** Implement `computeVariance(rollups, costEntries)` → `Variance { byLine, byAccount, budget: {estimate, actual, variance} }`. Pure. Run → pass.
- [ ] **Step 5:** commit `feat(phase-4): derive computeVariance (pure; append-only ledger sums)`.

---

## Task 10: `lib/budget/data.ts` — engine-wiring read fns

**Files:** Modify `lib/budget/data.ts`; extend test (live-DB integration).

- [ ] **Step 1: Failing test** — seed a budget+account+line (one manual, one DOOD-bound) + a global + a fringe + cost entries + the upstream graph (script/scene/confirmed cast + shoot days); assert `getTopSheet`/`getVariance` return engine output over the loaded slice.
- [ ] **Step 2-4: Implement** thin wrappers: each loads the slice via `loadBudgetDerivationInputs` + the budget tables, then calls the pure engine. `getBudget` (budget + accounts + lines + globals + fringes + line-fringe map); `getTopSheet(client, projectId)` → load + `computeLineCost` per line + `computeRollups`; `getAccountDetail`; `getVariance` → `+ computeVariance(costEntries)`. Run → pass.
- [ ] **Step 5:** commit `feat(phase-4): wire budget engine into read fns (top sheet / account detail / variance)`.

---

## Task 11: Server actions

**Files:** Create `app/dashboard/[projectId]/budget/actions.ts`.

- [ ] **Step 1-4:** `"use server"` module, each action Zod-parses FormData, calls the data layer with the SSR client (`@/lib/supabase/server`), `revalidatePath`. Actions: `seedDefaultChartAction`, `createAccountAction`/`updateAccountAction`, `createLineAction`/`updateLineAction`/`setLineQuantitySourceAction`/`setLineFringesAction`, `createGlobalAction`/`updateGlobalAction`, `createFringeAction`, `setContingencyAction`, `addCostEntryAction`. Export ONLY local async fns (grep `^export` → all `export async function`). Ensure `npm run typecheck` + `npm run build` pass.
- [ ] **Step 5:** commit `feat(phase-4): budget server actions (Zod-parsed, manifest-safe)`.

---

## Task 12: Top sheet + account detail UI

**Files:** Create `app/dashboard/[projectId]/budget/page.tsx`, `components/budget/{top-sheet,account-detail,line-row}.tsx`. Port look from `legacy/components/projectmodules/Budget/budget-module.tsx` (visual hint only); wire to real data + the design system.

- [ ] **Step 1-4:** Server `page.tsx` calls `getOrCreateDefaultBudget` (idempotent) + `getTopSheet`/`getAccountDetail`/`getVariance`. Renders the **top sheet** (section rollups, fringe totals, contingency, grand total) and **account detail** (accounts → lines; each line shows resolved qty/rate/cost, a **derived-vs-manual** indicator, fringe chips). Design tokens; NO hardcoded colors. Verify lint/typecheck/build.
- [ ] **Step 5:** commit `feat(phase-4): budget top sheet + account detail UI (derived-vs-manual aware)`.

---

## Task 13: Globals/fringes editors + contingency + quantity-source binding

**Files:** Create `components/budget/{globals-editor,fringes-editor,quantity-source-picker}.tsx`; extend `page.tsx`.

- [ ] **Step 1-4:** Editors for **globals** (name/kind/value) and **fringes** (name/percent) via the actions; a **contingency** control (percent + basis); a **quantity-source picker** on a line — choose `manual` (qty input) or bind to `element_count` (category select) / `shoot_day_count` (day-type select) / `dood_cast_days` (person select) → `setLineQuantitySourceAction`; a fringe multi-select → `setLineFringesAction`; a rate control (manual or pick a global). Tokens only. Verify lint/typecheck/build.
- [ ] **Step 5:** commit `feat(phase-4): globals/fringes editors + contingency + line quantity-source/fringe binding`.

---

## Task 14: Actuals ledger UI

**Files:** Create `components/budget/actuals-ledger.tsx`; extend `page.tsx`.

- [ ] **Step 1-4:** A panel to **append** a cost entry (amount/date/note, against an account or line) via `addCostEntryAction`, and a read-only list of entries; show **estimate vs actual vs variance** per account/line + budget total (from `getVariance`). Append-only (no edit UI); a correction is a new offsetting entry. Tokens only. Verify lint/typecheck/build.
- [ ] **Step 5:** commit `feat(phase-4): actuals ledger UI (append-only; estimate/actual/variance)`.

---

## Task 15: ⭐ Cross-module integration test + browser smoke

**Files:** Create `lib/budget/integration.test.ts`.

- [ ] **Step 1-4: The thesis test** (live-DB, two-user harness): seed a project + script + scene + **confirmed** cast (character + `cast_person_id`) + dated shoot days holding that scene; create a budget with a **`dood_cast_days`-bound** line for that person (rate authored) and an **`element_count`-bound** line; assert `getTopSheet` reflects the DOOD-derived cost (paid days × rate). Then **extend the schedule** (add another dated shoot day with that scene) → assert the cast line's cost **increases** (more paid days) with no sync step. Add a confirmed element → assert the element-count line's quantity moves. **Reject** the cast tag → assert the cast line's derived qty drops to 0. Also assert variance from a cost entry. Run → pass.
- [ ] **Step 5: Browser smoke** (per the Phase-2/3 playbook — preview MCP can't run on the external volume, so run the dev server via Bash and drive the **Claude-in-Chrome** extension; OTP/PKCE login pulling the magic link from Mailpit `:54324`; native-setter for controlled inputs): sign in → open a project with breakdown + schedule → open Budget → seed/open the chart → bind a line to DOOD cast-days → see the cost → append a cost entry → see variance → confirm `"use server"` actions resolve at runtime (no manifest 404). Record results. Commit `test(phase-4): cross-module integration (breakdown+schedule→budget derivation) + smoke notes`.

---

## Task 16: Final verification + branch finish

- [ ] **Step 1:** Full green: `npm run lint && npm run typecheck && npx dotenv -e .env.local -- npm test`.
- [ ] **Step 2:** `npx supabase db reset` (replay 0001→0015 clean) → re-run the suite.
- [ ] **Step 3:** `npm run build` passes; **lock sanity** — if any dep was added, regenerate with `npx npm@10 install` and verify `npx npm@10 ci` (the recurring npm10-vs-npm11 CI trap); else confirm `rm -rf node_modules && npm ci` succeeds.
- [ ] **Step 4:** Walk the spec §"Testing"/decisions; confirm each is demonstrable.
- [ ] **Step 5:** Use `superpowers:finishing-a-development-branch`. Push to **`studioflowv2`**, open a PR to `main`; wait for the CI `build` check green; **Do NOT merge without the user's explicit go** (merge auto-deploys + auto-applies 0013–0015 to hosted Supabase). After an approved merge, verify the merge commit's checks green (`gh api repos/wdsmcguigan/StudioFlowV2/commits/<sha>/check-runs` + Vercel + Supabase statuses).

---

## Self-Review (plan vs spec)

- **Spec coverage:** budget root + versions seam (T1) · flexible chart + seeded default (T1/T5) · globals + fringes (T1) · lines w/ soft `quantity_source` + manual↔global rate (T2/T4) · stackable line↔fringe (T2) · append-only cost ledger (T3) · `quantitySource` union (T4) · graph-slice loader **reusing schedule/DOOD** (T6) · pure engine cost/rollups/variance (T7–9) · derived-on-read read-fns (T10) · DOOD paid-codes costing (T6/T7/T15) · top sheet + account detail + editors + ledger UI (T12–14) · cross-module thesis test (T15) · two-user RLS + two-FK escapes incl. append-only proof (T1/T2/T3). **All mapped.**
- **Deferred honored:** versions/scenarios (seam only), location-day costing (binding-union seam), multi-currency, cashflow, PO/AP, global tiers/fringe caps, xlsx/MMB I/O — none built.
- **Soft seams in place:** `quantity_source` jsonb union · `parent_account_id` nullable nesting · `rate_global_id` nullable (manual↔global) · `budget_id` scoping (versions retrofit additive).
- **Reuse, don't duplicate:** the derivation inputs come from `lib/schedule` read fns (`getDOOD`, shoot-day counts) + breakdown counts — the budget engine never re-queries the schedule/breakdown directly.
- **CI/merge gotchas baked in:** npm10-vs-npm11 lock trap (T16), `"use server"` local-exports-only (T11), `2>/dev/null` type regen (every migration task), push to `studioflowv2` + merge-gate pause (T16).
