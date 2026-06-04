import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Scene } from "@/lib/scripts/schema";

/** Formats page-eighths as "1 2/8", "4/8", "1", etc. */
function formatEighths(eighths: number | null): string {
  if (eighths === null || eighths === undefined) return "—";
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole > 0 && rem > 0) return `${whole} ${rem}/8`;
  if (whole > 0) return `${whole}`;
  return `${rem}/8`;
}

export function SceneDetail({
  scene,
  body,
  editAction,
}: {
  scene: Scene;
  body: string;
  editAction?: (formData: FormData) => void | Promise<void>;
}) {
  const sceneNum = scene.scene_number ?? scene.ordinal + 1;

  return (
    <article className="space-y-5">
      {/* Scene header */}
      <header className="space-y-1.5">
        <h1 className="font-display flex items-baseline gap-2 text-xl font-extrabold tracking-[-0.3px]">
          <span className="font-data text-[var(--tx-3)]">{sceneNum}.</span>
          <span>
            {scene.int_ext} {scene.location_slug}
          </span>
          {scene.time_of_day ? (
            <span className="text-base font-semibold text-[var(--tx-2)]">— {scene.time_of_day}</span>
          ) : null}
        </h1>

        {/* Attribute row: page-eighths, script day, status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-data text-[11px] text-[var(--tx-3)]">
            {formatEighths(scene.page_eighths)} pg
          </span>
          {scene.script_day ? (
            <span className="font-data text-[11px] text-[var(--tx-3)]">{scene.script_day}</span>
          ) : null}
          <Badge
            variant={scene.status === "omitted" ? "secondary" : "outline"}
            className="text-[10px]"
          >
            {scene.status}
          </Badge>
        </div>

        {/* Synopsis */}
        {scene.synopsis ? (
          <p className="text-sm text-[var(--tx-2)]">{scene.synopsis}</p>
        ) : null}
      </header>

      {/* Script body — mono block on surface s1 */}
      {body ? (
        <pre
          className="font-data overflow-x-auto rounded-lg bg-[var(--s1)] p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-[var(--tx)]"
          aria-label="Scene body"
        >
          {body}
        </pre>
      ) : null}

      {/* Optional edit form — kept exactly as before with token styling */}
      {editAction ? (
        <form action={editAction} className="grid max-w-md gap-2">
          <Input name="int_ext" defaultValue={scene.int_ext ?? ""} placeholder="INT/EXT" />
          <Input
            name="location_slug"
            defaultValue={scene.location_slug ?? ""}
            placeholder="Location"
          />
          <Input
            name="time_of_day"
            defaultValue={scene.time_of_day ?? ""}
            placeholder="Day/Night"
          />
          <Input
            name="script_day"
            defaultValue={scene.script_day ?? ""}
            placeholder="Script day"
          />
          <Input
            name="synopsis"
            defaultValue={scene.synopsis ?? ""}
            placeholder="Synopsis"
          />
          <Button type="submit" variant="ember">
            Save scene
          </Button>
        </form>
      ) : null}
    </article>
  );
}
