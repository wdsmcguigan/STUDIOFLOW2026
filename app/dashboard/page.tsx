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
