# StudioFlow

A film/media **pre-production platform** built around a single shared **production graph** — so *"change the script → the schedule, budget, and call sheets update"* falls out of the data structure instead of being re-implemented in every module. The first slice is the pre-pro planning core: **Script → Breakdown → Schedule → Budget → Call Sheets.**

> New here? Read [`CLAUDE.md`](CLAUDE.md) (the architecture charter) and [`docs/OVERVIEW.md`](docs/OVERVIEW.md) (the product overview). Deep specs live in [`docs/superpowers/specs/`](docs/superpowers/specs/); per-phase plans in [`docs/superpowers/plans/`](docs/superpowers/plans/).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) · **Tailwind v4 + shadcn/ui**
- **Supabase** — Postgres (the production graph), Auth, Storage, Realtime; **RLS** is the single security boundary
- **Zod** typed contracts (shared client + server) · data access via **supabase-js + generated types**
- **Vitest + Testing Library** · **GitHub Actions** CI · **Vercel** deploy · **Tauri v2** desktop shell
- Design system: the locked **"Tungsten & Sage"** identity (dark *Umber* + light *Kraft*)

## Prerequisites

- **Node.js 20+** and npm
- **Supabase CLI** (`npx supabase` works) + a free Supabase account for hosted deploy
- A **Vercel** account for deploy
- **Rust toolchain** (via [rustup](https://rustup.rs)) — only for the Tauri desktop build

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase (Postgres + Auth). Prints API URL, anon key, service_role key.
npx supabase start

# 3. Configure environment — copy the template and paste the values supabase printed
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...        # server/test only — never shipped to the browser

# 4. Apply migrations and generate typed DB types
npx supabase migration up
npx supabase gen types typescript --local > lib/db/types.ts

# 5. Run the app
npm run dev          # http://localhost:3000
```

Local Supabase captures auth/magic-link emails in **Inbucket** (`http://127.0.0.1:54324`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest watch |
| `npm run desktop:dev` | Tauri desktop shell (needs `npm run dev` running + Rust) |

The RLS integration tests need a live local Supabase; they self-skip when `SUPABASE_SERVICE_ROLE_KEY` is unset, so `npm test` stays green in CI without a database.

## Project structure

```
app/                  Routes, pages, server actions ("use server")
lib/<domain>/         schema.ts (Zod contract) · data.ts (typed data layer)
lib/supabase/         server / client / middleware Supabase clients
lib/db/types.ts       Generated DB types (do not hand-edit)
components/<domain>/   UI components
supabase/migrations/  Forward-only SQL migrations + RLS policies
src-tauri/            Tauri desktop shell
docs/                 Specs, plans, mockups, product overview
legacy/               The v0 prototype — visual reference & parts bin (NOT built/run)
.claude/agents/       Project subagents (supabase-rls, data-layer, design-foundation, v0-ui-porter)
```

`legacy/` holds the original v0 clickable prototype. It is preserved as a **design reference and UI parts bin** and is intentionally excluded from build/typecheck — read it, don't run it.

## Roadmap

Phase 0 (walking skeleton) → Phase 1 (script import) → Phase 2 (breakdown + AI) → Phase 3 (schedule) → Phase 4 (budget) → Phase 5 (call sheets) → **⭐ v1** → Phase 6 (permissions) → Phase 7 (desktop + mobile-read + polish). See [`docs/OVERVIEW.md`](docs/OVERVIEW.md).
