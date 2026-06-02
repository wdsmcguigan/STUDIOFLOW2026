# Phase 0: Walking Skeleton — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the entire StudioFlow stack end-to-end — auth → typed data access → database RLS → server action → UI → CI → deploy → Tauri desktop shell — on one minimal feature (create & list Projects), establishing the patterns every later phase reuses.

**Architecture:** Fresh Next.js (App Router) app at the repo root, with the v0 prototype moved to `legacy/` as a UI/reference parts bin. Supabase provides Postgres + Auth + Storage. Data access goes through **supabase-js with generated TypeScript types** (not a separate ORM) so that **Row-Level Security is enforced by the authenticated user's session** — the security boundary lives in the database, not in app code. A thin typed data layer wraps queries; Zod validates inputs at the server boundary. A Tauri v2 shell wraps the deployed web app for the desktop build.

**Tech Stack:** Next.js 16 (App Router, React 19, TypeScript) · Tailwind + shadcn/ui · Supabase (`@supabase/ssr`, `@supabase/supabase-js`) · Supabase CLI (local Postgres + migrations + type generation) · Vitest + @testing-library/react · Tauri v2 · GitHub Actions + Vercel.

**Resolved open questions (from spec §10):**
- **Data access:** Supabase-native (supabase-js + `supabase gen types`) for Phase 0 — keeps RLS enforcement correct and simple. Drizzle deferred until ergonomic typed queries with explicit RLS context are needed (revisit ~Phase 4).
- **Job runner:** N/A for Phase 0 (first needed in Phase 2).

**Scope note:** Phase 0 deliberately implements only `profiles` + `projects` — *not* the full production graph (Scene/Element/Character/etc.). Its job is to prove the stack and establish the *patterns* (migrations, RLS, typed data layer, server actions, tests). The remaining core entities land in Phases 1–2 as their modules are built, reusing the patterns set here.

---

## File Structure

**Setup / relocation**
- `legacy/` — the entire current v0 app, moved here intact for reference and UI porting.

**New app (repo root)**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json` — scaffolding/config.
- `vitest.config.ts`, `vitest.setup.ts` — test harness.
- `.env.local` (gitignored), `.env.example` — environment template.
- `app/layout.tsx`, `app/globals.css` — root layout/styles (from scaffold).
- `app/page.tsx` — root: redirect to `/dashboard` or `/login`.
- `app/login/page.tsx` — auth entry (Supabase Auth UI / email magic-link).
- `app/auth/callback/route.ts` — OAuth/code-exchange callback.
- `app/dashboard/page.tsx` — lists Projects, hosts the create form (the skeleton feature).
- `app/dashboard/actions.ts` — `createProjectAction` server action.
- `middleware.ts` — refreshes the Supabase session on every request.
- `lib/supabase/server.ts` — server Supabase client (cookies).
- `lib/supabase/client.ts` — browser Supabase client.
- `lib/supabase/middleware.ts` — session-refresh helper used by `middleware.ts`.
- `lib/db/types.ts` — generated Supabase types (output of `supabase gen types`).
- `lib/projects/schema.ts` — Zod schemas + TS types for Project (the typed contract).
- `lib/projects/data.ts` — typed data layer: `listProjects`, `createProject`.
- `components/projects/project-list.tsx`, `components/projects/create-project-form.tsx` — UI (ported/adapted from v0 look).
- `supabase/migrations/0001_profiles_projects.sql` — `profiles` + `projects` tables + RLS policies.
- `supabase/config.toml` — Supabase CLI config (from `supabase init`).

**Tests**
- `lib/projects/schema.test.ts` — Zod validation (unit).
- `lib/projects/data.test.ts` — data layer + RLS (integration, against local Supabase).
- `components/projects/create-project-form.test.tsx` — form component (unit).

**Desktop / CI**
- `src-tauri/` — Tauri v2 project (config, Rust shell).
- `.github/workflows/ci.yml` — lint + typecheck + test + build.

---

## Task 1: Preserve v0 as legacy and scaffold the fresh app

**Files:**
- Move: all current root app source → `legacy/`
- Create: fresh Next.js app at repo root

- [ ] **Step 1: Move the v0 prototype into `legacy/`**

```bash
mkdir -p legacy
git mv app components hooks lib styles public legacy/ 2>/dev/null || true
git mv components.json next.config.mjs postcss.config.mjs tailwind.config.js tsconfig.json package.json package-lock.json pnpm-lock.yaml next-env.d.ts legacy/ 2>/dev/null || true
git mv check_models.js reproduce_issue.js legacy/ 2>/dev/null || true
rm -rf node_modules .next
git add -A && git commit -m "chore: move v0 prototype to legacy/ for reference"
```

- [ ] **Step 2: Scaffold a fresh Next.js app into a temp dir, then move it to root**

Run (accept defaults: TypeScript yes, ESLint yes, Tailwind yes, App Router yes, Turbopack yes, import alias `@/*`):

```bash
npx create-next-app@latest .sf-tmp --ts --eslint --tailwind --app --use-npm --import-alias "@/*" --no-src-dir
# move scaffold into repo root (keep legacy/, docs/, .git, .superpowers, StudioFlowNotes, documentation)
shopt -s dotglob
mv .sf-tmp/* . && mv .sf-tmp/.gitignore .gitignore.new 2>/dev/null || true
rmdir .sf-tmp
# merge gitignore additions
cat .gitignore.new >> .gitignore 2>/dev/null; rm -f .gitignore.new
shopt -u dotglob
```

- [ ] **Step 3: Verify the app builds and runs**

Run:
```bash
npm install
npm run build
```
Expected: build completes with no errors; `.next/` produced.

- [ ] **Step 4: Ensure `.superpowers/` and Supabase local artifacts are ignored**

Append to `.gitignore`:
```
.superpowers/
.env.local
supabase/.branches
supabase/.temp
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: scaffold fresh Next.js app at repo root"
```

---

## Task 2: Test harness (Vitest + Testing Library)

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Test: `lib/sanity.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/legacy/**", "**/e2e/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add scripts to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: Write a sanity test at `lib/sanity.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it and verify it passes**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "test: add Vitest + Testing Library harness"
```

---

## Task 3: Supabase local project + clients

**Files:**
- Create: `supabase/config.toml` (via CLI), `.env.local`, `.env.example`
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, `middleware.ts`

- [ ] **Step 1: Install Supabase packages and init local project**

```bash
npm install @supabase/supabase-js @supabase/ssr
npx supabase init        # creates supabase/config.toml
npx supabase start       # starts local Postgres/Auth; prints API URL + anon key + service_role key
```
Expected: `supabase start` prints `API URL: http://127.0.0.1:54321`, `anon key`, `service_role key`.

- [ ] **Step 2: Create `.env.example` and `.env.local`**

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Then copy to `.env.local` and paste the values printed by `supabase start`.

- [ ] **Step 3: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; safe to ignore when middleware refreshes sessions
          }
        },
      },
    }
  );
}
```

- [ ] **Step 4: Create `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Create `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}
```

- [ ] **Step 6: Create `middleware.ts`**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 7: Verify the app still builds with Supabase wired**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add Supabase local project and SSR clients"
```

---

## Task 4: Database schema + RLS (profiles, projects)

**Files:**
- Create: `supabase/migrations/0001_profiles_projects.sql`
- Create: `lib/db/types.ts` (generated)

- [ ] **Step 1: Write the migration `supabase/migrations/0001_profiles_projects.sql`**

```sql
-- profiles: one row per auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile - select" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile - upsert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile when a user signs up
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- projects: owner-scoped
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'development',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "owner - select" on public.projects
  for select using (auth.uid() = owner_id);
create policy "owner - insert" on public.projects
  for insert with check (auth.uid() = owner_id);
create policy "owner - update" on public.projects
  for update using (auth.uid() = owner_id);
create policy "owner - delete" on public.projects
  for delete using (auth.uid() = owner_id);
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run: `npx supabase migration up`
Expected: migration `0001_profiles_projects` applied; no errors.

- [ ] **Step 3: Generate TypeScript types to `lib/db/types.ts`**

Run: `npx supabase gen types typescript --local > lib/db/types.ts`
Expected: file contains a `Database` type with `public.Tables.projects` and `public.Tables.profiles`.

- [ ] **Step 4: Verify types compile**

Run: `npm run typecheck`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add profiles + projects schema with RLS"
```

---

## Task 5: Typed contract — Zod schema for Project

**Files:**
- Create: `lib/projects/schema.ts`
- Test: `lib/projects/schema.test.ts`

- [ ] **Step 1: Install Zod**

```bash
npm install zod
```

- [ ] **Step 2: Write the failing test `lib/projects/schema.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { createProjectInput } from "@/lib/projects/schema";

describe("createProjectInput", () => {
  it("accepts a valid title", () => {
    const result = createProjectInput.safeParse({ title: "My Film" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = createProjectInput.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("trims and defaults status to development", () => {
    const parsed = createProjectInput.parse({ title: "  Untitled  " });
    expect(parsed.title).toBe("Untitled");
    expect(parsed.status).toBe("development");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- lib/projects/schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/projects/schema`.

- [ ] **Step 4: Write `lib/projects/schema.ts`**

```ts
import { z } from "zod";

export const projectStatus = z.enum([
  "development",
  "pre-production",
  "production",
  "post",
  "archived",
]);
export type ProjectStatus = z.infer<typeof projectStatus>;

export const createProjectInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  status: projectStatus.default("development"),
});
export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const project = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Project = z.infer<typeof project>;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- lib/projects/schema.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Project Zod schema (typed contract)"
```

---

## Task 6: Data layer + RLS integration test

**Files:**
- Create: `lib/projects/data.ts`
- Test: `lib/projects/data.test.ts`

- [ ] **Step 1: Write the failing RLS integration test `lib/projects/data.test.ts`**

This test talks to local Supabase directly with two users and asserts RLS isolation.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function makeUser(email: string) {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
  });
  const client = createClient(url, anon, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: "password123" });
  return client;
}

describe("projects RLS", () => {
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;

  beforeAll(async () => {
    alice = await makeUser(`alice-${Date.now()}@test.dev`);
    bob = await makeUser(`bob-${Date.now()}@test.dev`);
  });

  it("a user can create and read their own project", async () => {
    const { data: me } = await alice.auth.getUser();
    const { error } = await alice
      .from("projects")
      .insert({ title: "Alice Film", owner_id: me.user!.id });
    expect(error).toBeNull();

    const { data } = await alice.from("projects").select("*");
    expect(data?.some((p) => p.title === "Alice Film")).toBe(true);
  });

  it("a user cannot see another user's project", async () => {
    const { data } = await bob.from("projects").select("*");
    expect(data?.some((p) => p.title === "Alice Film")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails as expected**

Ensure local Supabase is running (`npx supabase start`) and `.env.local` is loaded. Run:
```bash
npx dotenv -e .env.local -- npm test -- lib/projects/data.test.ts
```
(If `dotenv-cli` is missing: `npm install -D dotenv-cli`.)
Expected: tests run and **pass** (RLS policies from Task 4 already enforce this) — this test validates the schema/RLS rather than driving new code. If it fails, fix the Task 4 policies before continuing.

- [ ] **Step 3: Write the typed data layer `lib/projects/data.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import { createProjectInput, type CreateProjectInput, type Project } from "@/lib/projects/schema";

export async function listProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Project[];
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const parsed = createProjectInput.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({ title: parsed.title, status: parsed.status, owner_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}
```

- [ ] **Step 4: Verify typecheck and tests pass**

Run:
```bash
npm run typecheck
npx dotenv -e .env.local -- npm test -- lib/projects/data.test.ts
```
Expected: no type errors; RLS tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add typed Project data layer + RLS integration test"
```

---

## Task 7: Auth (login + callback + protected dashboard)

**Files:**
- Create: `app/login/page.tsx`, `app/auth/callback/route.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with an auth-aware redirect**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
```

- [ ] **Step 2: Create `app/login/page.tsx` (email magic-link)**

```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sign in to StudioFlow</h1>
      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <button type="submit" className="rounded bg-black px-3 py-2 text-white">
            Send magic link
          </button>
        </form>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Create `app/auth/callback/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual auth smoke test**

Run `npm run dev`, open `http://localhost:3000`. Expected: redirect to `/login`. Local Supabase captures magic-link emails at the Inbucket URL printed by `supabase start` (`http://127.0.0.1:54324`) — open the link there and confirm you land on `/dashboard` (will 404 until Task 8; that's expected).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add magic-link auth (login, callback, root redirect)"
```

---

## Task 8: Dashboard UI — list + create projects

**Files:**
- Create: `app/dashboard/page.tsx`, `app/dashboard/actions.ts`
- Create: `components/projects/project-list.tsx`, `components/projects/create-project-form.tsx`
- Test: `components/projects/create-project-form.test.tsx`

- [ ] **Step 1: Add shadcn/ui and base components**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input card
```

- [ ] **Step 2: Write the failing form component test `components/projects/create-project-form.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProjectForm } from "@/components/projects/create-project-form";

describe("CreateProjectForm", () => {
  it("calls the action with the entered title", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(<CreateProjectForm action={action} />);
    await userEvent.type(screen.getByPlaceholderText("Project title"), "Heat 2");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(action).toHaveBeenCalled();
    const fd = action.mock.calls[0][0] as FormData;
    expect(fd.get("title")).toBe("Heat 2");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- components/projects/create-project-form.test.tsx`
Expected: FAIL — cannot resolve `@/components/projects/create-project-form`.

- [ ] **Step 4: Write `components/projects/create-project-form.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateProjectForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex gap-2">
      <Input name="title" placeholder="Project title" required />
      <Button type="submit">Create</Button>
    </form>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- components/projects/create-project-form.test.tsx`
Expected: 1 passed.

- [ ] **Step 6: Write `components/projects/project-list.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/projects/schema";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-muted-foreground">No projects yet. Create your first above.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <li key={p.id}>
          <Card className="p-4">
            <h3 className="font-medium">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.status}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: Write `app/dashboard/actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createProject } from "@/lib/projects/data";

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  await createProject({ title, status: "development" });
  revalidatePath("/dashboard");
}
```

- [ ] **Step 8: Write `app/dashboard/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/data";
import { ProjectList } from "@/components/projects/project-list";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { createProjectAction } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projects = await listProjects();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <CreateProjectForm action={createProjectAction} />
      <ProjectList projects={projects} />
    </main>
  );
}
```

- [ ] **Step 9: Verify build, typecheck, and manual end-to-end**

Run:
```bash
npm run typecheck && npm run build
npm run dev
```
Manual: sign in → land on `/dashboard` → create a project → it appears → reload the page → it persists. Expected: all true.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: dashboard lists and creates projects (skeleton feature complete)"
```

---

## Task 9: CI pipeline (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
```

> Note: the RLS integration test (`lib/projects/data.test.ts`) needs a live Supabase and is excluded from CI for now — add a `supabase start` step or a hosted test project in a later CI hardening pass. Mark it with a `describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)` guard so CI's `npm run test` stays green.

- [ ] **Step 2: Guard the RLS test so CI passes without a live DB**

In `lib/projects/data.test.ts`, change `describe("projects RLS", () => {` to:
```ts
describe.skipIf(!process.env.SUPABASE_SERVICE_ROLE_KEY)("projects RLS", () => {
```

- [ ] **Step 3: Verify the full CI command set locally**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all pass (RLS suite skipped without service key).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "ci: add lint/typecheck/test/build workflow"
```

---

## Task 10: Tauri desktop shell (stub)

**Files:**
- Create: `src-tauri/` (via Tauri CLI)
- Modify: `package.json` (tauri scripts)

- [ ] **Step 1: Add Tauri v2 to the project**

```bash
npm install -D @tauri-apps/cli
npx tauri init
```
Answer prompts: app name `StudioFlow`; window title `StudioFlow`; frontend dev command `npm run dev`; frontend build command `npm run build`; dev URL `http://localhost:3000`; frontend dist `../.next` (placeholder — desktop loads the dev/hosted URL for now).

- [ ] **Step 2: Point the desktop window at the running app**

In `src-tauri/tauri.conf.json`, set `build.devUrl` to `http://localhost:3000` and `build.frontendDist` to `http://localhost:3000` (Phase 0 stub: the desktop shell loads the live app URL; static bundling/SSR strategy is a Phase 7 concern). Add to `package.json` scripts:
```json
"tauri": "tauri",
"desktop:dev": "tauri dev"
```

- [ ] **Step 3: Verify the desktop shell launches**

With `npm run dev` running in one terminal, run in another:
```bash
npm run desktop:dev
```
Expected: a native window opens showing the StudioFlow login page. (Rust toolchain required; if absent, install via `rustup` first.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Tauri v2 desktop shell stub"
```

---

## Task 11: Deploy to Vercel + verify

**Files:** none (platform configuration)

- [ ] **Step 1: Create a hosted Supabase project and push the schema**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase gen types typescript --linked > lib/db/types.ts
```

- [ ] **Step 2: Deploy to Vercel with env vars**

In the Vercel project settings add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (hosted values). Then:
```bash
npx vercel --prod
```
Expected: a live URL.

- [ ] **Step 3: End-to-end verification on the deployed app**

On the live URL: sign in via magic link → create a project → reload → it persists. Confirm a second account cannot see the first account's projects.
Expected: all true. **This is the Phase 0 done criterion: the whole stack works end-to-end in production.**

- [ ] **Step 4: Commit any config changes**

```bash
git add -A && git commit -m "chore: link hosted Supabase + production deploy config"
```

---

## Done criteria for Phase 0

- [ ] Fresh app at repo root; v0 preserved in `legacy/`.
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all green.
- [ ] A signed-in user can create and list projects; data persists across reloads.
- [ ] RLS proven: a second user cannot see the first user's projects (integration test).
- [ ] Tauri desktop shell launches and shows the app.
- [ ] CI runs on push/PR; app deploys to Vercel and works end-to-end in production.
