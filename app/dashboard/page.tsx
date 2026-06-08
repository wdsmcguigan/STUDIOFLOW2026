import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/data";
import { ProjectList } from "@/components/projects/project-list";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { createProjectAction } from "./actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DensityToggle } from "@/components/layout/density-toggle";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [active, archived, trashed] = await Promise.all([
    listProjects(supabase as never, "active"),
    listProjects(supabase as never, "archived"),
    listProjects(supabase as never, "trashed"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Page header — TopBar pattern without the project sidebar trigger */}
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[var(--line)] bg-background/80 px-6 py-3 backdrop-blur-sm">
        <div>
          {/* Brandmark: ember SF tile + wordmark + filament */}
          <div className="relative flex items-center gap-2.5 pb-2">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold leading-none select-none"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(140deg, var(--brand), var(--brand-2))",
                color: "var(--brand-ink)",
                boxShadow: "0 4px 14px var(--brand-soft)",
              }}
              aria-hidden="true"
            >
              SF
            </span>
            <span
              className="text-[15px] font-extrabold tracking-[-0.3px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              StudioFlow
            </span>
            {/* Tungsten filament */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--brand), transparent)",
                boxShadow: "0 0 8px var(--brand)",
                opacity: 0.9,
              }}
            />
          </div>
        </div>
        <div className="flex-1" />
        <DensityToggle />
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-6">
        {/* Page title */}
        <div>
          <h1
            className="text-2xl font-extrabold tracking-[-0.3px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Projects
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tx-2)" }}>
            Select a project to continue, or create a new one below.
          </p>
        </div>

        {/* Create project form — ember "Create" CTA */}
        <section aria-label="Create project">
          <CreateProjectForm action={createProjectAction} />
        </section>

        {/* Active projects */}
        <section aria-label="Your projects">
          <ProjectList projects={active} scope="active" />
        </section>

        {/* Archived — shelved out of the main list, still openable */}
        {archived.length > 0 && (
          <section aria-label="Archived projects">
            <h2
              className="mb-3 text-sm font-bold tracking-[-0.2px]"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx-2)" }}
            >
              Archived
            </h2>
            <ProjectList projects={archived} scope="archived" />
          </section>
        )}

        {/* Trash — soft-deleted; restore or permanently delete */}
        {trashed.length > 0 && (
          <section aria-label="Trash">
            <h2
              className="mb-1 text-sm font-bold tracking-[-0.2px]"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx-2)" }}
            >
              Trash
            </h2>
            <p className="mb-3 text-xs" style={{ color: "var(--tx-2)" }}>
              Deleted projects stay here until you restore or permanently delete them.
            </p>
            <ProjectList projects={trashed} scope="trashed" />
          </section>
        )}
      </main>
    </div>
  );
}
