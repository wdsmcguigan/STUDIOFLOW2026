import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/data";
import { TopBar } from "@/components/layout/top-bar";

/**
 * Project workspace stub — Phase 0 landing.
 * Renders inside the project shell (app/dashboard/[projectId]/layout.tsx).
 * Phase 1 modules (script import, scene model, breakdown) hang off this page.
 *
 * This page provides its own <TopBar> per the shell convention: each shell
 * page owns its page-level title/sub/actions so the top bar is contextual.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const project = await getProject(supabase as never, projectId);
  if (!project || project.deleted_at) notFound();

  return (
    <>
      <TopBar
        title={project.title}
        sub={`Status: ${project.status}`}
        actions={
          <Link
            href="/dashboard"
            className="text-xs underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            style={{ color: "var(--tx-2)" }}
          >
            ← All projects
          </Link>
        }
      />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div
          className="rounded-xl border p-8"
          style={{
            borderColor: "var(--line-2)",
            borderStyle: "dashed",
            color: "var(--tx-2)",
          }}
        >
          <p className="font-medium" style={{ color: "var(--tx)" }}>
            Project workspace
          </p>
          <p className="mt-1 text-sm">
            Script import, the scene model, and breakdown arrive in Phase 1. This page is the
            stub the project modules will hang off of.
          </p>
        </div>
      </main>
    </>
  );
}
