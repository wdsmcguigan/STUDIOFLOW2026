"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createScript, applyFirstImport, listScripts, seedRevisions } from "@/lib/scripts/data";
import { parseFountain } from "@/lib/scripts/fountain";

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

// Re-export so the import page can list existing scripts without another import.
export { listScripts };
