"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  softDeleteProject,
  restoreProject,
  purgeProject,
} from "@/lib/projects/data";

// Every action re-parses its input at the server boundary (invariant #4), then
// hands off to the data layer (RLS scopes the row to the owner), then revalidates.
// Error UX (structured surfacing) is deferred to the UX phase — log + return.

const idSchema = z.object({ projectId: z.string().uuid() });
const renameSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  try {
    const supabase = await createClient();
    await createProject(supabase as never, { title, status: "development" });
  } catch (err) {
    console.error("[createProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}

export async function renameProjectAction(formData: FormData) {
  const parsed = renameSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    console.error("[renameProjectAction]", parsed.error.flatten());
    return;
  }
  try {
    const supabase = await createClient();
    await updateProject(supabase as never, parsed.data.projectId, {
      title: parsed.data.title,
    });
  } catch (err) {
    console.error("[renameProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}

export async function archiveProjectAction(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return;
  try {
    const supabase = await createClient();
    await archiveProject(supabase as never, parsed.data.projectId);
  } catch (err) {
    console.error("[archiveProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}

export async function unarchiveProjectAction(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return;
  try {
    const supabase = await createClient();
    await unarchiveProject(supabase as never, parsed.data.projectId);
  } catch (err) {
    console.error("[unarchiveProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}

/** Soft-delete → Trash (the default Delete action). Reversible. */
export async function deleteProjectAction(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return;
  try {
    const supabase = await createClient();
    await softDeleteProject(supabase as never, parsed.data.projectId);
  } catch (err) {
    console.error("[deleteProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}

export async function restoreProjectAction(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return;
  try {
    const supabase = await createClient();
    await restoreProject(supabase as never, parsed.data.projectId);
  } catch (err) {
    console.error("[restoreProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}

/** Permanent, cascading delete — only reachable from the Trash view's confirm dialog. */
export async function purgeProjectAction(formData: FormData) {
  const parsed = idSchema.safeParse({ projectId: formData.get("projectId") });
  if (!parsed.success) return;
  try {
    const supabase = await createClient();
    await purgeProject(supabase as never, parsed.data.projectId);
  } catch (err) {
    console.error("[purgeProjectAction]", err);
    return;
  }
  revalidatePath("/dashboard");
}
