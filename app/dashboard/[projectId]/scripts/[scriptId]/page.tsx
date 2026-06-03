import { notFound } from "next/navigation";
import { getScript, listScenes, getLatestVersion } from "@/lib/scripts/data";
import { SceneList } from "@/components/scripts/scene-list";

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

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{script.title}</h1>
        <a href={`/dashboard/${projectId}/import`} className="text-sm underline">
          Re-import draft
        </a>
      </div>
      <SceneList projectId={projectId} scriptId={scriptId} scenes={scenes} />
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
