/**
 * Durable storyboard workflows (Vercel WDK).
 *
 * Mirrors workflows/breakdown.ts: a `"use workflow"` orchestrator fans over
 * units of work, each a `"use step"` that uses the service-role client, with
 * cooperative cancel (checks jobs.status) + progress + finalize/fail.
 *
 * Steps run in a background (no-request) context → service-role client. Ownership
 * was proven at enqueue (the action created the job + listed shots/subjects under
 * the user's RLS), so writing via service-role here is safe.
 *
 * `crypto.randomUUID()` is used for storage paths — allowed in the background
 * step context (the Date.now()/Math.random() ban applies to pure unit-tested
 * modules, not workflow steps).
 */
import { createServiceClient } from "@/lib/supabase/service";
import {
  updateJobProgress,
  setJobStatus,
  isJobCancelled,
} from "@/lib/breakdown/data";
import {
  loadRenderInputs,
  getShot,
  createShotFrame,
  createVisualReference,
  recordImageGeneration,
  getOrCreateVisualSettings,
} from "@/lib/storyboard/data";
import { getImageEngine } from "@/lib/storyboard/ai/engine";
import {
  buildPanelPrompt,
  selectConditioningRefs,
  type ShotMeta,
} from "@/lib/storyboard/ai/prompt";
import { signStoryboardUrl, uploadStoryboardImage } from "@/lib/storage/storyboards";
import { estimateCost } from "@/lib/storyboard/cost";
import type { RefImage, RenderInputs } from "@/lib/storyboard/schema";

// ---------------------------------------------------------------------------
// renderSceneWorkflow — render one panel per shot in a scene.
// Single-shot regenerate just passes a one-element shotIds array.
// ---------------------------------------------------------------------------

export async function renderSceneWorkflow(input: {
  jobId: string;
  projectId: string;
  sceneId: string;
  shotIds: string[];
}) {
  "use workflow";
  const total = input.shotIds.length;
  let completed = 0;
  try {
    const renderInputs = await loadRenderInputsStep({ sceneId: input.sceneId });
    for (const shotId of input.shotIds) {
      if (await checkCancelled(input.jobId)) return { cancelled: true, completed };
      await renderShotStep({
        projectId: input.projectId,
        sceneId: input.sceneId,
        shotId,
        jobId: input.jobId,
        renderInputs,
      });
      completed += 1;
      await reportProgress({ jobId: input.jobId, completed, total });
    }
    await finalize({ jobId: input.jobId });
    return { cancelled: false, completed };
  } catch (err) {
    await failJob({
      jobId: input.jobId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { cancelled: false, failed: true, completed };
  }
}

async function loadRenderInputsStep(args: { sceneId: string }): Promise<RenderInputs> {
  "use step";
  return loadRenderInputs(createServiceClient() as never, args.sceneId);
}

async function renderShotStep(args: {
  projectId: string;
  sceneId: string;
  shotId: string;
  jobId: string;
  renderInputs: RenderInputs;
}) {
  "use step";
  const supabase = createServiceClient();
  const { renderInputs } = args;

  // Read the shot (size/angle/movement/lens/action) for the prompt.
  const shot = await getShot(supabase as never, args.shotId);
  if (!shot) throw new Error(`shot not found: ${args.shotId}`);

  // Sign the locked ref storage paths → RefImage[] for the engine.
  // Character and location signing run concurrently in one Promise.all.
  const [characterRefs, locationRef] = await Promise.all([
    Promise.all(
      renderInputs.characterRefs.map(async (r) => ({
        label: r.label,
        mediaType: r.mediaType,
        signedUrl: await signStoryboardUrl(r.path),
      })),
    ),
    renderInputs.locationRef
      ? signStoryboardUrl(renderInputs.locationRef.path).then(
          (signedUrl): RefImage => ({
            label: renderInputs.locationRef!.label,
            mediaType: renderInputs.locationRef!.mediaType,
            signedUrl,
          }),
        )
      : Promise.resolve(null as RefImage | null),
  ]);
  const references = selectConditioningRefs({ characterRefs, locationRef });

  const shotMeta: ShotMeta = {
    size: shot.size,
    angle: shot.angle,
    movement: shot.movement,
    lens: shot.lens,
    action: shot.action,
  };
  const prompt = buildPanelPrompt({
    sceneMeta: renderInputs.sceneMeta,
    shot: shotMeta,
    style: renderInputs.style,
  });

  const engine = getImageEngine();
  const { images, meta } = await engine.generate({
    prompt,
    references,
    aspectRatio: renderInputs.style.aspectRatio,
  });
  if (images.length === 0) throw new Error("engine returned no images");

  const model = typeof meta.model === "string" ? meta.model : "gemini-2.5-flash-image";

  // Upload the FIRST returned image and record a frame for the shot.
  const imagePath = await uploadStoryboardImage(images[0], {
    path: `${args.projectId}/shots/${args.shotId}/${crypto.randomUUID()}.png`,
    contentType: "image/png",
  });
  await createShotFrame(supabase as never, {
    projectId: args.projectId,
    shotId: args.shotId,
    imagePath,
    source: "ai",
    promptUsed: prompt,
  });

  // Append to the image_generations ledger (kind='render').
  await recordImageGeneration(supabase as never, {
    projectId: args.projectId,
    jobId: args.jobId,
    kind: "render",
    model,
    imageCount: images.length,
    estCost: estimateCost(model, images.length),
  });

  return { shotId: args.shotId, imagePath };
}

// ---------------------------------------------------------------------------
// referenceWorkflow — generate N reference variants for one character/location.
// ---------------------------------------------------------------------------

export async function referenceWorkflow(input: {
  jobId: string;
  projectId: string;
  subjectType: "character" | "location";
  subjectId: string;
  subjectName?: string | null;
  n?: number;
}) {
  "use workflow";
  const n = input.n ?? 2;
  try {
    await generateReferencesStep({
      jobId: input.jobId,
      projectId: input.projectId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectName: input.subjectName ?? null,
      n,
    });
    await reportProgress({ jobId: input.jobId, completed: n, total: n });
    await finalize({ jobId: input.jobId });
    return { cancelled: false, completed: n };
  } catch (err) {
    await failJob({
      jobId: input.jobId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { cancelled: false, failed: true, completed: 0 };
  }
}

async function generateReferencesStep(args: {
  jobId: string;
  projectId: string;
  subjectType: "character" | "location";
  subjectId: string;
  subjectName: string | null;
  n: number;
}) {
  "use step";
  const supabase = createServiceClient();

  // Build a simple reference prompt from the subject + project style.
  const settings = await getOrCreateVisualSettings(supabase as never, args.projectId);
  const styleFragment =
    settings.custom_style_prompt?.trim() ||
    `${settings.style_preset} style`;
  const subjectLabel = args.subjectName?.trim() || args.subjectType;
  const noun = args.subjectType === "character" ? "character" : "location";
  const prompt = [
    `A clean reference image of the ${noun} "${subjectLabel}".`,
    `Neutral background, full view, consistent for downstream storyboard panels.`,
    `Rendered in a ${styleFragment}.`,
    `Aspect ratio ${settings.aspect_ratio}.`,
  ].join(" ");

  const engine = getImageEngine();

  // One engine call per variant: a multimodal LLM (Gemini generateText) returns a
  // single image per call, so N distinct variants require N calls — not one call
  // with n=N (which yields a single reference). See storyboard research companion.
  let model = "gemini-2.5-flash-image";
  let created = 0;
  for (let i = 0; i < args.n; i++) {
    const { images, meta } = await engine.generate({
      prompt,
      references: [],
      aspectRatio: settings.aspect_ratio,
    });
    if (images.length === 0) throw new Error("engine returned no images");
    if (typeof meta.model === "string") model = meta.model;
    const imagePath = await uploadStoryboardImage(images[0], {
      path: `${args.projectId}/references/${crypto.randomUUID()}.png`,
      contentType: "image/png",
    });
    await createVisualReference(supabase as never, {
      projectId: args.projectId,
      subjectType: args.subjectType,
      characterId: args.subjectType === "character" ? args.subjectId : null,
      locationId: args.subjectType === "location" ? args.subjectId : null,
      imagePath,
      source: "ai",
      status: "suggested",
      promptUsed: prompt,
    });
    created += 1;
  }

  // Append to the image_generations ledger (kind='reference').
  await recordImageGeneration(supabase as never, {
    projectId: args.projectId,
    jobId: args.jobId,
    kind: "reference",
    model,
    imageCount: created,
    estCost: estimateCost(model, created),
  });

  return { count: created };
}

// ---------------------------------------------------------------------------
// Shared job-lifecycle steps (mirror workflows/breakdown.ts).
// ---------------------------------------------------------------------------

async function checkCancelled(jobId: string) {
  "use step";
  return isJobCancelled(createServiceClient() as never, jobId);
}

async function reportProgress(args: {
  jobId: string;
  completed: number;
  total: number;
}) {
  "use step";
  await updateJobProgress(createServiceClient() as never, {
    id: args.jobId,
    completed: args.completed,
    progress: args.total > 0 ? Math.round((args.completed / args.total) * 100) : 100,
  });
}

async function finalize(args: { jobId: string }) {
  "use step";
  await setJobStatus(createServiceClient() as never, {
    id: args.jobId,
    status: "succeeded",
  });
}

async function failJob(args: { jobId: string; message: string }) {
  "use step";
  await setJobStatus(createServiceClient() as never, {
    id: args.jobId,
    status: "failed",
    error: args.message,
  });
}
