# Design Foundation ("Tungsten & Sage") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the locked "Tungsten & Sage" design system (dark *Umber* + light *Kraft*) and re-skin every existing Phase 0/Phase 1 screen to it — tokens, typography, signature devices, the full app shell (grouped sidebar + ⌘K palette) and the AI-surface pattern — without changing any data-layer, server-action, reconciliation, RLS, or schema behavior.

**Architecture:** Presentation-only slice over the existing typed data layer (**thin clients** — non-negotiable). Locked design tokens become CSS custom properties wired into the existing shadcn/Tailwind-v4 variable layer (`app/globals.css`), kept **semantic** (`--brand`, `--ai-grad`, `--ok`…) so future themes re-skin without component edits. Dark (Umber) is the brand default; light (Kraft) is first-class; `next-themes` drives `class`-based switching and respects `prefers-color-scheme` on first load. The locked spec + canonical mockup are the source of truth; the v0 `legacy/` prototype is loose inspiration only.

**Tech Stack:** Next.js 16 (App Router, React 19, TS) · Tailwind v4 + shadcn/ui · `next-themes` · `next/font/google` (Bricolage Grotesque · Hanken Grotesk · JetBrains Mono) · Vitest + @testing-library/react · the Claude Preview MCP for browser screenshot verification (dark **and** light).

**Sources of truth (read before starting):**
- `docs/superpowers/specs/2026-06-02-studioflow-design-foundation.md` — the locked spec (all token tables, component rules, density, a11y).
- `docs/superpowers/mockups/studioflow-foundation.html` — the canonical visual (exact CSS for shell, brandmark+filament, nav active-spine, stripboard rows, category spines, AI chip/dock/row, grain overlay, ember-duotone). **Match this.**
- `docs/superpowers/specs/2026-06-02-phase-1-script-import-design.md` — Phase 1 screen intent.
- `docs/superpowers/mockups/studioflow-shell.html` and the `studioflow-signature-*.html` / `studioflow-glass*.html` set — supplementary shell/signature references.

---

## Non-negotiable guardrails (apply to EVERY task)

1. **Thin clients — presentation only.** Do **not** modify `lib/**`, `app/**/actions.ts`, `supabase/migrations/**`, or any Zod schema/data-layer/RLS logic. Screens keep their existing typed-data wiring; you change how they look, not what they do. Touching server actions or data functions = out of scope (flag at checkpoint instead).
2. **Two colors, two jobs.** Amber = action/human (brand mark, primary buttons, active nav, filament). Sage→amethyst gradient = AI **only** (trim + dot + thin row spine; never fills a solid shape; **no sparkle icon**). The affirmative action inside an AI surface may still be amber.
3. **Status colors are sacred** — `--ok`/`--warn`/`--error` mean schedule/conflict/budget status only; never decoration. Never encode meaning in color alone (pair with label/icon).
4. **Data is mono.** Scene numbers, page-eighths (`1 2/8`), times, money → JetBrains Mono with `tabular-nums`.
5. **a11y:** AA text contrast on its surface, visible focus rings (amber on dark, `--brand-on` on light), honor `prefers-reduced-motion` (no glow pulses) and `prefers-reduced-transparency` (drop grain/glass to solids), full keyboard path incl. ⌘K.
6. **Verify visual tasks in the browser, dark AND light** (Claude Preview screenshots), not only with unit tests. Logic tasks (theme toggle, density persistence, ⌘K) get real component tests via TDD.

**Existing files re-skinned by this plan (do not change their data wiring):** `app/layout.tsx`, `app/login/page.tsx`, `app/dashboard/page.tsx`, `components/projects/project-list.tsx`, `app/dashboard/[projectId]/import/page.tsx`, `components/scripts/import-form.tsx`, `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx`, `components/scripts/scene-list.tsx`, `components/scripts/scene-detail.tsx`, `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx`, `components/scripts/diff-review.tsx`.

---

## File Structure

**Tokens & theme**
- `app/globals.css` *(modify)* — replace the stock neutral `:root`/`.dark` token bodies with Kraft (`:root`, light) + Umber (`.dark`, default) mapped onto the existing shadcn HSL variable layer; add semantic tokens (`--brand*`, `--ai-*`, `--ok/--warn/--error`, category spines, `--grain`, surface `--s1/2/3`, `--tx-2/3`, `--line/-2`), font vars, and the `tabular-nums`/grain/filament/AI utility classes.
- `app/layout.tsx` *(modify)* — `next/font` for the three families → CSS vars; fix `metadata` (StudioFlow); mount `ThemeProvider`; render the root grain overlay.

**Theme + density**
- `components/theme-provider.tsx` *(create)* — `next-themes` wrapper.
- `components/layout/theme-toggle.tsx` *(create)* — dark/light toggle.
- `components/layout/density-toggle.tsx` *(create)* — Comfortable/Compact toggle (persisted; sets `data-density` on `<html>`).

**Signature devices / primitives**
- `components/ui/grain.tsx` *(create)* — film-grain overlay (SVG fractalNoise, `mix-blend-mode: overlay`, opacity `--grain`, gated behind reduced-transparency).
- `components/ui/ai-surface.tsx` *(create)* — `AISurface`, `AIDock`, `AIChip`, `AIDot` (frosted glass + `--ai-grad` border + composite glow).
- `components/ui/button.tsx` *(modify)* — add the `ember` (ember-duotone, default for primary actions) variant.

**App shell**
- `components/layout/app-sidebar.tsx` *(create)* — grouped phase-ordered nav, brandmark + filament, AI Assistant entry (gradient dot), active amber left-spine; mobile via shadcn `sidebar`.
- `components/layout/top-bar.tsx` *(create)* — display-font title + sub, spacer, ⌘K trigger, theme + density toggles, action/AI-chip slots.
- `components/layout/command-palette.tsx` *(create)* — ⌘K via shadcn `command` in a `dialog`; nav actions + AI actions (dot-marked); global `cmd/ctrl+k` listener.
- `app/dashboard/layout.tsx` *(create)* — composes sidebar + top bar + `main` + contextual-panel slot + grain; wraps all `/dashboard` routes.

**shadcn baseline** *(add via CLI, themed by tokens)* — `command`, `dialog`, `dropdown-menu`, `separator`, `scroll-area`, `badge`, `tooltip`, `sheet`, `label`, `switch`, `table`, `sidebar`, `skeleton`.

---

## Task 1: Design tokens — Umber (dark, default) + Kraft (light) in `globals.css`

**Files:** Modify `app/globals.css`

The existing file already has the `@theme inline { --color-*: var(--*) ... }` block and the `@radius-*` scale — **keep that block**. Replace only the `:root { … }` and `.dark { … }` *value* bodies, and append the semantic tokens + utility classes below. Token values are copied verbatim from the locked spec §3 / the mockup's `.lt`/`.dk` blocks.

- [ ] **Step 1: Replace the `:root` body (Kraft / light) and `.dark` body (Umber / dark)**

Map the locked palette onto shadcn's semantic variables, and also expose the raw semantic tokens the components use. Use this exact mapping in BOTH blocks (light values shown; dark uses the Umber column):

```css
:root {
  /* ----- Kraft (light) ----- */
  --bg: #efe7d8; --s1: #f8f1e4; --s2: #fcf7ee; --s3: #eadfcc;
  --line: rgba(64,46,24,.10); --line-2: rgba(64,46,24,.15);
  --tx: #2d2418; --tx-2: rgba(45,36,24,.62); --tx-3: rgba(45,36,24,.42);
  --brand: #bf6a2e; --brand-2: #d98a3f; --brand-ink: #ffffff; --brand-on: #a4541d;
  --brand-soft: rgba(191,106,46,.14); --brand-line: rgba(191,106,46,.34);
  --grain: .30;
  --ai-grad: linear-gradient(120deg,#2f9e6e 0%,#3f9e82 28%,#5a89c0 56%,#7a64c8 78%,#9a47c0 100%);
  --ai-ink: #3f8a6a; --ai-glass: rgba(255,255,255,.55);
  --ai-glow-in: rgba(120,80,195,.10); --ai-glow-halo: rgba(140,72,200,.09);
  --ai-shadow: inset 0 0 12px var(--ai-glow-in), 0 0 10px var(--ai-glow-halo), inset 0 1px 0 rgba(255,255,255,.55);
  --ai-shadow-sm: inset 0 0 8px var(--ai-glow-in), 0 0 6px var(--ai-glow-halo);
  --ok: #3f7d4a; --warn: #b07a1e; --error: #b03a2e;
  --cat-int-day: #c2873a; --cat-int-night: #4f80a8; --cat-ext-day: #4f9466; --cat-ext-night: #7a5fb0;

  /* ----- shadcn semantic mapping (light) ----- */
  --background: var(--bg); --foreground: var(--tx);
  --card: var(--s2); --card-foreground: var(--tx);
  --popover: var(--s2); --popover-foreground: var(--tx);
  --primary: var(--brand); --primary-foreground: var(--brand-ink);
  --secondary: var(--s3); --secondary-foreground: var(--tx);
  --muted: var(--s1); --muted-foreground: var(--tx-2);
  --accent: var(--s3); --accent-foreground: var(--tx);
  --destructive: var(--error); --destructive-foreground: #ffffff;
  --border: var(--line-2); --input: var(--line-2); --ring: var(--brand);
  --sidebar: var(--s1); --sidebar-foreground: var(--tx-2);
  --sidebar-primary: var(--brand); --sidebar-primary-foreground: var(--brand-ink);
  --sidebar-accent: var(--brand-soft); --sidebar-accent-foreground: var(--brand-on);
  --sidebar-border: var(--line); --sidebar-ring: var(--brand);
  --radius: 0.625rem;
}

.dark {
  /* ----- Umber (dark, default) ----- */
  --bg: #14110c; --s1: #1a1610; --s2: #221c14; --s3: #2c2418;
  --line: rgba(255,236,205,.08); --line-2: rgba(255,236,205,.14);
  --tx: #f3ece1; --tx-2: rgba(243,236,225,.62); --tx-3: rgba(243,236,225,.42);
  --brand: #f4a93c; --brand-2: #e07a3a; --brand-ink: #1d1303; --brand-on: #f4a93c;
  --brand-soft: rgba(244,169,60,.16); --brand-line: rgba(244,169,60,.36);
  --grain: .55;
  --ai-grad: linear-gradient(120deg,#4fe0a0 0%,#56cf94 30%,#6fb0cf 52%,#8a8ee8 74%,#b073f0 100%);
  --ai-ink: #9fe0c0; --ai-glass: rgba(40,50,50,.5);
  --ai-glow-in: rgba(150,128,228,.12); --ai-glow-halo: rgba(165,108,235,.11);
  --ai-shadow: inset 0 0 13px var(--ai-glow-in), 0 0 12px var(--ai-glow-halo), inset 0 1px 0 rgba(255,255,255,.06);
  --ai-shadow-sm: inset 0 0 9px var(--ai-glow-in), 0 0 7px var(--ai-glow-halo);
  --ok: #5fb87a; --warn: #e8b14a; --error: #d2685f;
  --cat-int-day: #e0a04a; --cat-int-night: #6aa9e0; --cat-ext-day: #5fb87a; --cat-ext-night: #9a7fd0;

  /* shadcn semantic mapping (dark): identical var() references as :root —
     reproduce the full --background … --sidebar-ring block from :root here,
     since the raw tokens above already differ. */
}
```

(Reproduce the same `--background … --sidebar-ring` `var()` mapping inside `.dark` — only the raw Umber tokens differ; the mapping lines are identical.)

- [ ] **Step 2: Append font vars + utility classes** (after the token blocks)

```css
@theme inline {
  --font-display: var(--font-bricolage);
  --font-sans: var(--font-hanken);
  --font-mono: var(--font-jetbrains);
}

@layer utilities {
  .tabular { font-variant-numeric: tabular-nums; }
  .font-data { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .font-display { font-family: var(--font-display); letter-spacing: -0.3px; }
  /* Tungsten filament: 1px amber hairline with glow (under wordmark / active nav) */
  .filament { background: linear-gradient(90deg, transparent, var(--brand), transparent); box-shadow: 0 0 8px var(--brand); }
  /* Ember-duotone fill (mark + primary) */
  .ember { background: linear-gradient(140deg, var(--brand), var(--brand-2)); color: var(--brand-ink); box-shadow: 0 5px 14px var(--brand-soft); }
  /* AI surface: neutral frosted glass + gradient border + glow */
  .ai-surface { background: var(--ai-glass) padding-box, var(--ai-grad) border-box; border: 1px solid transparent; -webkit-backdrop-filter: blur(12px) saturate(135%); backdrop-filter: blur(12px) saturate(135%); box-shadow: var(--ai-shadow); }
}

@media (prefers-reduced-transparency: reduce) {
  .ai-surface { background: var(--s2); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
```

- [ ] **Step 3: Verify it compiles and the app boots in both themes**

Run: `npm run build` (Expected: success). Then `preview_start` → `preview_eval` to set `document.documentElement.classList.add('dark')` and screenshot `/login`; remove the class and screenshot again. Expected: dark = warm near-black Umber (`#14110c`), light = kraft paper (`#efe7d8`); no pure-white/stock-neutral surfaces remain.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css && git commit -m "feat(design): implement Tungsten & Sage tokens (Umber dark + Kraft light)"
```

---

## Task 2: Typography + root layout + theme provider mount

**Files:** Modify `app/layout.tsx`; Create `components/theme-provider.tsx`

- [ ] **Step 1: Install next-themes**

Run: `npm install next-themes`. Expected: added to dependencies.

- [ ] **Step 2: Create `components/theme-provider.tsx`**

```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
```

- [ ] **Step 3: Rewrite `app/layout.tsx`** — three fonts via `next/font/google`, real metadata, ThemeProvider, `suppressHydrationWarning`, token-driven body

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-bricolage" });
const ui = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-hanken" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "StudioFlow",
  description: "Film & media pre-production, built on one shared production graph.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${ui.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify** — `npm run build` succeeds; `preview` `/login` shows Hanken body text and (once a heading uses it) Bricolage display; no FOUC; toggling `.dark` still works.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx components/theme-provider.tsx package.json package-lock.json
git commit -m "feat(design): wire Bricolage/Hanken/JetBrains fonts + next-themes provider"
```

---

## Task 3: Theme toggle (dark/light) — with test

**Files:** Create `components/layout/theme-toggle.tsx`, `components/layout/theme-toggle.test.tsx`

- [ ] **Step 1: Failing test** (`theme-toggle.test.tsx`)

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark", setTheme }) }));

import { ThemeToggle } from "@/components/layout/theme-toggle";

describe("ThemeToggle", () => {
  it("toggles from dark to light", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: /theme/i }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
```

- [ ] **Step 2:** Run `npm test -- components/layout/theme-toggle.test.tsx` → FAIL (module missing).

- [ ] **Step 3: Implement** `theme-toggle.tsx`

```tsx
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <span aria-hidden className="text-sm">{theme === "dark" ? "☼" : "☾"}</span>
    </Button>
  );
}
```

- [ ] **Step 4:** Run the test → PASS. `npm run typecheck` clean.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(design): theme toggle (dark/light)"`

---

## Task 4: Signature devices — film grain, filament, ember button

**Files:** Create `components/ui/grain.tsx`; Modify `app/layout.tsx` (mount grain), `components/ui/button.tsx` (ember variant)

- [ ] **Step 1: Create `components/ui/grain.tsx`** — fixed full-viewport overlay; opacity from `--grain`; dropped under reduced-transparency

```tsx
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] motion-reduce:hidden [@media(prefers-reduced-transparency:reduce)]:hidden"
      style={{ opacity: "var(--grain)", mixBlendMode: "overlay", backgroundImage: `url("${GRAIN_SVG}")` }}
    />
  );
}
```

- [ ] **Step 2:** In `app/layout.tsx`, render `<Grain />` inside `<body>` (before `{children}` content, after ThemeProvider open). Keep content above it (`z` ≥ 1 on shells).

- [ ] **Step 3: Add the `ember` button variant** in `components/ui/button.tsx` — add to the `cva` variants map:

```ts
// inside variants.variant:
ember:
  "bg-[linear-gradient(140deg,var(--brand),var(--brand-2))] text-[var(--brand-ink)] shadow-[0_5px_14px_var(--brand-soft)] hover:brightness-105",
```

Leave the existing `default` variant intact (it already maps to `--primary` = `--brand`). `ember` is used explicitly for hero/primary CTAs (import, create, confirm).

- [ ] **Step 4: Verify** — `npm run build`; `preview` a page with an ember button (use `/login`'s submit after Task 11, or temporarily) and screenshot: grain is a subtle texture on surfaces (not over crisp text), ember button shows the amber→ember gradient + soft shadow. Confirm grain disappears under emulated reduced-transparency (`preview_resize` won't emulate this; verify the CSS guard exists and motion-reduce hides it).

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(design): film grain overlay + ember-duotone button variant + filament util"`

---

## Task 5: AI-surface primitives

**Files:** Create `components/ui/ai-surface.tsx`

Implements the locked AI pattern (spec §3.3 / §6): frosted glass + `--ai-grad` border + composite glow + small gradient **dot**; **no sparkle icon**; gradient never fills a solid shape.

- [ ] **Step 1: Create `components/ui/ai-surface.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function AIDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-[7px] flex-none rounded-full", className)}
      style={{ background: "var(--ai-grad)", boxShadow: "0 0 4px var(--ai-glow-halo)" }}
    />
  );
}

export function AIChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold", className)}
      style={{ color: "var(--ai-ink)", background: "var(--ai-glass) padding-box, var(--ai-grad) border-box", border: "1px solid transparent", backdropFilter: "blur(8px) saturate(130%)", boxShadow: "var(--ai-shadow-sm)" }}
    >
      <AIDot /> {children}
    </span>
  );
}

export function AISurface({ children, className }: { children: React.ReactNode; className?: string }) {
  // Frosted glass + gradient border + glow. Label/dot mark it as AI (never hue alone).
  return (
    <div className={cn("ai-surface rounded-xl p-3", className)} style={{ color: "var(--tx)" }}>
      {children}
    </div>
  );
}

export function AIDock({
  children,
  action,
  onDismiss,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: React.ReactNode;
}) {
  return (
    <div className="ai-surface flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ color: "var(--tx)" }}>
      <AIDot className="size-2.5" />
      <div className="flex-1 text-[11.5px] leading-snug">{children}</div>
      {onDismiss}
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npm run typecheck` clean; `npm run build` succeeds. (Visual verification happens when the diff-review screen consumes these in Task 13.)

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(design): AI-surface primitives (dock/chip/dot, glass+gradient+glow, no sparkle)"`

---

## Task 6: Expand the shadcn baseline

**Files:** add under `components/ui/` (CLI-generated, token-themed)

- [ ] **Step 1: Add components**

Run (Tailwind v4 / shadcn CLI):
```bash
npx shadcn@latest add command dialog dropdown-menu separator scroll-area badge tooltip sheet label switch table sidebar skeleton --yes
```
Expected: files created under `components/ui/`. They inherit the Task 1 tokens (no extra theming needed). If the CLI prompts about overwriting `button`/`card`/`input`, **decline** (keep our versions).

- [ ] **Step 2: Verify** — `npm run typecheck` (Expected: clean; if a generated file references a missing dep like `cmdk`/`@radix-ui/*`, the CLI installs it — confirm `package.json` updated). `npm run build` succeeds.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(design): add shadcn baseline (command, sidebar, dialog, table, …)"`

---

## Task 7: App sidebar — grouped phase-ordered nav

**Files:** Create `components/layout/app-sidebar.tsx`

Match the mockup rail: brandmark (ember "SF" tile + "StudioFlow" wordmark + filament hairline under), groups **Develop / Plan / Shoot**, active item = amber left-spine (`box-shadow` glow) + `--brand-soft` bg, AI Assistant entry with `<AIDot/>`. Use shadcn `sidebar` for structure/mobile/keyboard.

- [ ] **Step 1: Create `components/layout/app-sidebar.tsx`**

Build with shadcn `Sidebar`/`SidebarHeader`/`SidebarContent`/`SidebarGroup`/`SidebarGroupLabel`/`SidebarMenu`/`SidebarMenuButton`. Nav model (icons via lucide-react, already a shadcn dep):

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutList, CalendarDays, DollarSign, ClipboardList } from "lucide-react";
import { AIDot } from "@/components/ui/ai-surface";
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";

// `soon: true` → rendered disabled with a "Soon" badge (route not built yet).
// Only "Script" is live in this slice (points at the minimal scripts index added in Task 12).
const GROUPS = [
  { label: "Develop", items: [
    { href: "scripts", label: "Script", icon: FileText },
    { href: "breakdown", label: "Breakdown", icon: LayoutList, soon: true },
  ]},
  { label: "Plan", items: [
    { href: "schedule", label: "Schedule", icon: CalendarDays, soon: true },
    { href: "budget", label: "Budget", icon: DollarSign, soon: true },
    { href: "call-sheets", label: "Call Sheets", icon: ClipboardList, soon: true },
  ]},
];

export function AppSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={`/dashboard/${projectId}`} className="relative flex items-center gap-2 px-1 pb-3">
          <span className="ember grid size-7 place-items-center rounded-lg font-display text-[13px] font-extrabold">SF</span>
          <span className="font-display text-[15px] font-extrabold tracking-[-0.3px]">StudioFlow</span>
          <span aria-hidden className="filament absolute inset-x-1 bottom-0 h-px" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarMenu>
              {g.items.map((it) => {
                const href = `/dashboard/${projectId}/${it.href}`;
                const active = pathname.startsWith(href);
                if (it.soon) {
                  return (
                    <SidebarMenuItem key={it.href}>
                      <SidebarMenuButton disabled aria-disabled className="opacity-50">
                        <it.icon className="size-4" />{it.label}
                        <span className="ml-auto rounded-full border border-[var(--line-2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--tx-3)]">Soon</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={it.href}>
                    <SidebarMenuButton asChild isActive={active}
                      className="data-[active=true]:bg-[var(--brand-soft)] data-[active=true]:text-[var(--brand-on)]">
                      <Link href={href}><it.icon className="size-4" />{it.label}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {g.label === "Develop" && (
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-[var(--ai-ink)]">
                    <AIDot /> AI Assistant
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
```

> Active amber left-spine: add to `globals.css` utilities a `.nav-active::before` OR rely on shadcn's `data-[active=true]`; render a 3px amber spine via a pseudo/element on the active `SidebarMenuButton` (`box-shadow: 0 0 9px var(--brand)`), matching the mockup `.nav.on::before`. (Note: `scripts`/`schedule`/`budget`/`call-sheets`/`breakdown` routes may not all exist yet — Phase 1 only has `scripts`; non-existent ones are forward-looking nav stubs, acceptable per the spec's phase-ordered shell. Don't build those routes here.)

- [ ] **Step 2: Verify** (after Task 10 mounts it) — deferred to the layout task; for now `npm run typecheck` + `npm run build` clean.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(design): app sidebar (phase-ordered groups, brandmark+filament, AI dot, active spine)"`

---

## Task 8: Top bar + density toggle

**Files:** Create `components/layout/top-bar.tsx`, `components/layout/density-toggle.tsx`, `components/layout/density-toggle.test.tsx`

- [ ] **Step 1: Failing test for density persistence** (`density-toggle.test.tsx`)

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DensityToggle } from "@/components/layout/density-toggle";

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-density"); });

describe("DensityToggle", () => {
  it("switches to compact, sets the attribute, and persists", async () => {
    render(<DensityToggle />);
    await userEvent.click(screen.getByRole("button", { name: /density|compact|comfortable/i }));
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(localStorage.getItem("sf-density")).toBe("compact");
  });
});
```

- [ ] **Step 2:** Run → FAIL (module missing).

- [ ] **Step 3: Implement `density-toggle.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Density = "comfortable" | "compact";

export function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable");
  useEffect(() => {
    const saved = (localStorage.getItem("sf-density") as Density) || "comfortable";
    setDensity(saved);
    document.documentElement.setAttribute("data-density", saved);
  }, []);
  const toggle = () => {
    const next: Density = density === "comfortable" ? "compact" : "comfortable";
    setDensity(next);
    document.documentElement.setAttribute("data-density", next);
    localStorage.setItem("sf-density", next);
  };
  return (
    <Button variant="ghost" size="sm" aria-label="Toggle density" onClick={toggle}>
      {density === "comfortable" ? "Comfortable" : "Compact"}
    </Button>
  );
}
```

Add density-aware spacing hooks in `globals.css` utilities, e.g.:
```css
[data-density="compact"] .row-pad { padding-top: .35rem; padding-bottom: .35rem; }
.row-pad { padding-top: .6rem; padding-bottom: .6rem; }
```
(Scene rows/tables use `.row-pad`; capability is identical, only spacing changes.)

- [ ] **Step 4:** Run the test → PASS.

- [ ] **Step 5: Implement `top-bar.tsx`** — display title + sub, spacer, slots, toggles, ⌘K trigger

```tsx
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DensityToggle } from "@/components/layout/density-toggle";

export function TopBar({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
      <div>
        <h1 className="font-display text-[17px] font-extrabold tracking-[-0.3px]">{title}</h1>
        {sub ? <p className="text-[10.5px] text-[var(--tx-3)]">{sub}</p> : null}
      </div>
      <div className="flex-1" />
      {actions}
      <DensityToggle />
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 6: Verify** `npm run typecheck` clean; full visual check in Task 10.

- [ ] **Step 7: Commit** `git add -A && git commit -m "feat(design): top bar + comfortable/compact density toggle (persisted)"`

---

## Task 9: ⌘K command palette — with test

**Files:** Create `components/layout/command-palette.tsx`, `components/layout/command-palette.test.tsx`

- [ ] **Step 1: Failing test** (open via state; assert nav + AI items render)

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "@/components/layout/command-palette";

describe("CommandPalette", () => {
  it("renders nav and AI actions when open", () => {
    render(<CommandPalette projectId="p1" open onOpenChange={() => {}} />);
    expect(screen.getByText(/Script/)).toBeInTheDocument();
    expect(screen.getByText(/Schedule/)).toBeInTheDocument();
    expect(screen.getByText(/Ask AI/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** Run → FAIL.

- [ ] **Step 3: Implement `command-palette.tsx`** — controlled (for tests) + an internal `cmd/ctrl+k` listener when used uncontrolled; shadcn `CommandDialog`

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { AIDot } from "@/components/ui/ai-surface";

// Only live routes navigate; not-yet-built ones are shown disabled (no 404s).
const NAV = [
  { href: "scripts", label: "Script", soon: false },
  { href: "breakdown", label: "Breakdown", soon: true },
  { href: "schedule", label: "Schedule", soon: true },
  { href: "budget", label: "Budget", soon: true },
  { href: "call-sheets", label: "Call Sheets", soon: true },
];

export function CommandPalette({
  projectId, open, onOpenChange,
}: { projectId: string; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (open !== undefined) return; // controlled: no global listener
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setInternalOpen((v) => !v); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or run a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV.map((n) => (
            <CommandItem
              key={n.href}
              disabled={n.soon}
              onSelect={() => { if (n.soon) return; router.push(`/dashboard/${projectId}/${n.href}`); setOpen(false); }}
            >
              {n.label}{n.soon ? <span className="ml-auto text-[var(--tx-3)]">Soon</span> : null}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="AI">
          <CommandItem onSelect={() => setOpen(false)}>
            <AIDot /> Ask AI… <span className="ml-1 text-[var(--tx-3)]">(coming in Phase 2)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 4:** Run the test → PASS. `npm run typecheck` clean.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(design): ⌘K command palette (nav + AI actions, global shortcut)"`

---

## Task 10: Dashboard layout (compose the shell) + re-skin dashboard home

**Files:** Create `app/dashboard/layout.tsx`; Modify `app/dashboard/page.tsx`, `components/projects/project-list.tsx`

> The dashboard root (`/dashboard`, the project list) has no single `projectId`; the shell's project-scoped sidebar/palette apply to `/dashboard/[projectId]/**`. Implement the layout so the project-list page renders the brand chrome (top bar + grain) without the project sidebar, and project-scoped pages get the full sidebar. Simplest: put the full shell (with `SidebarProvider` + `AppSidebar`) in a `app/dashboard/[projectId]/layout.tsx`, and a lighter chrome at `app/dashboard/layout.tsx`. Adjust the plan's file accordingly.

- [ ] **Step 1: Create `app/dashboard/[projectId]/layout.tsx`** — full shell

```tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";

export default async function ProjectLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <SidebarProvider>
      <AppSidebar projectId={projectId} />
      <SidebarInset className="relative z-[2]">
        {children}
      </SidebarInset>
      <CommandPalette projectId={projectId} />
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/layout.tsx`** — light chrome for the project-list page (brand header + grain; no project sidebar)

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative z-[2] min-h-screen">{children}</div>;
}
```

- [ ] **Step 3: Re-skin `app/dashboard/page.tsx`** — a `TopBar`-style header ("Projects") + the create form + `ProjectList`. Use `Card` surfaces (`--s2`), ember "Create" button, Bricolage page title. Keep the existing data calls (`listProjects`, `createProjectAction`) untouched.

- [ ] **Step 4: Re-skin `components/projects/project-list.tsx`** — cards as `--s2` with hairline border + hover `--s3`; title in `font-display`; status as a small `Badge`; keep the project `<Link>` + the sibling "Import script" link (no nested anchors). Use mono only where there's data.

- [ ] **Step 5: Verify in browser, BOTH themes** — `preview_start`; sign in (see memory: pre-create confirmed user, magic-link via Mailpit on `localhost:3000`); screenshot `/dashboard` in dark and light. Expected: warm surfaces, ember Create button, brand wordmark, grain texture, AA-legible text. Compare against the mockup's surface treatment.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(design): app shell layout + re-skin dashboard/project list"`

---

## Task 11: Re-skin login + import

**Files:** Modify `app/login/page.tsx`, `app/dashboard/[projectId]/import/page.tsx`, `components/scripts/import-form.tsx`

- [ ] **Step 1: Re-skin `app/login/page.tsx`** — centered `Card` on `--bg`; ember "SF" brandmark + filament + Bricolage "Sign in to StudioFlow"; the email `Input` + ember "Send magic link" button; the `sent`/`error` states styled (error uses `--error` + role="alert" + icon, not color alone). Keep the `signInWithOtp` logic untouched.

- [ ] **Step 2: Re-skin `import-form.tsx`** — labelled title `Input` + a token-styled `Textarea` (mono, `--s2` fill, hairline, focus ring `--ring`); ember submit using `useFormStatus` pending state ("Importing…"). Keep `action` prop + names (`title`, `source`) and the uncontrolled inputs exactly.

- [ ] **Step 3: Re-skin `import/page.tsx`** — wrap content in the shell's main; Bricolage "Import script" title + muted lede; the form in a `Card`.

- [ ] **Step 4: Verify in browser, BOTH themes** — screenshot `/login` and the import page dark + light; submit a paste and confirm the redirect still works (logic untouched). Expected: matches the warm, lit aesthetic; ember CTAs; mono textarea.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(design): re-skin login + import to Tungsten & Sage"`

---

## Task 12: Re-skin script view + scene list (stripboard) + scene detail

**Files:** Create `app/dashboard/[projectId]/scripts/page.tsx`; Modify `app/dashboard/[projectId]/scripts/[scriptId]/page.tsx`, `components/scripts/scene-list.tsx`, `components/scripts/scene-detail.tsx`, `app/dashboard/[projectId]/scripts/[scriptId]/scenes/[sceneId]/page.tsx`

This is the signature screen — match the mockup's stripboard rows.

- [ ] **Step 0: Create the minimal Scripts index `app/dashboard/[projectId]/scripts/page.tsx`** — read-only, so the sidebar "Script" nav has a real destination. Uses the EXISTING data layer only (no new data functions): `listScripts(projectId)` from `@/lib/scripts/data`. Server component; renders the project's scripts as token `Card`s linking to `…/scripts/[scriptId]`, an empty state ("No scripts yet — import one") linking to `…/import`, and a Bricolage "Scripts" title. This is presentation over existing data, not a new feature.

```tsx
import { listScripts } from "@/lib/scripts/data";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function ScriptsIndexPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const scripts = await listScripts(projectId);
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.3px]">Scripts</h1>
        <Link href={`/dashboard/${projectId}/import`} className="text-sm text-[var(--brand-on)] underline">Import script</Link>
      </div>
      {scripts.length === 0 ? (
        <p className="text-[var(--tx-2)]">No scripts yet — <Link className="underline" href={`/dashboard/${projectId}/import`}>import one</Link>.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {scripts.map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/${projectId}/scripts/${s.id}`}>
                <Card className="p-4 transition-colors hover:bg-[var(--s3)]"><h3 className="font-display font-bold">{s.title}</h3></Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 1: Re-skin `scene-list.tsx`** as stripboard rows (replace the bare table). Each row: `--s2` surface, hairline border, **category left-spine** colored by INT/EXT × time-of-day, **mono** scene number (`.font-data`), `INT/N`-style day-part tag, synopsis (ellipsis), **mono** page-eighths; omitted scenes → `--tx-3` + line-through + "(omitted)" label (not color alone). Use `.row-pad` for density. Derive the category color:

```ts
function catColor(intExt: string | null, tod: string | null): string {
  const ext = (intExt ?? "").toUpperCase().includes("EXT");
  const night = (tod ?? "").toUpperCase().includes("NIGHT");
  if (!ext && !night) return "var(--cat-int-day)";
  if (!ext && night) return "var(--cat-int-night)";
  if (ext && !night) return "var(--cat-ext-day)";
  return "var(--cat-ext-night)";
}
```
Keep the existing props (`projectId`, `scriptId`, `scenes`), the scene link, and the empty state. Apply the spine via inline `style={{ borderLeftColor: catColor(...) }}` on a `border-l-[3px]` row.

- [ ] **Step 2: Re-skin `scene-detail.tsx`** — Bricolage scene header (mono scene number), attribute row (mono page-eighths, status as `Badge`), synopsis, body in a mono `--s1` block. Keep the optional `editAction` form (Task 13 area in Phase 1) styled with token inputs + ember save.

- [ ] **Step 3: Re-skin the script page** — Bricolage title + mono "N scenes" sub; the scene list; the "Re-import a revised draft" `details` and "Read view" `details` styled as token disclosures.

- [ ] **Step 4: Verify in browser, BOTH themes** — import `tricky.fountain`, screenshot the scene list dark + light: 4 category-spine colors visible, mono numbers/eighths aligned, OMITTED row struck-through; open a scene detail. Match the mockup's `.board`/`.row`.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(design): re-skin script view + scene stripboard (category spines, mono) + scene detail"`

---

## Task 13: Re-skin the diff-review screen (AI / suggestion surface)

**Files:** Modify `components/scripts/diff-review.tsx`

The gated re-import review is the natural home for the AI/suggestion surface pattern (it's a non-destructive "here's what will change, confirm" surface).

- [ ] **Step 1: Re-skin `diff-review.tsx`** — keep the single `<form action={confirmAction}>`, the hidden `scriptVersionId`, the per-conflict `resolve-<id>` radios, and the confirm button exactly (logic untouched). Restyle:
  - Classification rows: `--s2` surfaces with a status-tinted left marker — `new`→`--ok`, `removed`→`--tx-3`, `modified`→`--brand`, `unchanged`→`--line-2`; **conflict**→render inside an `AISurface` (gradient trim + glow) with the side-by-side Final-Draft / in-app panels, FD radio pre-checked. Always pair the classification color with its text label.
  - Header: Bricolage "Review re-import" + the "Nothing has been applied yet" lede.
  - Confirm: ember button.
  - Confidence: mono percentage.

- [ ] **Step 2: Update `diff-review.test.tsx` only if class/text assertions broke** — the existing 4 tests assert text + the hidden field + the FD radio default + confirm fire. Keep those behaviors; adjust selectors only if needed (do NOT weaken them). Run `npm test -- components/scripts/diff-review.test.tsx` → PASS.

- [ ] **Step 3: Verify in browser, BOTH themes** — stage a re-import that produces unchanged/modified/new/removed (and, if easy, a conflict), screenshot the review dark + light: conflict shows the AI glass+gradient surface (no sparkle), statuses are labelled not color-only, confirm still applies. Match the mockup's `.aibar`/`.airow`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(design): re-skin re-import diff review with AI/suggestion surface"`

---

## Task 14: Accessibility + final cross-theme verification sweep

**Files:** Touch-ups across the re-skinned components as needed (focus rings, labels, contrast)

- [ ] **Step 1: Focus + keyboard** — verify every interactive element shows a visible focus ring (`--ring` amber dark / `--brand-on` light); the ⌘K palette opens via keyboard and navigates; sidebar is keyboard-traversable. Add `focus-visible:ring-2 focus-visible:ring-[var(--ring)]` where missing.

- [ ] **Step 2: Reduced motion / transparency** — confirm grain + AI glass drop to solids under `prefers-reduced-transparency`, and no glow animation under `prefers-reduced-motion`.

- [ ] **Step 3: Contrast (AA)** — spot-check body text (`--tx` on `--s2`), secondary (`--tx-2`), brand-on-surface, status pills, and the amber `--brand` vs `--warn` separation (context + label, not hue) in BOTH themes. Fix any AA failures (bump to `--tx` from `--tx-3` for essential text).

- [ ] **Step 4: Full screenshot sweep** — `preview` screenshots of login, dashboard, import, script/scene list, scene detail, diff review — **dark and light** (12 shots). Confirm consistency with the mockup and no stock-neutral remnants.

- [ ] **Step 5: Final gates** — `npm run lint && npm run typecheck && npm test` (all green; integration suite still 65/65 with `npx dotenv -e .env.local -- npm test`), `npm run build` succeeds.

- [ ] **Step 6: Commit** `git add -A && git commit -m "chore(design): a11y pass + cross-theme verification (dark + light)"`

---

## Done criteria

- [ ] Umber (dark, default) + Kraft (light) tokens live; `next-themes` toggle + `prefers-color-scheme`; no stock-neutral surfaces remain.
- [ ] Bricolage / Hanken / JetBrains wired; all data (scene numbers, page-eighths) is mono + tabular.
- [ ] Signature devices present: filament hairline, film grain (reduced-transparency-gated), ember-duotone mark/primary.
- [ ] Full app shell: grouped phase-ordered sidebar (brandmark+filament, AI dot, active amber spine), top bar, contextual-panel slot, **working ⌘K palette**, Comfortable/Compact density (persisted).
- [ ] AI-surface pattern (glass + gradient trim/dot + glow, no sparkle) applied to the diff-review; amber stays action-only, gradient stays AI-only.
- [ ] Every Phase 0/1 screen re-skinned and verified in browser **dark and light**; data wiring untouched (integration suite still green).
- [ ] `lint`/`typecheck`/`test`/`build` green.

## Out of scope (do not do here)

- No schema/migration/data-layer/RLS/action logic changes (thin clients).
- No new product features; forward-looking nav items (Breakdown/Schedule/Budget/Call Sheets) are stubs — their routes are built in their own phases.
- The deferred Phase 1.5+ items and the Phase 1 follow-ups (action-input Zod validation, `setActiveRevision` atomicity) are NOT design work — leave them for their phases.
- Mobile "on-set surface" (separate capability-parity surface) is its own later effort; this slice just keeps the shell responsive (sidebar collapses to sheet via shadcn).
