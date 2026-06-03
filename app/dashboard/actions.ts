"use server";
import { revalidatePath } from "next/cache";
import { createProject } from "@/lib/projects/data";

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  try {
    await createProject({ title, status: "development" });
  } catch (err) {
    // TODO (UX phase): surface a structured error via useActionState
    console.error("[createProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}
