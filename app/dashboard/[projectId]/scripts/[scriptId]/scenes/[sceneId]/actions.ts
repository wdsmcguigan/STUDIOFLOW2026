"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSceneInApp } from "@/lib/scripts/data";
import { editSceneInput } from "@/lib/scripts/schema";

export async function editSceneAction(
  ctx: { projectId: string; scriptId: string; sceneId: string },
  formData: FormData,
) {
  const parsed = editSceneInput.safeParse({
    int_ext: formData.get("int_ext") ?? "",
    location_slug: formData.get("location_slug") ?? "",
    time_of_day: formData.get("time_of_day") ?? "",
    synopsis: formData.get("synopsis") ?? "",
    script_day: formData.get("script_day") ?? "",
  });
  if (!parsed.success) {
    console.error("[editSceneAction] invalid input", parsed.error.flatten());
    return;
  }
  try {
    const supabase = await createClient();
    await updateSceneInApp(supabase as unknown as never, {
      projectId: ctx.projectId,
      sceneId: ctx.sceneId,
      patch: parsed.data,
    });
  } catch (err) {
    console.error("[editSceneAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}/scenes/${ctx.sceneId}`);
}
