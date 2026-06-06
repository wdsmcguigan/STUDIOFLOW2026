"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { start, getRun } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { renderSceneWorkflow, referenceWorkflow } from "@/workflows/storyboard";
import {
  createJob,
  setJobStatus,
  getJob,
  getSceneHeader,
  listCharacters,
} from "@/lib/breakdown/data";
import { listLocations } from "@/lib/schedule/data";
import {
  createShot,
  updateShot,
  setShotStatus,
  reorderShots,
  deleteShot,
  listShots,
  listShotFrames,
  createShotFrame,
  selectFrame,
  setFrameStatus,
  deleteShotFrame,
  recordImageGeneration,
  updateVisualSettings,
  lockReference,
  setReferenceStatus,
} from "@/lib/storyboard/data";
import { decomposeScene } from "@/lib/storyboard/ai/decompose";
import { getDecomposeModel } from "@/lib/storyboard/ai/model";
import { uploadStoryboardImage } from "@/lib/storage/storyboards";
import type { SceneMeta } from "@/lib/storyboard/ai/prompt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reconstruct scene text from header fields — mirrors listScenesForBreakdown. */
function buildSceneText(header: {
  int_ext: string | null;
  location_slug: string | null;
  time_of_day: string | null;
  synopsis: string | null;
}): string {
  return (
    [header.int_ext, header.location_slug, header.time_of_day]
      .filter(Boolean)
      .join(". ") +
    "\n" +
    (header.synopsis ?? "")
  );
}

function revalidateStoryboard(projectId: string) {
  revalidatePath(`/dashboard/${projectId}/storyboard`);
}

// ---------------------------------------------------------------------------
// 1. boardSceneAction — synchronous decompose: scene → shot list (no images)
// ---------------------------------------------------------------------------

const boardSceneSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
});

export async function boardSceneAction(formData: FormData) {
  const parsed = boardSceneSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
  });
  if (!parsed.success) {
    console.error("[boardSceneAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const header = await getSceneHeader(supabase as never, sceneId);
    if (!header) return;

    const sceneMeta: SceneMeta = {
      intExt: header.int_ext,
      timeOfDay: header.time_of_day,
      locationName: header.location_name ?? header.location_slug,
      synopsis: header.synopsis,
    };
    const sceneText = buildSceneText(header);

    const shotList = await decomposeScene({
      model: getDecomposeModel(),
      sceneMeta,
      sceneText,
    });

    for (const s of shotList.shots) {
      await createShot(supabase as never, {
        projectId,
        sceneId,
        size: s.size,
        angle: s.angle,
        movement: s.movement,
        lens: s.lens ?? null,
        action: s.action,
        provenance: "ai",
      });
    }

    const decomposeModel = getDecomposeModel();
    const decomposeModelId =
      typeof decomposeModel === "object" &&
      decomposeModel !== null &&
      "modelId" in decomposeModel
        ? String((decomposeModel as Record<string, unknown>).modelId)
        : (process.env.STORYBOARD_DECOMPOSE_MODEL ?? "gemini-2.5-flash");
    await recordImageGeneration(supabase as never, {
      projectId,
      jobId: null,
      kind: "decompose",
      model: decomposeModelId,
      imageCount: 0,
      estCost: 0,
    });
  } catch (err) {
    console.error("[boardSceneAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 2. renderSceneAction — enqueue a render job for all unrendered shots
// ---------------------------------------------------------------------------

const renderSceneSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
});

export async function renderSceneAction(formData: FormData) {
  const parsed = renderSceneSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
  });
  if (!parsed.success) {
    console.error("[renderSceneAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Collect shots that have no selected frame (need rendering).
    const shots = await listShots(supabase as never, sceneId);
    const shotIds: string[] = [];
    for (const s of shots) {
      const frames = await listShotFrames(supabase as never, s.id);
      const hasSelected = frames.some((f) => f.is_selected);
      if (!hasSelected) shotIds.push(s.id);
    }
    if (shotIds.length === 0) return;

    const jobRow = await createJob(supabase as never, {
      projectId,
      type: "storyboard_render",
      params: { sceneId, shotIds },
      total: shotIds.length,
      createdBy: user.id,
    });
    const run = await start(renderSceneWorkflow, [
      { jobId: jobRow.id, projectId, sceneId, shotIds },
    ]);
    await setJobStatus(supabase as never, {
      id: jobRow.id,
      status: "running",
      workflowRunId: run.runId,
    });
  } catch (err) {
    console.error("[renderSceneAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 3. renderShotAction — re-render a single shot
// ---------------------------------------------------------------------------

const renderShotSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  shotId: z.string().uuid(),
});

export async function renderShotAction(formData: FormData) {
  const parsed = renderShotSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    shotId: formData.get("shotId"),
  });
  if (!parsed.success) {
    console.error("[renderShotAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, shotId } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const shotIds = [shotId];
    const jobRow = await createJob(supabase as never, {
      projectId,
      type: "storyboard_render",
      params: { sceneId, shotIds },
      total: 1,
      createdBy: user.id,
    });
    const run = await start(renderSceneWorkflow, [
      { jobId: jobRow.id, projectId, sceneId, shotIds },
    ]);
    await setJobStatus(supabase as never, {
      id: jobRow.id,
      status: "running",
      workflowRunId: run.runId,
    });
  } catch (err) {
    console.error("[renderShotAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 4. addManualShotAction — add a manually-authored shot
// ---------------------------------------------------------------------------

const addManualShotSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  action: z.string().trim().optional(),
  size: z.string().trim().optional(),
  angle: z.string().trim().optional(),
  movement: z.string().trim().optional(),
  lens: z.string().trim().optional(),
});

export async function addManualShotAction(formData: FormData) {
  const parsed = addManualShotSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    action: formData.get("action") || undefined,
    size: formData.get("size") || undefined,
    angle: formData.get("angle") || undefined,
    movement: formData.get("movement") || undefined,
    lens: formData.get("lens") || undefined,
  });
  if (!parsed.success) {
    console.error("[addManualShotAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, action, size, angle, movement, lens } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await createShot(supabase as never, {
      projectId,
      sceneId,
      action: action ?? null,
      size,
      angle,
      movement,
      lens: lens ?? null,
      provenance: "manual",
      status: "confirmed",
    });
  } catch (err) {
    console.error("[addManualShotAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 5. updateShotAction — update shot metadata fields
// ---------------------------------------------------------------------------

const updateShotSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  id: z.string().uuid(),
  action: z.string().trim().optional(),
  size: z.string().trim().optional(),
  angle: z.string().trim().optional(),
  movement: z.string().trim().optional(),
  lens: z.string().trim().optional(),
  shotNumber: z.string().trim().optional(),
});

export async function updateShotAction(formData: FormData) {
  const parsed = updateShotSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    id: formData.get("id"),
    action: formData.get("action") || undefined,
    size: formData.get("size") || undefined,
    angle: formData.get("angle") || undefined,
    movement: formData.get("movement") || undefined,
    lens: formData.get("lens") || undefined,
    shotNumber: formData.get("shotNumber") || undefined,
  });
  if (!parsed.success) {
    console.error("[updateShotAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, action, size, angle, movement, lens, shotNumber } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await updateShot(supabase as never, {
      id,
      action,
      size,
      angle,
      movement,
      lens,
      shotNumber,
    });
  } catch (err) {
    console.error("[updateShotAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 6. setShotStatusAction — flip shot status
// ---------------------------------------------------------------------------

const setShotStatusSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  id: z.string().uuid(),
  status: z.enum(["suggested", "confirmed", "rejected"]),
});

export async function setShotStatusAction(formData: FormData) {
  const parsed = setShotStatusSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    console.error("[setShotStatusAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, status } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await setShotStatus(supabase as never, { id, status });
  } catch (err) {
    console.error("[setShotStatusAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 7. reorderShotsAction — reorder shots within a scene
// ---------------------------------------------------------------------------

const reorderShotsSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  orderedIds: z.string(), // JSON array of UUIDs
});

export async function reorderShotsAction(formData: FormData) {
  const parsed = reorderShotsSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    orderedIds: formData.get("orderedIds"),
  });
  if (!parsed.success) {
    console.error("[reorderShotsAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, orderedIds: orderedIdsJson } = parsed.data;
  let orderedIds: string[];
  try {
    orderedIds = z.array(z.string().uuid()).parse(JSON.parse(orderedIdsJson));
  } catch (err) {
    console.error("[reorderShotsAction] invalid orderedIds JSON", err);
    return;
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await reorderShots(supabase as never, { sceneId, orderedIds });
  } catch (err) {
    console.error("[reorderShotsAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 8. deleteShotAction — delete a shot (cascades to frames)
// ---------------------------------------------------------------------------

const deleteShotSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function deleteShotAction(formData: FormData) {
  const parsed = deleteShotSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    id: formData.get("id"),
  });
  if (!parsed.success) {
    console.error("[deleteShotAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await deleteShot(supabase as never, { id });
  } catch (err) {
    console.error("[deleteShotAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 9. selectFrameAction — make a frame the selected frame for its shot
// ---------------------------------------------------------------------------

const selectFrameSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  shotId: z.string().uuid(),
  frameId: z.string().uuid(),
});

export async function selectFrameAction(formData: FormData) {
  const parsed = selectFrameSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    shotId: formData.get("shotId"),
    frameId: formData.get("frameId"),
  });
  if (!parsed.success) {
    console.error("[selectFrameAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shotId, frameId } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await selectFrame(supabase as never, { shotId, frameId });
  } catch (err) {
    console.error("[selectFrameAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 10. setFrameStatusAction — update a frame's status
// ---------------------------------------------------------------------------

const setFrameStatusSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  id: z.string().uuid(),
  status: z.enum(["suggested", "selected", "rejected"]),
});

export async function setFrameStatusAction(formData: FormData) {
  const parsed = setFrameStatusSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    console.error("[setFrameStatusAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, status } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await setFrameStatus(supabase as never, { id, status });
  } catch (err) {
    console.error("[setFrameStatusAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 11. deleteShotFrameAction — delete a frame
// ---------------------------------------------------------------------------

const deleteShotFrameSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function deleteShotFrameAction(formData: FormData) {
  const parsed = deleteShotFrameSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    id: formData.get("id"),
  });
  if (!parsed.success) {
    console.error("[deleteShotFrameAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await deleteShotFrame(supabase as never, { id });
  } catch (err) {
    console.error("[deleteShotFrameAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 12. uploadFrameAction — upload a user-provided image as a shot frame
// ---------------------------------------------------------------------------

const uploadFrameSchema = z.object({
  projectId: z.string().uuid(),
  shotId: z.string().uuid(),
});

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadFrameAction(formData: FormData) {
  const parsed = uploadFrameSchema.safeParse({
    projectId: formData.get("projectId"),
    shotId: formData.get("shotId"),
  });
  if (!parsed.success) {
    console.error("[uploadFrameAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shotId } = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    console.error("[uploadFrameAction] missing or invalid file field");
    return;
  }
  if (!file.type.startsWith("image/")) {
    console.error("[uploadFrameAction] file is not an image:", file.type);
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    console.error("[uploadFrameAction] file exceeds size limit:", file.size);
    return;
  }
  // Derive extension from MIME type (image/png → png, image/jpeg → jpg, etc.)
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] ?? "bin";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const imagePath = await uploadStoryboardImage(bytes, {
      path: `${projectId}/shots/${shotId}/${crypto.randomUUID()}.${ext}`,
      contentType: file.type,
    });
    await createShotFrame(supabase as never, {
      projectId,
      shotId,
      imagePath,
      source: "upload",
    });
  } catch (err) {
    console.error("[uploadFrameAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 13. updateVisualSettingsAction — patch style preset / prompt / aspect ratio
// ---------------------------------------------------------------------------

const updateVisualSettingsSchema = z.object({
  projectId: z.string().uuid(),
  stylePreset: z.string().trim().optional(),
  customStylePrompt: z.string().trim().optional(),
  aspectRatio: z.string().trim().optional(),
});

export async function updateVisualSettingsAction(formData: FormData) {
  const parsed = updateVisualSettingsSchema.safeParse({
    projectId: formData.get("projectId"),
    stylePreset: formData.get("stylePreset") || undefined,
    customStylePrompt: formData.get("customStylePrompt") || undefined,
    aspectRatio: formData.get("aspectRatio") || undefined,
  });
  if (!parsed.success) {
    console.error("[updateVisualSettingsAction]", parsed.error.flatten());
    return;
  }
  const { projectId, stylePreset, customStylePrompt, aspectRatio } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await updateVisualSettings(supabase as never, {
      projectId,
      stylePreset,
      customStylePrompt,
      aspectRatio,
    });
  } catch (err) {
    console.error("[updateVisualSettingsAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 14. generateReferenceAction — enqueue a reference-image generation job
// ---------------------------------------------------------------------------

const generateReferenceSchema = z.object({
  projectId: z.string().uuid(),
  subjectType: z.enum(["character", "location"]),
  subjectId: z.string().uuid(),
  subjectName: z.string().trim().optional(),
});

export async function generateReferenceAction(formData: FormData) {
  const parsed = generateReferenceSchema.safeParse({
    projectId: formData.get("projectId"),
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    subjectName: formData.get("subjectName") || undefined,
  });
  if (!parsed.success) {
    console.error("[generateReferenceAction]", parsed.error.flatten());
    return;
  }
  const { projectId, subjectType, subjectId, subjectName } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Ownership gate: confirm the subject belongs to projectId using the
    // user's RLS-scoped client before passing subjectId to the service-role
    // referenceWorkflow (which bypasses RLS with-checks).
    if (subjectType === "character") {
      const chars = await listCharacters(supabase as never, projectId);
      if (!chars.some((c) => c.id === subjectId)) {
        console.error(
          "[generateReferenceAction] character not found in project — aborting",
          { projectId, subjectId },
        );
        return;
      }
    } else {
      const locs = await listLocations(supabase as never, projectId);
      if (!locs.some((l) => l.id === subjectId)) {
        console.error(
          "[generateReferenceAction] location not found in project — aborting",
          { projectId, subjectId },
        );
        return;
      }
    }

    const jobRow = await createJob(supabase as never, {
      projectId,
      type: "storyboard_reference",
      params: { subjectType, subjectId, subjectName: subjectName ?? null },
      total: 2, // referenceWorkflow defaults to n=2
      createdBy: user.id,
    });
    const run = await start(referenceWorkflow, [
      { jobId: jobRow.id, projectId, subjectType, subjectId, subjectName: subjectName ?? null },
    ]);
    await setJobStatus(supabase as never, {
      id: jobRow.id,
      status: "running",
      workflowRunId: run.runId,
    });
  } catch (err) {
    console.error("[generateReferenceAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 15. lockReferenceAction — lock a visual reference as the primary for its subject
// ---------------------------------------------------------------------------

const lockReferenceSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function lockReferenceAction(formData: FormData) {
  const parsed = lockReferenceSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
  });
  if (!parsed.success) {
    console.error("[lockReferenceAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await lockReference(supabase as never, { id });
  } catch (err) {
    console.error("[lockReferenceAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 16. setReferenceStatusAction — update a visual reference's status
// ---------------------------------------------------------------------------

const setReferenceStatusSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  status: z.enum(["suggested", "locked", "rejected"]),
});

export async function setReferenceStatusAction(formData: FormData) {
  const parsed = setReferenceStatusSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    console.error("[setReferenceStatusAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, status } = parsed.data;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await setReferenceStatus(supabase as never, { id, status });
  } catch (err) {
    console.error("[setReferenceStatusAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}

// ---------------------------------------------------------------------------
// 17. cancelStoryboardJobAction — cooperative cancel + best-effort WDK cancel
// ---------------------------------------------------------------------------

const cancelStoryboardJobSchema = z.object({
  projectId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export async function cancelStoryboardJobAction(formData: FormData) {
  const parsed = cancelStoryboardJobSchema.safeParse({
    projectId: formData.get("projectId"),
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) {
    console.error("[cancelStoryboardJobAction]", parsed.error.flatten());
    return;
  }
  const { projectId, jobId } = parsed.data;
  try {
    const supabase = await createClient();
    const j = await getJob(supabase as never, jobId); // RLS: only if user owns it
    await setJobStatus(supabase as never, { id: jobId, status: "cancelled" }); // cooperative cancel flag
    if (j?.workflow_run_id) {
      try {
        await getRun(j.workflow_run_id).cancel(); // best-effort native WDK cancel
      } catch {
        // best-effort — cooperative flag is the reliable path
      }
    }
  } catch (err) {
    console.error("[cancelStoryboardJobAction]", err);
    return;
  }
  revalidateStoryboard(projectId);
}
