"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createScript, applyFirstImport, seedRevisions, stageReimport, applyReconciledImport, getScript } from "@/lib/scripts/data";
import { parseFountain } from "@/lib/scripts/fountain";
import { stageReimportInput, confirmReimportInput } from "@/lib/scripts/schema";

export async function importScriptAction(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source") ?? "");
  if (!title || !source.trim()) return;

  let scriptId: string;
  try {
    const supabase = await createClient();
    await seedRevisions(supabase as unknown as never, projectId);
    const script = await createScript({ projectId, title });
    scriptId = script.id;
    const parsed = parseFountain(source);
    await applyFirstImport({
      projectId,
      scriptId,
      label: "v1",
      rawSource: source,
      parsed,
    });
  } catch (err) {
    // TODO (UX phase): surface a structured error via useActionState
    console.error("[importScriptAction]", err);
    return;
  }
  redirect(`/dashboard/${projectId}/scripts/${scriptId}`);
}

/** Re-import step 1: stage the version + compute the diff (no scene mutation),
 *  then send the user to the gated review screen. */
export async function stageReimportAction(
  ctx: { projectId: string; scriptId: string },
  formData: FormData,
) {
  const parsedInput = stageReimportInput.safeParse({ source: String(formData.get("source") ?? "") });
  if (!parsedInput.success) return;
  const source = parsedInput.data.source;
  let versionId: string;
  try {
    const script = await getScript(ctx.scriptId);
    if (!script) return;
    const supabase = await createClient();
    const parsed = parseFountain(source);
    const staged = await stageReimport(supabase as unknown as never, {
      projectId: ctx.projectId,
      scriptId: ctx.scriptId,
      rawSource: source,
      parsed,
    });
    versionId = staged.versionId;
  } catch (err) {
    console.error("[stageReimportAction]", err);
    return;
  }
  // Gate: nothing was applied to scenes yet. Go review the staged diff.
  redirect(
    `/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}/reimport?versionId=${versionId}`,
  );
}

/** Re-import step 2: the DiffReview confirm. Apply the staged version
 *  (Final-Draft-wins default; conflicts retained in history), then redirect. */
export async function confirmReimportAction(
  ctx: { projectId: string; scriptId: string },
  formData: FormData,
) {
  const parsedInput = confirmReimportInput.safeParse({ scriptVersionId: String(formData.get("scriptVersionId") ?? "") });
  if (!parsedInput.success) return;
  const scriptVersionId = parsedInput.data.scriptVersionId;
  try {
    await applyReconciledImport({
      projectId: ctx.projectId,
      scriptId: ctx.scriptId,
      scriptVersionId,
    });
  } catch (err) {
    console.error("[confirmReimportAction]", err);
    return;
  }
  redirect(`/dashboard/${ctx.projectId}/scripts/${ctx.scriptId}`);
}
