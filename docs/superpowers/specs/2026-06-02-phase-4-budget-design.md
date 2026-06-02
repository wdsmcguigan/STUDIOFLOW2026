# Phase 4 — Budget (Design Spec — LIGHT / PROVISIONAL)

> **Status:** Light provisional draft for async review · **Date:** 2026-06-02
> **Parent:** `2026-06-02-studioflow-platform-design.md` · **Depends on:** Phases 0–3 (confirmed breakdown + schedule exist to derive quantities from).
> **Provisional:** captures the warm budgeting research + the `BusinessBudget.xls` analysis + key decisions. Full deep-dive + plan happen closer to building — budget is the most derivation-dependent module, so it benefits most from being designed after the engine is real.
> **Source research:** budget agent report in `2026-06-02-studioflow-competitor-research.md` (§C); `documentation/v1 SRC/BusinessBudget.xls` (a real ~$1.8M indie feature budget → seed template #1).

## Goal

A budget where **quantities derive from the production graph** (you enter rates, not counts), tracked **estimate → committed → actual** with **fringes**, locked baselines, and variance. The headline: change the script/schedule → budget quantities recompute.

---

## ⚠️ Decisions needed (provisional recommendations)

1. **Account hierarchy — RECOMMENDED: Topsheet ← Account ← Line, optional 4th sub-level, configurable code-mask, mapped to Department.** Don't hardcode; ship `BusinessBudget.xls` accounts A–N as seed template #1. → confirm.
2. **Line calculation — RECOMMENDED: typed `calc_type`** (labor = days×rate(+OT) / unit = qty×unit_cost / flat) with structured inputs, server-evaluated (not free-form cells). Derived values are read-only; only inputs editable. → confirm.
3. **Derivation vs override — RECOMMENDED: quantities auto-derive (read-only) with explicit manual override + flag**, and a **"show-the-math" trace** on every derived number (qty source × rate, fringes applied) so users trust it like a visible Excel cell. → confirm.
4. **Fringes / Globals / Groups — RECOMMENDED: three distinct concepts** (research: users conflate them). Fringe = % burden, line-level, with cap/cutoff + per-Person aggregation (fringe ranges) + explicit stacking order. Global = named reusable scalar (shoot-weeks). Group = cross-account subtotal set. → confirm modeling all three.
5. **Estimate + Actuals — CONFIRMED (platform decision): build the actuals ledger + POs now.** `actual` = rollup of a `BudgetTransaction` ledger; `PurchaseOrder` feeds `committed`; derive EFC + variance vs locked baseline. → confirm scope.
6. **Accounting-grade seams — dormant now, build later:** nullable `currency`/`fx_rate`/`qualifies_for_incentive`/`jurisdiction_id` columns + empty `Jurisdiction`/`IncentiveProgram` tables, so multi-currency + tax incentives activate later with **no migration**. → confirm seams.
7. **Versioning — RECOMMENDED: immutable `BudgetVersion` lock/baseline + scenario branches.** Variance computed vs the locked baseline. → confirm.

---

## Data model (additions)

- **BudgetAccount** — `{ id, project_id, parent_id?, code, name, level, department_id? }`. Configurable tree + code-mask.
- **BudgetLineItem** — `{ id, account_id, department_id, phase, calc_type, estimate, days?, rate?, qty?, unit_cost?, ot?, linked_element_id?, linked_scene_id?, linked_person_id?, vendor_org_id?, currency? (dormant), fx_rate? (dormant), qualifies_for_incentive? (dormant), jurisdiction_id? (dormant) }`.
- **BudgetTransaction** — `{ id, line_item_id, date, amount, vendor_org_id?, po_id?, invoice_ref?, qualified? (dormant) }`. Append-only; `actual` = sum.
- **PurchaseOrder** — `{ id, project_id, vendor_org_id, amount, status }`. Feeds `committed`; converts to transactions on invoice.
- **Fringe** — `{ id, project_id, name, percent, cap?, cutoff_basis?, apply_scope ('line'|'group'|'account'), stack_order }`.
- **Global** — `{ id, project_id, name, value }` (referenced by line calcs).
- **Group** — `{ id, project_id, name, member_line_ids[] }` (cross-account subtotal).
- **BudgetVersion** — `{ id, project_id, label, locked (bool), snapshot (jsonb), created_at }`.
- **Jurisdiction / IncentiveProgram** — created now, empty until the incentives feature ships.

## Key mechanics (derivation is the differentiator)

- **Auto-fill quantities** from the graph: talent-days = schedule days × characters; crew-days = day-type counts × positions; element-account quantities = confirmed element counts by category→department; location costs = locations × location-days. **User enters only rates/unit-costs.**
- **Recompute/dirty-flag** when script/schedule/breakdown change; the budget updates without re-entry. Each derived value exposes its derivation trace.
- **Fringes** apply by stack order to the right bases (e.g. from `BusinessBudget.xls`: P&W 27% on labor; insurance %; production fee 27%; contingency 10%).
- **Cost control:** estimate vs committed vs actual vs EFC, variance vs locked baseline, with alerts (the PRD's "budget overrun" promise).

## Testing

- Reproduce `BusinessBudget.xls` as a template and verify rollups/fringes match its totals (Grand Total $1,816,258, etc.).
- Derivation: add a scene with a character → talent-days for that actor increase; change shoot-day count → crew-days recompute.
- Fringe caps/ranges: per-Person cap stops at cutoff across multiple lines; stacking order correct.
- Actuals: transactions roll up to `actual`; PO feeds `committed`; variance vs locked baseline correct.
- Dormant seams compile and are ignored until activated (no behavior change).
- RLS (budget often has per-field sensitivity — coordinate with Phase 6 permissions).

## Done criteria

- A budget whose quantities derive from the schedule/breakdown; user enters only rates.
- Fringes (with caps/ranges/stacking), Globals, and Groups work and match a real template's totals.
- Estimate → committed → actual tracked with variance vs a locked baseline.
- Changing the script/schedule recomputes budget quantities — cross-module integration test stays green.
- Accounting-grade seams present and dormant (no migration needed to activate later).
