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
