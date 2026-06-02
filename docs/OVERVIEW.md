# StudioFlow — Product Overview

> A higher-altitude tour of *what* StudioFlow is and *why* it's built this way. For the engineering charter see [`/CLAUDE.md`](../CLAUDE.md); for full detail see the specs in [`superpowers/specs/`](superpowers/specs/).

## The idea

StudioFlow is a **film/media pre-production platform**. Its one differentiating bet: a single shared **production graph** that every module reads from and writes to. Because the data is genuinely one model, *"change the script → the schedule, budget, and call sheets update"* is a property of the structure — not a feature re-coded in each module.

If users ever have to re-key information between modules, we've failed the thesis and we're just a pricier point tool. **Genuinely one model** is the whole product.

## What it does (v1)

The interconnected pre-pro planning core, shipped as vertical slices:

1. **Script import (the wedge).** Import Fountain / Final Draft (.fdx). Scenes appear instantly. Imports are **non-destructive** — stage → diff → confirm; never silently drop a scene.
2. **Breakdown + AI.** Tag elements (props, cast, wardrobe, vehicles, SFX…) per scene. An AI engine *suggests* breakdown; suggestions are non-destructive and a human confirms before anything flows downstream.
3. **Schedule.** Stripboard scheduling on schedulable **segments** (so scenes can split across days without losing breakdown), with conflict detection and Day-Out-of-Days.
4. **Budget.** Configurable accounts, fringes/globals/groups, quantities that **auto-derive** from the graph (talent-days from schedule × characters, etc.), an actuals ledger, POs, and lockable baselines.
5. **Call sheets.** Generated live from the schedule, with call-time scoping, versioning, distribution/confirm, and PDF output.

**⭐ The v1 milestone** is the full loop working on real data — *"edit a scene → schedule flags → budget recalcs → call sheet regenerates"* — enforced by cross-module integration tests.

Later: granular permissions + collaboration (Phase 6), desktop + on-set mobile-read + polish (Phase 7), and deferred horizons (accounting-grade incentives/currency, realtime co-edit, offline sync) for which the schema already leaves dormant seams.

## Why these choices

- **One production graph in Postgres.** The Scene is the atomic unit; every module is a view/operation over shared entities. Stable ids (`scene_id`) are decoupled from mutable display values (`scene_number`) — keying to the mutable number is the #1 data-loss bug in competitors, designed out here.
- **RLS is the single security boundary.** Permissions live in the database (Row-Level Security), not in scattered app-code checks.
- **Thin clients, smart server.** The clever work (derivation engine, import adapters, AI breakdown, doc generation) runs server-side as independently-testable, swappable services.
- **Vertical slices, not horizontal layers.** Every phase ships UI → API → service → DB → tests together and is demoable. This is the explicit antidote to the v0 prototype's 20 non-functional shells.

## Scope discipline

This is deliberately the **focused, genuinely-useful v1** — *not* the "replace 10+ tools, 200+ integrations, VR scouting" fantasy of prior PRDs. Commercial viability is a door left open, not a spec built to. Out of scope: petabyte version control, 200+ integrations, blockchain, VR, and the rest of PRD-V3.

## Design identity — "Tungsten & Sage"

The look is **locked** (see [`superpowers/specs/2026-06-02-studioflow-design-foundation.md`](superpowers/specs/2026-06-02-studioflow-design-foundation.md), with mockups in [`superpowers/mockups/`](superpowers/mockups/)): a warm, lit, slightly-analog studio tool — the opposite of cool-blue/green SaaS. Warm earthy surfaces (dark *Umber* / light *Kraft*), a **tungsten-amber** brand for action, and a **sage→amethyst gradient reserved exclusively for AI**. Signature touches: a tungsten-filament hairline and subtle film grain. Status colors (green/amber/red) are sacred — schedule/conflict/budget only, never decoration.

## The v0 prototype (`legacy/`)

The repo began as a ~31K-line v0 clickable prototype — high-fidelity look, but no persistence, mock data everywhere, and state trapped in one component. **Decision: fresh foundation, port the UI in.** The prototype now lives in `legacy/` as a visual reference and parts bin; its look gets lifted into the real app (wired to real data) module by module, while its architecture stays buried.

## How we build

Per-module loop: 🧠 Brainstorm → 📄 Spec → 📋 Plan → ⚙️ Execute (TDD, isolated worktree, subagents for independent tasks) → 🔍 Code review → ✅ Verify in the real app → 🔀 Merge. Specs and bite-size plans for each phase live under [`superpowers/`](superpowers/).
