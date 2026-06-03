"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSceneInApp } from "@/lib/scripts/data";

export async function editSceneAction(
  ctx: { projectId: string; scriptId: string; sceneId: string },
  formData: FormData,
) {
  const patch = {
    int_ext: String(formData.get("int_ext") ?? "") || null,
    location_slug: String(formData.get("location_slug") ?? "") || null,
    time_of_day: String(formData.get("time_of_day") ?? "") || null,
    synopsis: String(formData.get("synopsis") ?? "") || null,
    script_day: String(formData.get("script_day") ?? "") || null,
  };
  try {
    const supabase = await createClient();
    await updateSceneInApp(supabase as unknown as never, {
      projectId: ctx.projectId,
      sceneId: ctx.sceneId,
      patch,
    });
  } catch (err) {
    console.error("[editSceneAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}/scenes/${ctx.sceneId}`);
}
