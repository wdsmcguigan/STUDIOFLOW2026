# StudioFlow — Design Foundation Spec

> **Status:** Locked (v1 foundation)
> **Date:** 2026-06-02
> **Companion to:** `2026-06-02-studioflow-platform-design.md` (this is the §9 "Design foundation" deliverable)
> **Canonical visual:** `docs/superpowers/mockups/studioflow-foundation.html` (style tile + dark/light shell)
> **Scope of this doc:** Visual identity, design tokens (dark + light), signature devices, core component conventions, density, theming and accessibility rules. Per-module UX is brainstormed just-in-time at each phase.

---

## 1. Identity — "Tungsten & Sage"

StudioFlow looks like a **warm, lit, slightly analog studio tool**, not a cool-blue SaaS dashboard. Every competitor in this category (StudioBinder, Yamdu, Frame.io, Saturation) lives in blue/grey or green; we deliberately own warm earthy surfaces + a tungsten-amber brand + a living green→amethyst AI accent.

**Principles**

1. **Opaque, dense work surfaces; glass for chrome only.** Breakdown grids, tables and forms are solid for legibility and scroll performance. Frosted glass is reserved for *floating* layers — AI surfaces, command palette, side panels, modals, top bar.
2. **Two colors, two jobs.** **Amber = action / human** (brand mark, primary buttons, active nav, the filament). **Sage→amethyst gradient = intelligence / AI** (and *only* AI). They sit on opposite sides of the wheel, so they never compete or get confused.
3. **Status colors are sacred.** Green / amber / red mean only schedule/conflict/budget status — never decoration.
4. **Warm and analog.** A near-imperceptible film grain on surfaces and a "tungsten filament" hairline accent make it feel crafted, the opposite of sterile.
5. **Calm by default, magic on demand.** The AI glow is a barely-there interior sheen, not a light source. Restraint is the brand.

---

## 2. Decisions Log (this workstream)

| Decision | Choice |
|---|---|
| Theme(s) at launch | **Dark (Umber) + Light (Kraft)**, both first-class |
| Surface mood | Warm earthy, opaque work surfaces; glass for chrome |
| Brand hue | **Tungsten amber**, **ember-duotone** mark & primary (amber→ember gradient) |
| AI accent | **Sage→amethyst gradient** — green leads, amethyst owns back third |
| AI accent application | Gradient **trim + small dot** on neutral frosted-glass surfaces |
| AI glow | **Inner glow + faint amethyst outer halo**, barely-there |
| Signature devices | **Tungsten filament** hairline + **film grain** (both on) |
| Density | **Comfortable default + Compact toggle** for heavy grids |
| Navigation | Grouped phase-ordered sidebar + contextual panel + strong ⌘K palette |
| Mobile | Separate **on-set surface** with full capability parity (≠ layout parity) |
| Type | Bricolage Grotesque (display) · Hanken Grotesk (UI) · JetBrains Mono (data) |

---

## 3. Color Tokens

Authored as CSS custom properties; wired into the existing shadcn/Tailwind HSL variable layer (`styles/globals.css`, `tailwind.config.js`). Hex is the source of truth here; convert to HSL channels for the shadcn `--background` etc. mappings.

### 3.1 Dark — "Umber" (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#14110c` | App base |
| `--s1` | `#1a1610` | Rail / sunk panels |
| `--s2` | `#221c14` | Cards, rows |
| `--s3` | `#2c2418` | Raised controls, hover |
| `--line` | `rgba(255,236,205,.08)` | Hairline borders |
| `--line-2` | `rgba(255,236,205,.14)` | Stronger borders |
| `--tx` | `#f3ece1` | Primary text |
| `--tx-2` | `rgba(243,236,225,.62)` | Secondary text |
| `--tx-3` | `rgba(243,236,225,.42)` | Tertiary / muted |
| `--brand` | `#f4a93c` | Tungsten amber |
| `--brand-2` | `#e07a3a` | Ember (duotone end) |
| `--brand-ink` | `#1d1303` | Text on amber |
| `--brand-soft` | `rgba(244,169,60,.16)` | Amber tint (active nav, pills) |
| `--brand-line` | `rgba(244,169,60,.36)` | Amber border |
| `--grain` | `0.55` | Grain overlay opacity |

### 3.2 Light — "Kraft"

| Token | Value | Use |
|---|---|---|
| `--bg` | `#efe7d8` | App base (kraft paper) |
| `--s1` | `#f8f1e4` | Rail / sunk panels |
| `--s2` | `#fcf7ee` | Cards, rows |
| `--s3` | `#eadfcc` | Raised controls, hover |
| `--line` | `rgba(64,46,24,.10)` | Hairline borders |
| `--line-2` | `rgba(64,46,24,.15)` | Stronger borders |
| `--tx` | `#2d2418` | Primary text |
| `--tx-2` | `rgba(45,36,24,.62)` | Secondary text |
| `--tx-3` | `rgba(45,36,24,.42)` | Tertiary / muted |
| `--brand` | `#bf6a2e` | Tungsten amber (deepened for contrast) |
| `--brand-2` | `#d98a3f` | Ember (duotone end) |
| `--brand-ink` | `#ffffff` | Text on amber |
| `--brand-on` | `#a4541d` | Amber-as-text (nav label, links) |
| `--brand-soft` | `rgba(191,106,46,.14)` | Amber tint |
| `--brand-line` | `rgba(191,106,46,.34)` | Amber border |
| `--grain` | `0.30` | Grain overlay opacity |

### 3.3 AI accent (the sage→amethyst gradient)

The single most distinctive token. Green leads; amethyst owns the back third and lands rich.

| Token | Dark | Light |
|---|---|---|
| `--ai-grad` | `linear-gradient(120deg,#4fe0a0 0%,#56cf94 30%,#6fb0cf 52%,#8a8ee8 74%,#b073f0 100%)` | `linear-gradient(120deg,#2f9e6e 0%,#3f9e82 28%,#5a89c0 56%,#7a64c8 78%,#9a47c0 100%)` |
| `--ai-ink` (text on AI surfaces) | `#9fe0c0` | `#3f8a6a` |
| `--ai-glass` (frosted fill) | `rgba(40,50,50,.5)` | `rgba(255,255,255,.55)` |
| `--ai-glow-in` (inner) | `rgba(150,128,228,.12)` | `rgba(120,80,195,.10)` |
| `--ai-glow-halo` (outer) | `rgba(165,108,235,.11)` | `rgba(140,72,200,.09)` |

**Composite glow** (applied to AI dock, AI-flagged row; `-sm` variant for chips):
```
--ai-shadow:    inset 0 0 13px var(--ai-glow-in), 0 0 12px var(--ai-glow-halo), inset 0 1px 0 rgba(255,255,255,.06);
--ai-shadow-sm: inset 0 0 9px  var(--ai-glow-in), 0 0 7px  var(--ai-glow-halo);
```

**Application rule.** AI surfaces are *neutral frosted glass* (`--ai-glass` fill + `backdrop-filter: blur(12px) saturate(135%)`) with a **gradient border** (`--ai-grad` via border-box), a small **gradient dot** marker, and the composite glow. The action inside an AI surface may still use amber (action = amber). **No sparkle icon.** The gradient never fills a whole solid shape — only trim, dot, and the thin left spine of an AI-flagged row.

### 3.4 Status (reserved — never decorative)

| Role | Dark | Light | Meaning |
|---|---|---|---|
| `--ok` | `#5fb87a` | `#3f7d4a` | confirmed / on-budget / no conflict |
| `--warn` | `#e8b14a` | `#b07a1e` | watch (weather, soft conflict) |
| `--error` | `#d2685f` | `#b03a2e` | hard conflict / over budget / blocking |

> **Amber overlap note:** `--warn` and `--brand` are both amber-family — the one intentional collision. They're disambiguated by *context*: brand-amber only on actions/nav/mark; warn-amber only inside status pills/badges. `--warn` is pushed slightly more orange-gold than brand to keep them separable; never place them adjacent in the same control.

### 3.5 Category spines (INT/EXT × day-part)

Left-edge color coding on scene strips so the board reads by color before words. Indicative dark values (light shifts deeper):

| Category | Dark |
|---|---|
| INT/Day | `#e0a04a` |
| INT/Night | `#6aa9e0` |
| EXT/Day | `#5fb87a` |
| EXT/Night | `#9a7fd0` |

(AI-flagged rows replace the solid spine with the `--ai-grad` spine.)

---

## 4. Typography

| Role | Family | Notes |
|---|---|---|
| Display (page titles, wordmark, numbers-as-identity) | **Bricolage Grotesque** 700–800 | Tight tracking (`-0.3px`), distinctive character |
| UI (body, labels, buttons) | **Hanken Grotesk** 400–700 | Calm, legible workhorse |
| Data / mono (scene #s, page eighths, timecode, budget figures) | **JetBrains Mono** 400–700 | `font-variant-numeric: tabular-nums` everywhere numbers align |

Scene numbers, page eighths (e.g. `1 2/8`), call times and money are **always mono** — they are data, and alignment matters.

---

## 5. Signature Devices

1. **Tungsten filament** — a 1px amber hairline with a soft glow, used under the wordmark and as the active-nav indicator (left bar). The "lit" detail that makes the brand feel switched-on. (`box-shadow: 0 0 8–9px var(--brand)`.)
2. **Film grain** — an SVG fractal-noise overlay at `mix-blend-mode: overlay`, opacity `--grain` (0.55 dark / 0.30 light). Surfaces only; never over text runs that need crispness. Also gives the AI glass something real to frost.
3. **Ember-duotone mark** — logo tile and primary buttons use `linear-gradient(140deg, var(--brand), var(--brand-2))` rather than a flat fill, for warmth and depth.
4. **Category spines** — see §3.5.

---

## 6. Core Component Conventions

- **App shell** — left **grouped sidebar** (phase-ordered: Develop → Plan → Shoot …) with an AI Assistant entry marked by the gradient dot; contextual right panel per module; **⌘K command palette** as the primary power-user surface (AI actions live here too, dot-marked).
- **Primary button** — ember-duotone fill, `--brand-ink` text, soft amber shadow.
- **Scene strip (stripboard row)** — opaque `--s2`, hairline border, colored category left-spine, mono scene number, `INT/N` day-part tag, synopsis, mono page-eighths. AI-flagged variant: gradient spine + `--ai-shadow`.
- **AI suggestion dock / chip** — frosted glass per §3.3; dismissible; the affirmative action ("Review"/"Apply") may be amber. AI output is always *suggestion*, never destructive.
- **Chrome (top bar, palette, panels, modals)** — may use glass; content beneath stays opaque.

---

## 7. Density

- **Comfortable** (default) — generous row padding; the everyday mode.
- **Compact** — tighter line-height/padding for heavy grids (full stripboard, DooD, budget ledger). A per-view toggle, persisted. Capability is identical; only spacing changes.

---

## 8. Theming & Implementation Notes

- Dark/light via the existing `darkMode: ["class"]` setup; tokens live as CSS custom properties and feed the shadcn HSL variables. Provide both palettes; respect `prefers-color-scheme` on first load, user-overridable.
- Keep tokens semantic (`--brand`, `--ai-grad`, `--ok`…), not literal, so future themes (e.g. the deferred Tungsten/Phosphor variants) can re-skin without component changes.
- `backdrop-filter` is used only on chrome/AI layers; provide a solid-fallback background for unsupported contexts.
- Grain and glow are decorative — gate behind `prefers-reduced-transparency` / a "reduce effects" setting where appropriate.

---

## 9. Accessibility

- Body and primary UI text meet **WCAG AA** on their surfaces; `--tx-3` is reserved for non-essential muted text only.
- **Never encode meaning in color alone** — status always pairs color with a label/icon; AI is marked by the dot *and* placement/label, not hue alone (important given the green/amethyst gradient vs. green status).
- Visible focus rings (amber on dark, `--brand-on` on light); full keyboard path including ⌘K.
- Honor `prefers-reduced-motion` (no glow pulses/animation) and reduced-transparency (drop grain/glass to solids).
- Verify the amber `--brand` vs `--warn` separation with a color-blindness pass; rely on context + iconography, not the hue gap, for the distinction.

---

## 10. Open Items (cosmetic, non-blocking)

- Final-tune `--warn` orange offset against `--brand` after a CVD check.
- Confirm exact light-mode category-spine values.
- Decide whether grain ships at these opacities on very large 4K canvases (perf check) or scales down.
- Logo: ember-duotone chosen "for now" — revisit a bespoke mark later; current "SF" tile is a placeholder lockup.
