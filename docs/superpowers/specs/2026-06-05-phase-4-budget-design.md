# Phase 4 — Budget (Design Spec)

> **Status:** ✅ Finalized 2026-06-05 (resolved in the Phase 4 brainstorm).
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phases 0–3 (scenes + **confirmed** breakdown + the **schedule/DOOD** all exist and are merged to main; hosted Supabase at 0012).
> **Build order:** Phase 4 (Budget) → Phase 5 (Call Sheets) → ⭐ v1.

## Goal

A genuinely-useful **hybrid estimating budget**: a real, full-featured cost estimate on a **flexible, user-defined chart of accounts**, where **the production graph drives the quantities** (confirmed breakdown + the schedule/DOOD) and the producer authors the rates. Like every module after Phase 3, the budget is the next proof of the thesis — *change the breakdown or the schedule → the budget recomputes* — because the numbers are **derived-on-read**, not re-entered. It is the second module that *reads* the graph (the first that reads *two* upstream modules: breakdown **and** schedule).

This is **not** Movie Magic Budgeting. We build the focused, genuinely-useful estimating budget with a live derivation spine and light actuals — and hold the line against cashflow, multi-currency, PO/AP workflows, and scenario sprawl.

---

## Decisions (resolved 2026-06-05)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | **Identity** | **Hybrid estimating budget** | Authored chart-of-accounts + rates; **quantities derive from the graph** where bindable. Derived-on-read (the Phase-3 engine pattern): nothing computed is persisted — only authored inputs + the actuals ledger. |
| 2 | **Chart of accounts** | **Flexible, user-defined + seeded editable default** | No hardcoded standard. New budgets seed a sensible default template (idempotent, like the breakdown taxonomy) the user edits/extends. Default ported from the v0 `Budget/budget-presets.ts` letter-account structure (A=Pre-Pro/Wrap, B=Shoot Crew, C=Casting, D=Location/Travel, E=Props/Wardrobe/Animals, F=Set Construction, …). |
| 3 | **Derived-quantity sources (v1)** | **Element counts + shoot-day counts + DOOD cast-days** | A line's quantity is **manual** or **bound** to a graph source, resolved live: (a) # confirmed breakdown elements by category/department; (b) # `shoot_days` by `day_type`; (c) per-person paid DOOD day-counts. *(Location/Set-day costing is a designed-for seam, deferred.)* |
| 4 | **DOOD cast-day costing** | **Paid codes = Work + Hold + Travel; Idle excluded** | A cast line binds to a Person and counts that person's DOOD entries with paid codes (`SW/W/WF/SWF`, `H`, `T`) × an authored/global day-rate. `I` (idle) is unpaid → excluded. Compound start/finish codes count as one work day each. **Engine logic → freely revisable later (no migration).** |
| 5 | **Mechanics** | **Full: globals + fringes + contingency** | **Globals** = named project-scoped values (rate or %) a line references for its rate (change once → recompute everywhere). **Fringes** = named **stackable** %s (payroll tax, benefits…) flagged onto lines, applied to line cost, rolled up. **Contingency** = a budget-level % (default basis: the BTL subtotal; flaggable). |
| 6 | **Actuals** | **Light: append-only cost-entry ledger** | Cost entries (amount, date, note) appended against an account or line (non-negotiable #6: actuals are append-only). A line/account's *actual* = sum of its entries; **variance = estimate − actual**. **Insert-only** — corrections via offsetting entries, not edits. No PO/AP workflow. |
| 7 | **Versions/scenarios** | **Single working budget; design the seam** | One budget per project in v1. But a **`budgets` parent table** is introduced now and accounts/lines/globals/fringes/ledger all scope to `budget_id` (which scopes to `project_id`). v1 auto-creates one default budget per project. Versions later = **N budgets per project** + a compare/lock UI — **purely additive, no re-scoping migration**. |
| 8 | **Engine** | **Pure derived-on-read functions** | `lib/budget/derive/*` — `(loaded slice) → resolved line costs / fringe costs / account+section+top-sheet rollups / variance`. No DB, no `Date.now`. Own unit-test suite (graph X → totals Y). Caching only if profiling demands. |
| 9 | **Graph-slice loader** | **Reuses Phase-3 read fns** | The budget's derivation inputs come from a slice loader that calls `lib/schedule` (`getDOOD`, shoot-day counts via `loadScheduleGraph`/`listShootDays`) + confirmed breakdown counts (`listElements`/scene tags) + the budget's own authored tables. The only place budget queries live: `lib/budget/data.ts`. |
| 10 | **Calendar/UI** | **Top sheet + account detail + actuals ledger; mine v0 look** | Port the *look* of the v0 `Budget/budget-module.tsx` (top sheet, account rows) onto the design system + real data (the Phase-3 calendar approach). Build fresh logic. |

> **Soft-modeling guards (so we don't paint into a corner — cost ~nothing now):** (i) a line's graph binding is a **structured `{source, params}`** (new derived sources are data, not a schema change); (ii) chart **sections/nesting are soft data** (a `section` value + nullable `parent_account_id`), not a rigid enum tree; (iii) **rate & fringe references are nullable FKs** (manual ↔ global is null-vs-set). These keep the most-likely-to-change shapes additive.

---

## Data model (additions to the graph)

All new tables are **project-scoped** with owner-based RLS (Phase 1–3 pattern), per-op policies, CHECK-constraint "enums" (text + CHECK), FK indexes, `updated_at` triggers. Tables with **two cross-entity FKs validate both** in insert/update with-check (the 0004/0006/0011 lesson). Forward-only migrations continue from **0013**. Everything scopes through `budget_id → budgets.project_id` (the version seam).

### Migration 0013 — Budget root + chart of accounts + globals + fringes
- **`budgets`** — `{ id, project_id (FK projects, cascade), name, is_default bool, created_at, updated_at }`. v1: one default budget per project (lazily created; idempotent).
- **`budget_accounts`** — `{ id, budget_id (FK budgets, cascade), code, name, section ('atl'|'btl'|'post'|'other'), parent_account_id (nullable self-FK, on delete set null), ordinal, created_at, updated_at }`. Seeded default template; user-editable. Two-FK with-check (budget + parent both in caller's project).
- **`budget_globals`** — `{ id, budget_id (FK), name, kind ('rate'|'percent'), value numeric, created_at, updated_at }`.
- **`fringes`** — `{ id, budget_id (FK), name, percent numeric, created_at, updated_at }`.

### Migration 0014 — Budget lines (+ line↔fringe junction)
- **`budget_lines`** — `{ id, budget_id (FK), account_id (FK budget_accounts, cascade), description, unit text?, ordinal,`
  `quantity numeric? (manual qty when not derived),`
  `quantity_source jsonb? (the structured binding: { kind: 'manual'|'element_count'|'shoot_day_count'|'dood_cast_days', params: {…} } — null/`'manual'` ⇒ use `quantity`),`
  `rate numeric? (manual rate), rate_global_id (FK budget_globals, nullable — when set, overrides `rate`),`
  `created_at, updated_at }`. Two-FK with-check (budget + account both owned; rate_global_id owned when set).
- **`budget_line_fringes`** — junction `{ budget_id, line_id (FK budget_lines, cascade), fringe_id (FK fringes, cascade) }`, **both FKs validated** in RLS (the 0006 lesson). A line stacks 0..N fringes.

### Migration 0015 — Actuals ledger + budget settings
- **`cost_entries`** — append-only `{ id, budget_id (FK), account_id (FK budget_accounts, cascade) , line_id (FK budget_lines, nullable, cascade), amount numeric, entry_date date, note text?, created_by uuid, created_at }`. **No `updated_at`, no UPDATE policy** (insert + select + delete-by-owner only; corrections via offsetting entries). RLS validates account/line ownership.
- **Budget-level settings** for contingency: add `contingency_percent numeric default 0` + `contingency_basis text default 'btl'` to **`budgets`** (in 0013 actually — see note) — *kept on the budget row, not a separate table.*

> **Migration split may be combined at plan time** (0013–0015 is the logical grouping). The `contingency_*` columns live on `budgets` (0013). Regenerate `lib/db/types.ts` after each migration (`… gen types … 2>/dev/null > lib/db/types.ts`).

> **No new graph linking needed** — the chain already exists: `budget_lines.quantity_source` → (element counts from `scene_elements` confirmed + `elements.category`/`department`) | (`shoot_days.day_type` counts) | (DOOD via `getDOOD` per `people` row). Downstream reads only `status='confirmed'` breakdown (the Phase-2 gate) and dated shoot days (the Phase-3 gate).

---

## Derivation engine (`lib/budget/derive/*` — pure; the interconnection)

Pure functions over an already-loaded slice (no DB inside → trivially unit-testable; the data layer loads the slice and calls them):

- **`resolveLineQuantity(line, derivedInputs)`** → the effective quantity: `manual` ⇒ `line.quantity`; else look up the bound source in `derivedInputs` (`elementCountsByKey`, `shootDayCountsByType`, `doodPaidDaysByPerson`) using `quantity_source.params`.
- **`resolveLineRate(line, globalsById)`** → `rate_global_id` set ⇒ the global's value; else `line.rate`.
- **`computeLineCost(line, …)`** → `quantity × rate` (base), then **fringe costs** = Σ over the line's fringes of `base × fringe.percent` (stackable). Returns `{ base, fringeCosts: [{fringeId, amount}], total }`.
- **`computeRollups(lines, accounts)`** → per-account, per-**section** (ATL/BTL/Post/Other), and **top-sheet** subtotals + grand total; **fringe roll-up** by fringe; **contingency** = `contingency_percent × basis-subtotal`; **estimate grand total**.
- **`computeVariance(rollups, costEntries)`** → per-line/account **actual** = Σ entries; **variance = estimate − actual**; budget-level estimate/actual/variance.

**Paid DOOD codes** (decision 4): a `dood_cast_days` line counts `getDOOD` entries for its `params.personId` whose code ∈ {`SW`,`W`,`WF`,`SWF`,`H`,`T`} (idle `I` excluded). Compound start/finish codes count as one paid day. The DOOD engine already yields per-person/date codes — the budget engine just counts them.

**The chain:** `budget_lines.quantity_source` → confirmed `scene_elements`/`elements` counts · `shoot_days.day_type` counts · `getDOOD(projectId)` per-person paid-day counts. `globals`/`fringes` are authored; `cost_entries` are the append-only actual. **All derived live** — a breakdown/schedule change reflects in the budget with no sync step.

---

## Services & layout

- `lib/budget/schema.ts` — Zod rows + write inputs + **derived-result types** (`ResolvedLine`, `AccountRollup`, `SectionRollup`, `TopSheet`, `Variance`) + the `quantity_source` discriminated union.
- `lib/budget/data.ts` — the only place budget queries live: CRUD (budgets, accounts, globals, fringes, lines, line_fringes, cost_entries) + the **default-chart seed** (idempotent) + a **graph-slice loader** (`loadBudgetDerivationInputs` — reuses `lib/schedule` read fns + confirmed breakdown counts) + read fns that call the engine (`getBudget`, `getTopSheet`, `getAccountDetail`, `getVariance`). parse-on-read; `getOrCreateDefaultBudget`.
- `lib/budget/derive/{cost,rollups,variance}.ts` — pure engine (+ tests).
- `app/dashboard/[projectId]/budget/{page.tsx,actions.ts}` — actions Zod-parsed, `"use server"` hygiene (only local async exports): createAccount/updateAccount, createLine/updateLine/setLineQuantitySource/setLineFringes, createGlobal/updateGlobal, createFringe, setContingency, addCostEntry, seedDefaultChart.
- `components/budget/*` — **top sheet** (section rollups + grand total + contingency), **account detail** (lines with resolved qty/rate/cost, derived-vs-manual indicator, fringe chips), **globals/fringes** editors, **actuals ledger** (append entry + variance). Ported onto the design system; design tokens only.
- **No async jobs** — derivation is synchronous + fast (WDK not needed).

## Key flows

Seed (or open) the default chart → edit accounts/lines. A line is **manual** (type qty + rate) or **bind its quantity** to a graph source (pick "DOOD days for Person X", "shoot days of type Y", or "count of confirmed elements in category Z") and set a rate (manual or a **global**). Flag **fringes** onto labor lines (stackable). Set a **contingency** %. The **top sheet** rolls up sections + fringes + contingency to a grand total — all **computed live** from the confirmed graph. Track spend by appending **cost entries** to the **actuals ledger**; the budget shows estimate vs actual vs **variance**. A breakdown confirmation or a schedule change reflects in the budget with no sync step.

## Testing

- **Engine (pure unit tests):** manual line cost; derived line resolves qty from each source kind; global rate override; **stackable fringes**; section/top-sheet rollups; contingency on the right basis; variance from a cost ledger. Graph X → totals Y.
- **DOOD cast-day costing:** paid codes counted (work/hold/travel), idle excluded, compound codes = one day.
- **Seed:** default chart is idempotent (re-seed no-ops).
- **⭐ Cross-module integration test (the thesis):** confirm a cast member + schedule their days → a DOOD-bound cast line's cost appears; **move/extend the schedule → the line recomputes** (more paid days → higher cost) with no sync step. Add a confirmed element → an element-count line's quantity moves. Reject the tag → it drops. Proves budget derives from breakdown **and** schedule.
- **RLS:** two-user isolation + junction/two-FK escapes (accounts↔parent, lines↔account & rate_global, line_fringes both FKs, cost_entries↔line), `describe.skipIf(!SUPABASE_SERVICE_ROLE_KEY)`.
- **Append-only ledger:** confirm no UPDATE path on `cost_entries`; correction = offsetting entry.
- **Component/browser smoke:** top sheet, account detail, ledger entry, a derived line recomputing after a schedule edit.

## Deferred (seams, not built in Phase 4)

Budget **versions/scenarios** (the `budgets` parent + scoping is the seam) · **location/Set-day costing** (a 4th derived source — the binding union is the seam) · multi-currency · cashflow / fund-flow · PO/AP & a real cost-report (the append-only ledger is the growth primitive) · global *tiers*/fringe *caps* · `.xlsx`/MMB import-export · budget templates picker.

## Prerequisites / environment

- Reuses Phases 0–3: confirmed breakdown (`scene_elements`/`elements`), the schedule (`shoot_days`, DOOD via `lib/schedule` read fns). No new external libs expected (numbers + the existing stack). Local Supabase running; migrations applied through 0012; regenerate types after each new migration.
- **No AI key / no job runner** needed this phase.
- **CI lock note (recurring):** local **npm 11** can rewrite `package-lock.json` in a way CI's Node-22 **npm 10** rejects — if any dep is added, regenerate the lock with `npx npm@10 install` and verify `npx npm@10 ci` before pushing. (Phase 4 likely adds no deps.)

## Open questions (plan-time)

- Exact migration split (0013–0015 vs fewer files).
- The `quantity_source` `params` shape per source kind (e.g. element_count: `{categoryId?}` or `{department?}`; dood_cast_days: `{personId}`; shoot_day_count: `{dayType?}`) — settle in `schema.ts` as a discriminated union; keep it the soft seam.
- Whether the default-chart seed carries the v0 `suggestedRate` values as starting rates or leaves rates blank (lean: blank rates, real account/line structure).
- Whether account detail supports inline nesting (parent_account_id) in v1 UI or renders a flat per-section list with the hierarchy as a later refinement (lean: flat-by-section v1; nesting is data-ready).
