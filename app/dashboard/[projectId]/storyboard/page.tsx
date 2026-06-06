import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listJobs, listCharacters } from "@/lib/breakdown/data";
import { listLocations } from "@/lib/schedule/data";
import {
  listProjectScenes,
  getSceneBoard,
  getVisualSettings,
  listVisualReferences,
  getGenerationTotals,
} from "@/lib/storyboard/data";
import type { ProjectVisualSettings } from "@/lib/storyboard/schema";
import { ScenePicker } from "@/components/storyboard/scene-picker";
import { BoardGrid } from "@/components/storyboard/board-grid";
import { ReferencesPanel } from "@/components/storyboard/references-panel";
import { StyleSettings } from "@/components/storyboard/style-settings";
import { BoardToolbar } from "@/components/storyboard/board-toolbar";
import { StoryboardJobPanel } from "@/components/storyboard/storyboard-job-panel";
import { JobQueuePoller } from "@/components/breakdown/job-queue-poller";

/** Resolve the configured render model id for the cost estimate (config-driven). */
function resolveRenderModelId(): string {
  return process.env.STORYBOARD_IMAGE_MODEL ?? "gemini-2.5-flash-image";
}

/**
 * Storyboard board page — project-scoped visual development.
 *
 * Flow: pick a scene → "Board scene" (synchronous decompose → shots appear on
 * revalidate) → confirm-on-batch → "Render panels" (async image job). The
 * references + style panels feed the render engine's reference-consistency.
 *
 * Scene selection is via the `?sceneId=` query param (mirrors how breakdown and
 * the rest of the app drive sub-state without a sub-route per scene). All data
 * is fetched server-side; client components handle interactivity.
 */
export default async function StoryboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ sceneId?: string }>;
}) {
  const { projectId } = await params;
  const { sceneId } = await searchParams;
  const supabase = await createClient();

  // Project-scoped reads needed regardless of scene selection.
  // getVisualSettings is a pure read — safe under RLS for unauthenticated/non-owner
  // requests (returns null rather than throwing). The settings row is created lazily
  // the first time the owner saves style settings (via updateVisualSettingsAction).
  const DEFAULT_VISUAL_SETTINGS: ProjectVisualSettings = {
    id: "",
    project_id: projectId,
    style_preset: "storyboard_sketch",
    aspect_ratio: "16:9",
    custom_style_prompt: null,
    created_at: "",
    updated_at: "",
  };

  const [scenes, settingsOrNull, references, totals, characters, locations, jobs] =
    await Promise.all([
      listProjectScenes(supabase as never, projectId),
      getVisualSettings(supabase as never, projectId),
      listVisualReferences(supabase as never, projectId),
      getGenerationTotals(supabase as never, projectId),
      listCharacters(supabase as never, projectId),
      listLocations(supabase as never, projectId),
      listJobs(supabase as never, projectId),
    ]);
  const settings = settingsOrNull ?? DEFAULT_VISUAL_SETTINGS;

  // Sign image URLs for all visible (non-rejected) references with an image_path.
  // Signed in parallel for all refs so the panel can render thumbnails without
  // a client-side fetch. TTL=3600 (1 h) matches the board frame signing above.
  const refsWithImage = references.filter(
    (r) => r.status !== "rejected" && r.image_path,
  );
  const signedUrlEntries = await Promise.all(
    refsWithImage.map(async (r) => {
      const { data } = await supabase.storage
        .from("storyboards")
        .createSignedUrl(r.image_path!, 3600);
      return [r.id, data?.signedUrl ?? ""] as [string, string];
    }),
  );
  const refSignedUrls: Record<string, string> = Object.fromEntries(
    signedUrlEntries.filter(([, url]) => url !== ""),
  );

  // Resolve the selected scene (explicit param wins; otherwise none selected).
  const selectedScene = sceneId
    ? scenes.find((s) => s.id === sceneId) ?? null
    : null;

  // Board is only loaded when a valid scene is selected.
  const board = selectedScene
    ? await getSceneBoard(supabase as never, selectedScene.id)
    : null;

  const renderModelId = resolveRenderModelId();
  // Panels needing a render = shots without a selected frame.
  const pendingPanels = board
    ? board.shots.filter((s) => s.selectedUrl === null).length
    : 0;

  // Only storyboard jobs are relevant on this page.
  const storyboardJobs = jobs.filter(
    (j) => j.type === "storyboard_render" || j.type === "storyboard_reference",
  );
  const hasActiveJobs = storyboardJobs.some(
    (j) => j.status === "queued" || j.status === "running",
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="font-display text-xl font-extrabold tracking-[-0.3px] text-[var(--tx)]">
          Storyboard
        </h1>
        <p className="text-sm text-[var(--tx-3)]">
          Decompose a scene into shots, then generate reference-consistent
          panels with AI.
        </p>
      </header>

      {scenes.length === 0 ? (
        <p className="text-sm text-[var(--tx-2)]">
          No scenes in this project yet —{" "}
          <Link
            href={`/dashboard/${projectId}/import`}
            className="underline underline-offset-2 hover:text-[var(--brand)]"
          >
            import a script
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main column: picker → toolbar → board */}
          <div className="space-y-5">
            <ScenePicker
              projectId={projectId}
              scenes={scenes}
              selectedSceneId={selectedScene?.id ?? null}
            />

            {selectedScene ? (
              <>
                <BoardToolbar
                  projectId={projectId}
                  sceneId={selectedScene.id}
                  sceneLabel={
                    selectedScene.sceneNumber
                      ? `Scene ${selectedScene.sceneNumber}`
                      : selectedScene.locationSlug ?? "Scene"
                  }
                  hasShots={(board?.shots.length ?? 0) > 0}
                  pendingPanels={pendingPanels}
                  renderModelId={renderModelId}
                  totals={totals}
                />

                {storyboardJobs.length > 0 && (
                  <section aria-label="Generation jobs">
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
                      Generation jobs
                    </h2>
                    <StoryboardJobPanel
                      projectId={projectId}
                      jobs={storyboardJobs}
                    />
                  </section>
                )}

                {board && board.shots.length > 0 ? (
                  <BoardGrid
                    projectId={projectId}
                    sceneId={selectedScene.id}
                    shots={board.shots}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--line-2)] bg-[var(--s2)] p-8 text-center">
                    <p className="text-sm text-[var(--tx-2)]">
                      No shots yet for this scene.
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--tx-3)]">
                      Click <span className="font-medium">Board scene</span>{" "}
                      above to decompose it into a shot list.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--line-2)] bg-[var(--s2)] p-8 text-center">
                <p className="text-sm text-[var(--tx-2)]">
                  Select a scene to begin storyboarding.
                </p>
              </div>
            )}
          </div>

          {/* Side column: style + references */}
          <aside className="space-y-5">
            <StyleSettings projectId={projectId} settings={settings} />
            <ReferencesPanel
              projectId={projectId}
              characters={characters}
              locations={locations}
              references={references}
              signedUrls={refSignedUrls}
            />
          </aside>
        </div>
      )}

      {/* Polling: refreshes while any storyboard job is active */}
      <JobQueuePoller hasActiveJobs={hasActiveJobs} />
    </main>
  );
}
