import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Scene } from "@/lib/scripts/schema";

export function SceneDetail({
  scene,
  body,
  editAction,
}: {
  scene: Scene;
  body: string;
  editAction?: (formData: FormData) => void | Promise<void>;
}) {
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
      {editAction ? (
        <form action={editAction} className="grid max-w-md gap-2">
          <Input name="int_ext" defaultValue={scene.int_ext ?? ""} placeholder="INT/EXT" />
          <Input name="location_slug" defaultValue={scene.location_slug ?? ""} placeholder="Location" />
          <Input name="time_of_day" defaultValue={scene.time_of_day ?? ""} placeholder="Day/Night" />
          <Input name="script_day" defaultValue={scene.script_day ?? ""} placeholder="Script day" />
          <Input name="synopsis" defaultValue={scene.synopsis ?? ""} placeholder="Synopsis" />
          <Button type="submit">Save scene</Button>
        </form>
      ) : null}
    </article>
  );
}
