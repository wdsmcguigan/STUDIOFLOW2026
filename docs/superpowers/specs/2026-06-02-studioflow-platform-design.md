# StudioFlow — Platform Design Spec

> **Status:** Draft for review
> **Date:** 2026-06-02
> **Scope of this doc:** The foundational rebuild — vision, data model, architecture, and development workflow for the pre-production planning core. UI/UX foundation and per-module UX are separate, sequenced workstreams (see §9).

---

## 1. Vision & Reality Check

StudioFlow is a film/media **pre-production platform** built around one idea: a single shared **production graph** that every module reads from and writes to, so that *"change the script → the schedule, budget, and call sheets update"* falls out of the data structure rather than being re-implemented in each module.

**Honest framing (the reality check that shaped this plan):**

- The prior PRDs ranged from a sane pre-production tool (`PRD.md`) to an industry-spanning fantasy (`StudioFlow PRD V3.md` — "replace 10+ tools, 200+ integrations, petabyte version control, VR scouting"). The latter is hundreds of person-years and is explicitly **not** the target. This spec deliberately holds the line against that scope.
- The existing v0 codebase (~31K lines of Next.js/TSX across ~20 module shells) is a high-fidelity **clickable prototype** with no persistence, mock data everywhere, and state trapped in `app/page.tsx`. It is a valuable **design reference and UI parts bin**, not a foundation.
- **Decision: fresh foundation, port UI in.** Build a clean, well-architected project and lift over v0 components (for look/UX) as each real module is built and wired to real data.

**Goal sequencing.** The driver is "all of the above" (useful-to-me, learning, portfolio, possibly commercial), resolved by sequencing rather than choosing: build something **focused and genuinely useful for real productions first**, on a foundation that scales, and let commercial viability remain a *door left open*, not a spec built to.

---

## 2. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Build vs rebuild | **Fresh foundation, port v0 UI in** | v0 UI is reusable; its state architecture is not |
| First slice | **Pre-pro planning core** (Script→Breakdown→Schedule→Budget→Call Sheets) | Most interconnected, most AI leverage, highest differentiation |
| Web framework | **Next.js** (keep v0 investment) | Reuse UI; strong ecosystem |
| Desktop | **Tauri** wrapper (same app) | ~3–10 MB vs Electron's 100–200 MB; no bundled browser to maintain |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | Fewest moving parts for a solo builder; RLS powers permissions |
| Offline | **Not in v1** — "native feel, online is fine" | Pre-pro is desk work; choosing Postgres keeps a sync engine (PowerSync/Electric) as a later addition, not a rewrite |
| AI provider | **Gemini Flash**, behind the Vercel AI SDK | Cheapest hosted option + zero ops; swappable to Gemma later for scale/privacy with no migration |
| Heavy work | **Async, cancellable, concurrent jobs** via a managed runner (Inngest/Trigger.dev) | Non-blocking UX; safe to cancel because AI output is non-destructive suggestions |
| Budget depth (v1) | **Estimator + Actuals**, with dormant seams for accounting-grade | User wants room for full accounting-grade with no future migration |
| Permissions (v1) | **Full granular** (roles, per-module grants, per-field sensitivity, time-bounded), via RLS | User chose this; sequenced *after* the core loop is usable (Phase 6) |

---

## 3. Scope Boundaries (v1 vs later)

**In v1 (the usable milestone after Phase 5):** Script import (Fountain/FDX) → AI-assisted breakdown → stripboard scheduling with conflict detection & Day-Out-of-Days → budget (estimator + actuals ledger + POs + lock/baseline) → call-sheet generation. Granular permissions (Phase 6). Tauri desktop + mobile-read views (Phase 7).

**Designed-but-deferred (seams exist, build later):** tax-incentive/qualified-spend, multi-currency, version-diff tag reconciliation across drafts, realtime co-editing, dependency edges as stored data, on-set offline sync.

**Explicitly out of scope:** the PRD-V3 ambitions (petabyte version control, 200+ integrations, VR, blockchain, etc.).

---

## 4. The Production Graph (Data Model)

The **Scene** is the atomic unit. Every module is a view/operation on these shared entities.

### 4.1 Core entities

- **Project** — the production. Produced-by → Organization.
- **Script / ScriptVersion** — Fountain-based, versioned. Has `locked` state + revision color. A/B-page suffixes supported.
- **Scene** — **immutable `scene_id`** decoupled from the mutable, versioned `scene_number` (and letter suffixes, lock state). Attributes: INT/EXT, D/N, script-day, synopsis, stored page-**eighths**. *(Keying breakdown to scene number is the #1 data-loss failure in every competitor; we avoid it structurally.)*
- **SceneSegment** — a portion of a Scene (in eighths). **The schedulable unit is the segment, not the scene**, so scenes can be split across days without losing breakdown.
- **Element** — a breakable item (props, wardrobe, vehicles, SFX, VFX, set dressing, etc.). Project-level catalog. Has category. May be supplied-by → Organization (vendor).
- **SceneElement** — the many-to-many link Scene↔Element. Carries: **provenance** (auto/manual), **confidence**, review **status** (suggested/confirmed/rejected), a **text-anchor** to the script range that produced it, and an optional **segment scope**. *Auto-suggested links never flow downstream until confirmed.*
- **Character** — narrative role. Has an **alias set** (the names the script uses) and a **merge** operation. Cast↔scene link carries **presence-type** (speaking / silent-featured / background / voice-only).
- **Person** — any human (cast or crew). Contact, rate, availability, deal memo. **Lives at org level**, linked into projects (reused across projects, never re-entered). Cast = Person plays a Character; Crew = Person holds a Position.
- **Department** — the hinge connecting **element category ↔ crew ↔ budget account**. Has a flagged **head** (a Person).
- **Position** — Director, 1st AD, PA, DP, Gaffer, IC, etc. Belongs to a Department.
- **Location** — real-world address with **geo + timezone**. Has a **Set/Area** sub-level (one address → many sets). Distinct from the script-location slug, which resolves to a Set.
- **Organization** — production company, talent agency, vendor/rental house, payroll co, insurer.

### 4.2 Scheduling entities

- **ShootDay** — has `day_type` (prep/build/prelight/shoot/strike/travel/wrap), studio-vs-location flag, and a **`unit`** (Main/2nd/Splinter). One calendar date → many ShootDays (one per unit).
- **Strip** — ordered *within* a ShootDay. **Subtypes:** scene-strip (→ SceneSegment), day-break, banner (meal/company-move/note). Ordering within a day so re-sort can't delete day breaks.
- **CastDayStatus** — (Person × date) status: Work/Hold/Start/Finish/Travel/Drop/Pickup → real Day-Out-of-Days, rule-driven.
- **Conflict detection & company-move** — derived: cast/location/gear can't be in two units on one date; address changes between consecutive Sets surface a company move.

### 4.3 Budget entities

- **BudgetAccount** — configurable hierarchy (Topsheet ← Account ← Line, optional 4th sub-level), code-mask configurable for Movie Magic round-trip. Maps to a Department.
- **BudgetLineItem** — dimensions: `account`, `department`, `phase`, `calc_type` (labor = days×rate(+OT) / unit = qty×unit_cost / flat), `estimate`, and links to Element/Scene/Person/Vendor. Quantities **auto-derive** from the graph (talent-days from schedule×characters; crew-days from day-types×positions; element accounts from element counts; location costs from locations×location-days). User enters only rates/unit-costs. **Dormant seams (nullable):** `currency`, `fx_rate`, `qualifies_for_incentive`, `jurisdiction_id`.
- **BudgetTransaction** — append-only actuals ledger (date, vendor, invoice/PO ref). `actual` is a rollup of these, not a scalar.
- **PurchaseOrder / commitment** — feeds a `committed` figure; converts to actual on invoice.
- **Fringe** — line-level, with **caps/cutoffs**, **per-Person aggregation** (fringe ranges), and explicit **stacking order**. Distinct from:
- **Global** — named reusable scalar (shoot-weeks, prep-days) referenced by calcs; one edit cascades.
- **Group** — arbitrary cross-account subtotal set, independent of the account tree.
- **BudgetVersion** — immutable locked baseline; variance computed against the baseline; what-if scenario branches.
- **Dormant satellite tables:** `Jurisdiction`, `IncentiveProgram` (exist empty; activated later with no migration).

### 4.4 Cross-cutting entities

- **Membership + Role** — project membership with roles (Producer/UPM/Coordinator/Accountant/Department-Head/Crew/Viewer), per-module grants, per-field sensitivity, validity windows (time-bounded; auto-revoke at wrap). Enforced by **RLS**.
- **Job** — `{type, status, progress, project_id, created_by, params, result, error, cancellable}`. Powers the activity/queue panel. Idempotent.
- **AuditLog** — who changed what, when; point-in-time snapshots.
- **Import staging** — adapters land data in a staging area for diff-before-apply (non-destructive).

---

## 5. System Architecture

A **control plane** over a single Postgres production graph. Thin clients; the clever work runs server-side as independently-testable, swappable services.

```
Clients (thin, same Next.js app)
  Web (heavy prep UI) · Tauri desktop (native feel) · Mobile-read views (on-set call sheets)
        ↕  typed, authenticated API
Control plane (Next.js server)
  Route Handlers / Server Actions · Auth middleware → RLS context · Zod validation (shared client+server)
        ↕  orchestrates
Services (server-side, swappable)
  AI Breakdown Engine (LLM via Vercel AI SDK → suggested SceneElements)
  Import Adapters (Fountain/FDX → stage → diff → graph, non-destructive)
  Derivation Engine (budget qty · DOOD · conflicts; dirty-flag + recompute)
  Doc Generation (call-sheet / report PDFs)
        ↕  reads/writes
Supabase
  Postgres = the Production Graph (RLS = permissions, audit log) · Auth · Storage · Realtime
```

**Principles:** (1) thin clients, smart server — services are testable and model-swappable; (2) one typed contract (Zod ↔ DB types) so model changes ripple as type errors, not silent bugs; (3) permissions live in the database via RLS — one security boundary, not fifty scattered checks.

**Async jobs:** AI breakdown and large imports run as cancellable, concurrent background jobs via a managed runner (Inngest/Trigger.dev). Bounded concurrency respects Gemini rate limits. Cancellation is always safe because AI output is non-destructive suggestions. UX = a job-queue panel; the user keeps working while jobs run.

---

## 6. Development Workflow

### 6.1 Per-module loop (run once per phase)

🧠 Brainstorm → 📄 Spec → 📋 Plan (bite-size tasks) → ⚙️ Execute (TDD, in an isolated worktree, subagents for independent tasks) → 🔍 Code review → ✅ Verify in the real app → 🔀 Merge.

### 6.2 Vertical slices, not horizontal layers

Each phase ships its full stack (UI → API → service → DB → tests) together. We never build "all the DB, then all the API, then all the UI" — that's what produced the prototype's 20 non-functional shells. Every phase is demoable.

### 6.3 Build order

- **Phase 0 — Walking skeleton.** Fresh Next.js + Supabase + core graph schema + Auth + owner-RLS + Tauri stub + CI/deploy. Log in → create project → deploy. Proves the whole stack end-to-end.
- **Phase 1 — Script import (the wedge).** Fountain + FDX adapter (stage → diff → apply, non-destructive). Scenes appear instantly. Delivers the import-first "wow."
- **Phase 2 — Breakdown + AI engine.** Manual tagging (Character aliases/merge, presence-type) → async AI breakdown (suggested SceneElements) + review/confirm UI. Job queue panel.
- **Phase 3 — Schedule.** SceneSegment + Strip subtypes + ShootDay (day_type, unit) + stripboard + Location→Set. Derivation Engine v1: conflicts + DOOD.
- **Phase 4 — Budget.** Configurable accounts + line dimensions + Fringe (caps/ranges) + Globals/Groups + derivation v2 (auto-fill quantities) + Actuals ledger + POs + lock/baseline. Reproduce `BusinessBudget.xls` as template #1.
- **Phase 5 — Call Sheets.** Live projection from ShootDay + CallTime scoping + versioning + distribution/confirm + PDF + sun/weather.
- **⭐ Milestone: the v1 you actually use** — full loop on real data, "change a scene → everything updates" enforced by integration tests.
- **Phase 6 — Granular permissions + collaboration.** Roles, per-module grants, per-field sensitivity (RLS), time-bounded access, audit log. *Sequenced after the loop is usable solo.*
- **Phase 7 — Desktop + mobile-read + polish.** Tauri packaging, on-set mobile call-sheet views, port remaining v0 UI.
- **Phase 8+ — Later horizons.** Accounting-grade (incentives/currency), realtime co-edit, Storyboard/Previs reading the graph, on-set offline sync.

### 6.4 What makes modules interconnect (and stay that way)

1. **Shared schema + typed contract** — modules read/write the graph through one typed data layer.
2. **The Derivation Engine is the interconnection** and gets its own test suite (graph state X → budget qty / DOOD / conflict Y).
3. **Cross-module integration tests** encode the thesis ("edit scene → schedule flags → budget recalcs → call sheet regenerates") as tests that must stay green.

---

## 7. Adoption Principles (from competitor pain-point research)

1. **Import-first onboarding.** First run = import a script → instantly see breakdown + draft schedule + budget skeleton. The empty-project cold start is the #1 adoption killer.
2. **Non-destructive imports.** Stage → diff → confirm; never silently drop scenes. One data-loss event = permanent churn.
3. **Genuinely one model.** If users ever re-key between modules, we're just a pricier StudioBinder. This is the whole differentiator.
4. **Export anytime** (FDX/xlsx/PDF/CSV) — kills lock-in anxiety, a stated buying objection.
5. **Pricing that doesn't punish inviting the crew** (later concern, but don't gate cross-project People).

---

## 8. Risks

- **Scope creep** back toward PRD-V3. Mitigation: the v1 boundary (§3) and the "dormant seams, build later" discipline.
- **v1 grew** with full permissions + actuals. Mitigation: permissions sequenced to Phase 6; actuals built on the ledger we need anyway.
- **AI breakdown quality.** Mitigation: suggestions are non-destructive and confirmed by a human; quality measured against known scripts.
- **Solo bandwidth.** Mitigation: vertical slices keep a usable product at every milestone; managed services (Supabase, job runner) minimize ops.
- **Research caveat:** some competitor findings lean on vendor docs rather than raw user complaints; re-validate severity before it drives priority.

---

## 9. UI/UX Workstream (sequenced, not monolithic)

- **Not** one big upfront UI spec (would be speculative and stale; v0 is the visual reference).
- **Design foundation** (nav shell, design tokens, "cinematic dark" theme, shadcn baseline, responsive/a11y rules) = a focused brainstorm using the **frontend-design** skill, companion to Phase 0. Best done as its own session with this spec + the v0 prototype as inputs.
- **Per-module UX** = brainstormed just-in-time at the top of each phase's loop.

---

## 10. Open Questions

- Production type focus for the seed templates (narrative feature assumed; commercials/docs differ in breakdown emphasis)?
- ORM/data-access choice (Drizzle vs Supabase-generated types) — to settle at Phase 0 planning.
- Managed job runner: Inngest vs Trigger.dev vs Vercel Workflow — to settle at Phase 2 planning.
- Exact seed roles/permissions matrix for Phase 6.

---

## 11. References & Prior Art

> Full competitor pain-point research with citations lives in the companion doc: `2026-06-02-studioflow-competitor-research.md`. The original open-source survey is `documentation/Open Source Production App Modules.md`. **Caveat on that survey:** most of its tools (Gaffer, Natron, xSTUDIO, OpenRV, OCIO/OIIO, Rez) are heavy desktop C++/Python apps for VFX *finishing facilities* — not embeddable in a web app, and out of scope for the pre-pro core. Only the subset flagged "now-relevant" below applies to v1.

### 11.1 Standards & formats (support / interop)

| Format | Use | Notes |
|---|---|---|
| **Fountain** (fountain.io) | Primary script import/export | Plain-text screenplay markup; can't carry dual-dialogue/pagination — store those as first-class fields, don't infer from Fountain |
| **Final Draft XML (.fdx)** | Primary script import | *The* interchange format; carries scene boundaries + who's in each scene |
| **Movie Magic (.mmb / .mms)** | Budget/schedule import (later) | Proprietary; round-trip via MMB's XML export + Category/Account/SubAccount/Set code mask |
| **AICP** | Commercial budget template (later) | Standard topsheet for commercials |
| **OpenTimelineIO** (Apache 2.0) | Editorial interchange (later/adjacent) | For when post/editorial modules arrive; not pre-pro |

### 11.2 Open-source libraries & projects to use or reference

**Now-relevant (pre-pro core):**
- **Fountain parsers** (e.g. `fountain-js` and similar) — script ingestion; reference for parsing heuristics.
- **PDF generation** — `@react-pdf/renderer`, `pdfmake`, or HTML→PDF via Playwright/Puppeteer (`pdf-lib` for low-level) — call sheets & reports.
- **TanStack Table + TanStack Virtual** — the budget grid and large stripboard/DOOD tables.
- **dnd-kit** — stripboard drag-reorder, breakdown tagging.
- **SunCalc** — sunrise/sunset for call sheets (+ a weather API).
- **Vercel AI SDK** — LLM abstraction (provider-swappable).
- **Inngest / Trigger.dev / Vercel Workflow** — durable, cancellable, concurrent async jobs.
- **Supabase · Drizzle · Zod · shadcn/ui · Tauri** — the core stack.

**Adjacent / later:**
- **CGWire Kitsu / Zou / Gazu** (AGPL/LGPL) — VFX/animation *production tracking*. Schema doesn't fit pre-pro (no breakdown/stripboard/budget-accounts), but a strong reference if we ever add VFX-task tracking.
- **AYON / OpenPype** — pipeline orchestration (note: AYON is now Functional Source License — restricts SaaS wrappers; OpenPype archive is Apache 2.0).
- **FFmpeg / ffmpegio** — transcode/proxy/dailies (later).
- **PowerSync · ElectricSQL · Turso (libSQL)** — Postgres↔local-SQLite sync engines for the *offline* phase; all bolt onto our Postgres, so offline is an addition, not a rewrite.

### 11.3 Commercial products — what to learn from each

| Product | Reference it for | Watch out for (their pain points) |
|---|---|---|
| **StudioBinder** | All-in-one UX, stripboard, call sheets, breakdown UX | Scene-number-keyed tags (data loss on renumber); no real budget; modules feel siloed |
| **Movie Magic Scheduling** | Stripboard + Day-Out-of-Days conventions | Offline/single-seat; no .mms import elsewhere; "DOOD do-not-match" bugs |
| **Movie Magic Budgeting** | Account structure, Fringes/Globals/Groups, the budgeting mental model | Proprietary format; no actuals connection; steep learning curve |
| **Filmustage** | AI script breakdown UX, re-breakdown-on-revision | AI false positives; "more work to fix than do by hand" if unreviewed |
| **Yamdu** | Granular per-position permissions, auto-revoke at wrap (model our Phase 6 on this) | Limited data export; breakdown-accuracy gaps drop items from call sheets; gates cross-project contacts (don't copy that) |
| **Celtx / Studiovity** | Indie all-in-one positioning, pricing | Fragile imports/data loss; clunky module transitions; export limits |
| **Set Hero / Croogloo** | Call-sheet distribution, read-receipts/confirmation | Clunky/buggy mobile; no offline |
| **Saturation.io** | Modern cloud budgeting + cost-report (committed/actual/EFC) | Reference for the accounting-grade *later* phase |
| **Wrapbook** | Payroll/accounting integration model | The actuals/payroll side we interop with, not rebuild |
| **Frame.io** | Media review/annotation | The review/dailies phase, later |

### 11.4 Key pain-point sources (most load-bearing)

- Scene-number tag loss: [StudioBinder — scene numbering](https://www.studiobinder.com/blog/scene-numbering/) · [why tagged elements disappear](https://support.studiobinder.com/en/articles/3009805-why-did-my-tagged-elements-disappear)
- Splitting scenes / auto-reorder deletes day breaks: [split a scene](https://www.studiobinder.com/blog/how-to-split-a-scene-for-scheduling/) · [auto-reorder](https://support.studiobinder.com/en/articles/419884-auto-reorder-scene-strips)
- AI breakdown false positives: [noamkroll Filmustage review](https://noamkroll.com/review-testing-filmustages-ai-powered-script-breakdown-app-on-a-feature-film/)
- Day-Out-of-Days rules: [EP — MMS DOOD Do-Not-Match](https://entertainmentpartners.my.site.com/s/article/Movie-Magic-Scheduling-MMS-Day-Out-of-Days-DOOD-Do-Not-Match) · [DOOD Rules](https://mms-docs.ep.com/DayOutofDays/DOODRules.html)
- Budget Fringes/Globals/Groups + caps: [MMB apply tools](https://mmb-docs.ep.com/ApplyTools/Apply_Tools_Overview.html) · [MMB fringes](https://mmb-docs.ep.com/Setup/fringes.html)
- Estimate→committed→actual / cost reports: [Saturation cost report](https://saturation.io/blog/production-cost-report)
- Character aliases/merge: [StudioBinder merge cast](https://support.studiobinder.com/en/articles/419692-how-to-merge-multiple-cast-members)
- Fountain data-loss caveats: [fountain.io FAQ](https://fountain.io/faq/)
- Granular permissions model: [Yamdu collaborate](https://yamdu.com/en/communicate-and-collaborate/)
