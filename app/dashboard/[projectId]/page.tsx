import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/data";

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

  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← Projects
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <p className="text-sm text-muted-foreground">Status: {project.status}</p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-muted-foreground">
        <p className="font-medium text-foreground">Project workspace</p>
        <p className="mt-1 text-sm">
          Script import, the scene model, and breakdown arrive in Phase 1. This page is the
          stub the project modules will hang off of.
        </p>
      </div>
    </main>
  );
}
