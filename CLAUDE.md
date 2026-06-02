# StudioFlow — Architecture Charter

Guidance for AI agents and developers working in this repo. This is the **load-bearing summary**; the full reasoning lives in [`docs/superpowers/specs/2026-06-02-studioflow-platform-design.md`](docs/superpowers/specs/2026-06-02-studioflow-platform-design.md). When this file and the spec disagree, the spec wins — and fix this file.

<!-- BEGIN:nextjs-agent-rules -->
> **This is not the Next.js you know.** This project uses Next.js 16 (App Router, React 19) — APIs, conventions, and file structure may differ from older versions in your training data. Check `node_modules/next/dist/docs/` or current docs (via the context7 MCP) before writing framework code, and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## What StudioFlow is

A film/media **pre-production platform** built around one idea: a single shared **production graph** that every module reads from and writes to — so *"change the script → the schedule, budget, and call sheets update"* falls out of the data structure rather than being re-implemented per module. The first slice is the pre-pro planning core: **Script → Breakdown → Schedule → Budget → Call Sheets.**

This is a **fresh foundation** with the old v0 prototype preserved in `legacy/` as a UI parts bin (see below). We are deliberately building the focused, genuinely-useful v1 — **not** the PRD-V3 "replace 10+ tools" fantasy. Hold that line.

## The non-negotiables

These are the architectural invariants. Violating one is a defect, not a style choice.

1. **RLS is the single security boundary.** Authorization lives in Postgres via Row-Level Security, scoped by the authenticated session (`auth.uid()` / membership). Not in fifty scattered app-code checks. Every user-data table enables RLS *and* has explicit policies. The `service_role` key never reaches the browser.
2. **One typed contract.** Zod schemas are the source of truth for shapes crossing the wire; DB row types come from generated `lib/db/types.ts`. Model changes must surface as **compile errors**, not silent runtime bugs. Regenerate types after every migration.
3. **Thin clients, smart server.** The cleverness lives in server-side, independently-testable services (data layer, derivation engine, import adapters, AI breakdown, doc generation). Clients render and capture input; they don't hold business logic.
4. **Validate at the server boundary, always.** Every server action / route handler re-parses input with Zod before touching data. Client validation is UX; server validation is truth.
5. **Immutable identity, mutable presentation.** Stable ids (e.g. `scene_id`) are decoupled from human-facing, versioned, reorderable values (e.g. `scene_number`). Never key downstream data to a mutable display value — that's the #1 data-loss bug in competitors, and we design it out.
6. **Non-destructive by default.** Imports and bulk ops **stage → diff → apply**; never silently drop data. Actuals and audit data are append-only ledgers. AI output is non-destructive *suggestions* a human confirms before it flows downstream.
7. **Vertical slices, not horizontal layers.** Every phase ships its full stack (UI → API → service → DB → tests) together and is demoable. We never build "all the DB, then all the API, then all the UI" — that's what produced the prototype's 20 non-functional shells.

## The stack

| Layer | Choice |
|---|---|
| Web framework | **Next.js 16** (App Router, React 19, TypeScript) |
| Styling / UI | **Tailwind v4 + shadcn/ui**, the locked **"Tungsten & Sage"** design system (dark *Umber* + light *Kraft*) — see [design foundation spec](docs/superpowers/specs/2026-06-02-studioflow-design-foundation.md) |
| Backend | **Supabase** — Postgres (the production graph) + Auth + Storage + Realtime |
| Data access | **supabase-js + generated types** (so RLS is enforced by the user's session). Drizzle deferred (revisit ~Phase 4). |
| Validation | **Zod** (shared client + server) |
| Desktop | **Tauri v2** wrapper (same app) |
| AI | **Gemini Flash** behind the **Vercel AI SDK** (provider-swappable) |
| Async jobs | Managed runner (Inngest / Trigger.dev / Vercel Workflow — settled at Phase 2) |
| Tests | **Vitest + Testing Library** |
| CI / deploy | **GitHub Actions + Vercel** |

## Where things live

```
app/<route>/                 Routes, pages, route handlers
app/<route>/actions.ts       "use server" actions: parse → data layer → revalidate
lib/<domain>/schema.ts       Zod schemas + inferred types (the typed contract)
lib/<domain>/data.ts         Typed data layer — the ONLY place Supabase queries live per domain
lib/supabase/{server,client,middleware}.ts   The three Supabase clients
lib/db/types.ts              Generated DB types (npx supabase gen types) — do not hand-edit
components/<domain>/         UI components
supabase/migrations/         Forward-only SQL migrations (+ RLS policies)
src-tauri/                   Tauri desktop shell
legacy/                      The v0 prototype — reference & UI parts bin (see below)
docs/                        Spec, plans, product overview, design-system notes
.claude/agents/              Project subagents (see below)
```

## The `legacy/` rule

`legacy/` is the old v0 clickable prototype — a **visual reference and parts bin**, not a foundation. It's intentionally excluded from typecheck/build (it won't compile against the new app). **Read it, don't run it.** Port *look and interaction* into the new app via the `v0-ui-porter` agent; never `git mv` it back in. Its mock-data/trapped-state architecture stays buried.

## How we build (per-module loop)

🧠 Brainstorm → 📄 Spec → 📋 Plan (bite-size tasks) → ⚙️ Execute (TDD, in an isolated worktree, subagents for independent tasks) → 🔍 Code review → ✅ Verify in the real app → 🔀 Merge.

- **TDD is the default.** Write the failing test → see it fail → implement → see it pass → commit. Tests assert real behavior, not that a mock fired. (superpowers:test-driven-development)
- **Use worktrees** for feature work (superpowers:using-git-worktrees).
- **Prove RLS with tests:** two users, assert isolation. Guard live-DB tests with `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)` so CI stays green without a database.

## Commands

```bash
npm run dev          # dev server (Turbopack) at http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest (run once)
npm run test:watch   # Vitest watch

# Supabase (local)
npx supabase start   # local Postgres/Auth; prints API URL + anon + service_role keys
npx supabase migration up
npx supabase gen types typescript --local > lib/db/types.ts

# Desktop
npm run desktop:dev  # Tauri shell (needs the dev server running; Rust toolchain required)
```

Environment lives in `.env.local` (gitignored); see `.env.example`. Never commit secrets; `service_role` key is server/test only.

## Project subagents (`.claude/agents/`)

Dispatch the specialist whose domain matches the task:

- **`supabase-rls-specialist`** — schema, migrations, RLS policies, auth triggers, type generation.
- **`nextjs-data-layer`** — server actions, route handlers, the typed data layer, Zod contracts, SSR clients.
- **`design-foundation`** — the locked "Tungsten & Sage" design system: tokens (Umber/Kraft), the amber-action / sage→amethyst-AI rule, signature devices, shadcn baseline, nav shell, density, a11y.
- **`v0-ui-porter`** — lifting v0 components into the real app, wired to real data and the design system.

Domain agents for later phases (Fountain/FDX import, derivation engine, AI breakdown, PDF/doc generation) are added just-in-time at the phase that needs them.

## Build order (where we are)

Phase 0 (walking skeleton) → Phase 1 (script import) → Phase 2 (breakdown + AI) → Phase 3 (schedule) → Phase 4 (budget) → Phase 5 (call sheets) → **⭐ v1 milestone** → Phase 6 (granular permissions) → Phase 7 (desktop + mobile-read + polish). Detail in the spec §6.3 and the per-phase plans under `docs/superpowers/plans/`.
