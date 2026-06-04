import { createServiceClient } from "@/lib/supabase/service";
import { runBreakdown } from "@/lib/breakdown/ai/engine";
import { applyBreakdownSuggestions } from "@/lib/breakdown/ai/apply";
import { getBreakdownModel } from "@/lib/breakdown/ai/model";
import {
  listElementCategories,
  listCharacters,
  listElements,
  updateJobProgress,
  setJobStatus,
  isJobCancelled,
} from "@/lib/breakdown/data";

/**
 * Durable orchestrator: break down each scene, update the job row, honor cancel.
 *
 * Runs in a background (no-request) context — it uses the service-role client.
 * Ownership was proven at enqueue (the action created the job + listed scenes under
 * the user's RLS), so writing these validated scenes via service-role is safe.
 */
export async function breakdownWorkflow(input: {
  jobId: string;
  projectId: string;
  scenes: Array<{ id: string; text: string }>;
}) {
  "use workflow";
  const total = input.scenes.length;
  let completed = 0;
  for (const scene of input.scenes) {
    if (await checkCancelled(input.jobId)) return { cancelled: true, completed };
    await breakdownSceneStep({
      projectId: input.projectId,
      sceneId: scene.id,
      sceneText: scene.text,
    });
    completed += 1;
    await reportProgress({ jobId: input.jobId, completed, total });
  }
  await finalize({ jobId: input.jobId });
  return { cancelled: false, completed };
}

async function breakdownSceneStep(args: {
  projectId: string;
  sceneId: string;
  sceneText: string;
}) {
  "use step";
  const supabase = createServiceClient();
  const [categories, characters, elements] = await Promise.all([
    listElementCategories(supabase as never, args.projectId),
    listCharacters(supabase as never, args.projectId),
    listElements(supabase as never, args.projectId),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const catalog = {
    categories: categories.map((c) => c.name),
    characters: characters.map((c) => ({
      primaryName: c.primary_name,
      aliases: c.aliases,
    })),
    elements: elements.map((e) => ({
      name: e.name,
      category: catById.get(e.category_id) ?? "Notes",
    })),
  };
  const output = await runBreakdown({
    model: getBreakdownModel(),
    sceneText: args.sceneText,
    catalog,
  });
  await applyBreakdownSuggestions(supabase as never, {
    projectId: args.projectId,
    sceneId: args.sceneId,
    output,
  });
  return { sceneId: args.sceneId, count: output.items.length };
}

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
    progress: Math.round((args.completed / args.total) * 100),
  });
}

async function finalize(args: { jobId: string }) {
  "use step";
  await setJobStatus(createServiceClient() as never, {
    id: args.jobId,
    status: "succeeded",
  });
}
