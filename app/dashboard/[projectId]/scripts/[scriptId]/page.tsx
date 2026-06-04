import { notFound } from "next/navigation";
import { getScript, listScenes, getLatestVersion } from "@/lib/scripts/data";
import { SceneList } from "@/components/scripts/scene-list";
import { ImportForm } from "@/components/scripts/import-form";
import { stageReimportAction } from "@/app/dashboard/[projectId]/import/actions";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ projectId: string; scriptId: string }>;
}) {
  const { projectId, scriptId } = await params;
  const script = await getScript(scriptId);
  if (!script) notFound();
  const [scenes, version] = await Promise.all([
    listScenes(scriptId),
    getLatestVersion(scriptId),
  ]);

  const stageReimport = stageReimportAction.bind(null, { projectId, scriptId });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.3px]">
          {script.title}
        </h1>
        <p className="font-data mt-0.5 text-[11px] text-[var(--tx-3)]">
          {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
        </p>
      </div>

      {/* Stripboard scene list */}
      <SceneList projectId={projectId} scriptId={scriptId} scenes={scenes} />

      {/* Re-import disclosure */}
      <details className="group rounded-lg border border-[var(--line)] bg-[var(--s1)]">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--tx-2)] hover:text-[var(--tx)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
          Re-import a revised draft
        </summary>
        <div className="border-t border-[var(--line)] px-4 pb-4 pt-3">
          <ImportForm action={stageReimport} />
        </div>
      </details>

      {/* Raw source read view */}
      {version ? (
        <details className="group rounded-lg border border-[var(--line)] bg-[var(--s1)]">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm text-[var(--tx-3)] hover:text-[var(--tx-2)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
            Read view (raw source)
          </summary>
          <div className="border-t border-[var(--line)] px-4 pb-4 pt-3">
            <pre className="font-data overflow-x-auto text-[12px] leading-relaxed whitespace-pre-wrap text-[var(--tx-2)]">
              {version.raw_source}
            </pre>
          </div>
        </details>
      ) : null}
    </main>
  );
}
