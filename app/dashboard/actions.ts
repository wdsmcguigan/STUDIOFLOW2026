"use server";
import { revalidatePath } from "next/cache";
import { createProject } from "@/lib/projects/data";

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  await createProject({ title, status: "development" });
  revalidatePath("/dashboard");
}
