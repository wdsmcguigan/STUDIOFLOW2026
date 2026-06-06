"use client";

import { useRouter } from "next/navigation";
import type { SceneListItem } from "@/lib/storyboard/data";

interface ScenePickerProps {
  projectId: string;
  scenes: SceneListItem[];
  selectedSceneId: string | null;
}

/** Build a human-readable scene label from its header fields. */
function sceneLabel(s: SceneListItem): string {
  const num = s.sceneNumber ? `${s.sceneNumber}. ` : "";
  const head = [s.intExt, s.locationSlug, s.timeOfDay].filter(Boolean).join(" ");
  return `${num}${head || "(untitled scene)"}`;
}

/**
 * Scene picker — drives the selected scene via the `?sceneId=` query param
 * (mirrors how the app drives sub-state without a route-per-scene). Changing
 * the select navigates, which re-runs the server page with the new scene.
 */
export function ScenePicker({
  projectId,
  scenes,
  selectedSceneId,
}: ScenePickerProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) {
      router.push(`/dashboard/${projectId}/storyboard`);
    } else {
      router.push(`/dashboard/${projectId}/storyboard?sceneId=${id}`);
    }
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor="storyboard-scene-picker"
        className="text-[11px] font-medium text-[var(--tx-3)]"
      >
        Scene
      </label>
      <select
        id="storyboard-scene-picker"
        value={selectedSceneId ?? ""}
        onChange={handleChange}
        className="h-9 w-full max-w-md rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label="Select a scene to storyboard"
      >
        <option value="">— Select a scene —</option>
        {scenes.map((s) => (
          <option key={s.id} value={s.id}>
            {sceneLabel(s)}
          </option>
        ))}
      </select>
    </div>
  );
}
