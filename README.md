<div align="center">

# 🎬 StudioFlow

### The AI-native production multiverse for filmmakers

An end-to-end, AI-powered production management platform that unifies script, schedule, budget, cast, locations, VFX, audio, dailies and post-production into a single, intelligent, real-time workflow.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://studioflow-2026.vercel.app)

**[Live App](https://studioflow-2026.vercel.app)** · **[Landing Page](https://studioflow-2026.vercel.app/landing)**

</div>

---

## Overview

StudioFlow is a cloud-native, AI-first platform that orchestrates the entire production lifecycle. Instead of stitching together disconnected tools, every department lives inside one reactive interface: change the script and the breakdowns, schedules, and budgets ripple across the system; ask the AI to generate a stripboard, storyboard, or budget forecast and it does so in context.

The app is **local-first** — production data is stored in your browser via IndexedDB, so it's fast and works offline — with AI generation and authentication layered on top.

## ✨ Features

### Immersive landing experience (`/landing`)
- WebGL-inspired particle field, floating glassmorphism holo-panels with 3D pointer tilt, an abstract orbiting 3D core, and a perspective grid.
- Pure CSS + Canvas animations with cinematic scroll-reveal transitions and count-up stats — **zero heavy 3D dependencies**.
- Fully respects `prefers-reduced-motion`.

### Production modules
| Group | Modules |
| :--- | :--- |
| **Production** | Script, Schedule, Storyboard, Cast, Locations, Gear, Crew, Call Sheets, Legal Documents, Budget |
| **Workflow / Post** | Dailies (Camera-to-Cloud), Dailies Review, Post-Production Timeline, Asset Linking, Assemblies |
| **Creative** | Moodboard, Audio, VFX Pipeline |
| **Insights** | Analytics Dashboard, Budget Tracking, User Management, Team Collaboration Hub, Asset Management |
| **Global** | Calendar, Contacts, Global & Project Settings |

### AI generation (Google Gemini)
- **Context-aware** breakdowns, schedules, budget forecasts, and risk analysis.
- **Generative media** — storyboards, concept art, and video via Gemini image/video models (incl. Gemini 3 Pro Image / "Nano-Banana Pro").
- A dedicated creation flow with preset management, asset upload/selection, and generation history.

### Privacy & compliance
- **Legal pages**: [`/privacy`](https://studioflow-2026.vercel.app/privacy) (GDPR + CCPA/CPRA aware), [`/terms`](https://studioflow-2026.vercel.app/terms) (California governing law), [`/cookies`](https://studioflow-2026.vercel.app/cookies).
- **Granular cookie consent** banner — necessary cookies always on, analytics **opt-in**, choice stored locally and re-openable from any footer.
- Analytics (Vercel) only loads **after** consent is granted.

## 🧱 Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| Language | [TypeScript 5](https://www.typescriptlang.org/), [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/), [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate) |
| UI primitives | [Radix UI](https://www.radix-ui.com/) + shadcn-style components (`components/ui`), [lucide-react](https://lucide.dev/) icons |
| Local data | [Dexie](https://dexie.org/) (IndexedDB), `dexie-react-hooks` |
| AI | [@google/genai](https://www.npmjs.com/package/@google/genai) & [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini) |
| Auth | [Clerk](https://clerk.com/) (optional — see below) |
| Forms / validation | react-hook-form, zod |
| Analytics | [@vercel/analytics](https://vercel.com/analytics) (consent-gated) |
| Hosting | [Vercel](https://vercel.com/) |

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+**
- **npm** (a `package-lock.json` is committed)

### Installation

```bash
git clone https://github.com/wdsmcguigan/STUDIOFLOW2026.git
cd STUDIOFLOW2026
npm install
```

### Environment variables

Create a `.env.local` file in the project root. All variables are **optional** for local development — the app degrades gracefully without them:

```bash
# Authentication (Clerk). If omitted, the app runs without auth and the
# landing/legal pages still work — ClerkProvider only mounts when this is set.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# AI generation (Google Gemini). Required to use AI features.
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

> Additional provider keys (e.g. Firebase) may be configured in your Vercel project for production. Never commit secrets — `.env*.local` is gitignored.

### Run the dev server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** for the app, or **[/landing](http://localhost:3000/landing)** for the marketing page.

## 📜 Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |

## 🗂️ Project Structure

```
STUDIOFLOW2026/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Main dashboard (StudioFlow application)
│   ├── landing/              # Immersive marketing landing page
│   ├── privacy/ terms/ cookies/  # Legal & compliance pages
│   ├── layout.tsx            # Root layout (Clerk-optional, mounts consent)
│   └── globals.css           # Global styles, theme tokens, animations
├── components/
│   ├── landing/              # Particle field, holo cards, scroll reveal
│   ├── legal/                # Shared legal page shell
│   ├── projectmodules/       # Per-project modules (Script, Schedule, VFX…)
│   ├── globalmodules/        # Calendar, Contacts, global settings
│   ├── creation-flow/        # AI generation system & asset pipeline
│   ├── layout/               # App sidebar & shell
│   ├── ui/                   # Radix/shadcn UI primitives
│   ├── cookie-consent.tsx    # Granular consent manager
│   └── open-cookie-settings.tsx
├── lib/
│   ├── db.ts                 # Dexie (IndexedDB) schema + mock seeding
│   ├── geminiService.ts      # Google Gemini integration
│   ├── site-config.ts        # Legal/contact config & sub-processors
│   └── utils.ts
├── hooks/                    # use-mobile, use-toast
├── public/                   # Static assets
└── docs/                     # Specs, plans, desktop (Tauri) notes
```

## 💾 Data & Persistence

StudioFlow uses **Dexie** over IndexedDB (`StudioFlowDB`) for a local-first experience. Projects, budget line items, generated assets, and presets are stored in the browser. On first load, realistic **mock data is seeded** so you can explore the app immediately. Data stored locally can be cleared from your browser's site settings.

## 🔐 Authentication

Auth is powered by **Clerk** and is **optional by design**: `ClerkProvider` only mounts when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is present. This lets the public landing and legal pages build and render in any environment (including previews) without auth keys, while keeping full auth behavior wherever the key is configured.

## ☁️ Deployment

The app is deployed on **Vercel** and auto-deploys on push via the GitHub integration:
- Pushes to `main` → **Production** ([studioflow-2026.vercel.app](https://studioflow-2026.vercel.app))
- Pull requests → isolated **Preview** deployments

Configure the environment variables above in your Vercel project settings (Production and Preview scopes).

## 🗺️ Roadmap

- 🖥️ **Desktop app** — packaging for PC via Tauri (see `docs/Tauri for PC`).
- 🔗 Deeper cross-module automation and real-time multi-user collaboration.
- 📦 Expanded deliverables and export pipelines.

## ⚖️ Legal

The Privacy Policy, Terms of Service, and Cookie Policy are provided as comprehensive starting templates and should be reviewed by legal counsel before commercial launch. Update the entity name, contact details, and jurisdiction in [`lib/site-config.ts`](lib/site-config.ts).

---

<div align="center">
<sub>Built with Next.js, React, and Google Gemini · © 2026 StudioFlow</sub>
</div>
