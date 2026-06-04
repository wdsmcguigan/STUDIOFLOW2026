"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { start, getRun } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { breakdownWorkflow } from "@/workflows/breakdown";
import {
  createJob,
  setJobStatus,
  getJob,
  listScenesForBreakdown,
} from "@/lib/breakdown/data";

const startBreakdownInput = z.object({
  projectId: z.string().uuid(),
  scriptId: z.string().uuid(),
});

export async function startBreakdownAction(formData: FormData) {
  const parsed = startBreakdownInput.safeParse({
    projectId: formData.get("projectId"),
    scriptId: formData.get("scriptId"),
  });
  if (!parsed.success) return;
  const { projectId, scriptId } = parsed.data;
  try {
    const supabase = await createClient(); // USER RLS context — proves ownership
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const scenes = await listScenesForBreakdown(supabase as never, scriptId); // RLS: only the user's scenes
    if (scenes.length === 0) return;
    const jobRow = await createJob(supabase as never, {
      projectId,
      type: "breakdown",
      params: { scriptId, sceneIds: scenes.map((s) => s.id) },
      total: scenes.length,
      createdBy: user.id,
    });
    const run = await start(breakdownWorkflow, [
      { jobId: jobRow.id, projectId, scenes },
    ]);
    await setJobStatus(supabase as never, {
      id: jobRow.id,
      status: "running",
      workflowRunId: run.runId,
    });
  } catch (err) {
    console.error("[startBreakdownAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const cancelInput = z.object({
  projectId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export async function cancelJobAction(formData: FormData) {
  const parsed = cancelInput.safeParse({
    projectId: formData.get("projectId"),
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) return;
  const { projectId, jobId } = parsed.data;
  try {
    const supabase = await createClient();
    const j = await getJob(supabase as never, jobId); // RLS: only if the user owns it
    await setJobStatus(supabase as never, { id: jobId, status: "cancelled" }); // cooperative cancel flag
    if (j?.workflow_run_id) {
      try {
        await getRun(j.workflow_run_id).cancel(); // best-effort native WDK cancel
      } catch {
        // best-effort — log swallowed; cooperative flag is the reliable path
      }
    }
  } catch (err) {
    console.error("[cancelJobAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}
