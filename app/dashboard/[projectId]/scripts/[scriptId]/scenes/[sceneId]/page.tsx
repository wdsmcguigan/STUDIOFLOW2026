import { notFound } from "next/navigation";
import { getScene, getLatestVersion } from "@/lib/scripts/data";
import { parseFountain } from "@/lib/scripts/fountain";
import { SceneDetail } from "@/components/scripts/scene-detail";

export default async function ScenePage({
  params,
}: {
  params: Promise<{ projectId: string; scriptId: string; sceneId: string }>;
}) {
  const { scriptId, sceneId } = await params;
  const scene = await getScene(sceneId);
  if (!scene) notFound();
  const version = await getLatestVersion(scriptId);
  const body =
    version ? (parseFountain(version.raw_source)[scene.ordinal]?.bodyText ?? "") : "";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <SceneDetail scene={scene} body={body} />
    </main>
  );
}
