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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{script.title}</h1>
      </div>
      <SceneList projectId={projectId} scriptId={scriptId} scenes={scenes} />
      <details>
        <summary className="cursor-pointer text-sm underline">Re-import a revised draft</summary>
        <div className="mt-3">
          <ImportForm action={stageReimport} />
        </div>
      </details>
      {version ? (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Read view (raw source)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">{version.raw_source}</pre>
        </details>
      ) : null}
    </main>
  );
}
