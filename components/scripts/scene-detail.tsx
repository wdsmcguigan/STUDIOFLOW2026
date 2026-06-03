import type { Scene } from "@/lib/scripts/schema";

export function SceneDetail({ scene, body }: { scene: Scene; body: string }) {
  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">
          {scene.scene_number ?? scene.ordinal + 1}. {scene.int_ext} {scene.location_slug} —{" "}
          {scene.time_of_day}
        </h1>
        <p className="text-sm text-muted-foreground">
          {scene.page_eighths}/8 page{scene.script_day ? ` · ${scene.script_day}` : ""} ·{" "}
          {scene.status}
        </p>
        {scene.synopsis ? <p className="mt-1 text-sm">{scene.synopsis}</p> : null}
      </header>
      <pre className="whitespace-pre-wrap font-mono text-sm">{body}</pre>
    </article>
  );
}
