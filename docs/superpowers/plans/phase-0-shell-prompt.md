# Phase 0 — App Shell Build Prompt

> Hand-off prompt for the agent that will build the StudioFlow Phase 0 app shell
> using the locked "Tungsten & Sage" design foundation.
> Companion to: `../specs/2026-06-02-studioflow-design-foundation.md`

---

You are building the Phase 0 app shell for StudioFlow, a film/media pre-production
platform (Next.js 16 + Tailwind 3 + shadcn/ui). Work on branch
`claude/studioflow-foundation-design-NA4C4` in the existing repo. Commit and push to
that branch only; do not open a PR.

## Context: the design foundation is already locked

A prior design session produced and locked the visual identity ("Tungsten & Sage").
Read these first — they are the source of truth, don't re-decide anything in them:

- Written spec (READ FULLY):
  `docs/superpowers/specs/2026-06-02-studioflow-design-foundation.md`
  → full dark/light token tables, AI-gradient recipe, signature devices,
    component conventions, density, a11y rules.
- Canonical visuals (open in a browser to see the target):
  - `docs/superpowers/mockups/studioflow-foundation.html` (desktop shell + token style-tile)
  - `docs/superpowers/mockups/studioflow-onset-mobile.html` (separate on-set mobile surface)
  - `docs/superpowers/mockups/studioflow-signature-balanced.html` (final AI-accent reference)
- Platform context: `docs/superpowers/specs/2026-06-02-studioflow-platform-design.md`
  and `docs/superpowers/plans/2026-06-02-phase-0-walking-skeleton.md`

## Important: reuse the exact token code that was already written, then reverted

The tokens were wired into the live theme files in commit `53f10d1`, then deliberately
REVERTED (commit `59c9919`) because we didn't want to reskin the old v0 code prematurely.
That commit contains correct, build-verified `globals.css` / `tailwind.config.js` /
`layout.tsx` token code. Recover it with: `git show 53f10d1`

Use it as the basis for the theme layer — but apply the tokens to the NEW shell you build,
following the project's "fresh foundation, port v0 UI in" principle. Do NOT mass-retrofit
the old v0 module files in `app/` and `components/`.

## Your task: build the Phase 0 app shell as real components

A clean, token-driven application shell:

1. **Theme layer:** bring back the token wiring from `53f10d1` (shadcn HSL vars mapped to
   Umber=dark/Kraft=light, the `--sf-*` semantic tokens, signature-device utilities,
   Tailwind extensions, and the Bricolage Grotesque / Hanken Grotesk / JetBrains Mono
   fonts via next/font). Default the app to dark (Umber).
2. **Grouped sidebar nav** — phase-ordered groups (Develop → Plan → Shoot …), active item
   with the amber "tungsten filament" indicator, plus an "AI Assistant" entry marked by
   the sage→amethyst gradient dot.
3. **Command palette (⌘K)** — primary power-user surface; AI actions appear here, dot-marked.
4. **Contextual right panel + main content region** (placeholder content is fine).
5. **AI surfaces** use the locked treatment: neutral frosted-glass + sage→amethyst gradient
   trim + small gradient dot + the inner-glow + faint-amethyst-outer-halo shadow.
   The affirmative action inside an AI surface stays amber.

## Hard constraints (from the locked spec)

- Dark (Umber) is default; Light (Kraft) is a first-class theme toggle.
- Opaque, dense work surfaces; glass only for chrome (top bar, palette, panels, modals, AI).
- Two colors / two jobs: amber = action/human; sage→amethyst gradient = AI only.
  Status colors (ok/warn/error) are reserved — never decorative.
- Comfortable density default + a Compact toggle for heavy grids.
- Film grain + tungsten filament on; honor `prefers-reduced-transparency` / `-motion`.
- Mobile is a SEPARATE on-set surface (capability parity, not layout parity) — scaffold
  the route but the desktop shell is the priority for Phase 0.
- Type: display=Bricolage Grotesque, UI=Hanken Grotesk, data/mono=JetBrains Mono
  (scene numbers, page eighths, times, money are always mono + tabular-nums).

## Acceptance

- `next build` (or `./node_modules/.bin/next build`) compiles cleanly.
- All color/spacing comes from the centralized tokens — no hardcoded hex in components.
- Shell renders in both Umber and Kraft and visually matches `studioflow-foundation.html`.
- Keep commits scoped; do not commit `node_modules/` `.next/`; don't churn `pnpm-lock.yaml`
  (note: the committed lockfile is a stub — `pnpm install` will repopulate it; revert that
  change unless asked to fix the lockfile separately).
