import { notFound } from "next/navigation";
import { getScene, getLatestVersion } from "@/lib/scripts/data";
import { parseFountain } from "@/lib/scripts/fountain";
import { createClient } from "@/lib/supabase/server";
import {
  listSceneTags,
  listElements,
  listElementCategories,
  listCharacters,
} from "@/lib/breakdown/data";
import { SceneDetail } from "@/components/scripts/scene-detail";
import { SceneBreakdown } from "@/components/breakdown/scene-breakdown";
import { editSceneAction } from "./actions";
import {
  tagSceneElementAction,
  tagSceneCharacterAction,
} from "../../../../breakdown/actions";

export default async function ScenePage({
  params,
}: {
  params: Promise<{ projectId: string; scriptId: string; sceneId: string }>;
}) {
  const { projectId, scriptId, sceneId } = await params;
  const scene = await getScene(sceneId);
  if (!scene) notFound();
  const version = await getLatestVersion(scriptId);
  const body =
    version ? (parseFountain(version.raw_source)[scene.ordinal]?.bodyText ?? "") : "";

  const editAction = editSceneAction.bind(null, { projectId, scriptId, sceneId });

  // Fetch breakdown data in parallel (server-side, RLS-scoped via user session)
  const supabase = await createClient();
  const [tags, elements, categories, characters] = await Promise.all([
    listSceneTags(supabase as never, sceneId),
    listElements(supabase as never, projectId),
    listElementCategories(supabase as never, projectId),
    listCharacters(supabase as never, projectId),
  ]);

  // Bind scriptId into tag actions for cache revalidation of this scene's URL
  const boundTagElement = tagSceneElementAction;
  const boundTagCharacter = tagSceneCharacterAction;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <SceneDetail scene={scene} body={body} editAction={editAction} />

      {/* Divider between script content and breakdown */}
      <hr className="border-[var(--line)]" />

      <SceneBreakdown
        projectId={projectId}
        scriptId={scriptId}
        sceneId={sceneId}
        tags={tags}
        elements={elements}
        categories={categories}
        characters={characters}
        tagSceneElementAction={boundTagElement}
        tagSceneCharacterAction={boundTagCharacter}
      />
    </main>
  );
}
