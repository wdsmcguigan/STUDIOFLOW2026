"use client";

import { useState } from "react";
import type { ProjectVisualSettings } from "@/lib/storyboard/schema";
import { Button } from "@/components/ui/button";
import { updateVisualSettingsAction } from "@/app/dashboard/[projectId]/storyboard/actions";

interface StyleSettingsProps {
  projectId: string;
  settings: ProjectVisualSettings;
}

const STYLE_PRESETS: { value: string; label: string }[] = [
  { value: "storyboard_sketch", label: "Storyboard sketch" },
  { value: "graphic_novel_ink", label: "Graphic novel ink" },
  { value: "photoreal_cinematic", label: "Photoreal cinematic" },
  { value: "rough_pencil", label: "Rough pencil" },
];

const ASPECT_RATIOS = ["16:9", "2.39:1", "4:3", "1:1"];

/**
 * Style settings — the project-wide visual style preset, aspect ratio, and an
 * optional custom prompt that feeds every panel render. Submits the whole form
 * to updateVisualSettingsAction (partial update on the server).
 */
export function StyleSettings({ projectId, settings }: StyleSettingsProps) {
  const [dirty, setDirty] = useState(false);

  return (
    <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
      <h2 className="text-sm font-semibold text-[var(--tx)]">Visual style</h2>
      <form
        action={updateVisualSettingsAction}
        className="space-y-3"
        onChange={() => setDirty(true)}
        onSubmit={() => setDirty(false)}
      >
        <input type="hidden" name="projectId" value={projectId} />

        <div className="space-y-1">
          <label
            htmlFor="style-preset"
            className="text-[11px] font-medium text-[var(--tx-3)]"
          >
            Style preset
          </label>
          <select
            id="style-preset"
            name="stylePreset"
            defaultValue={settings.style_preset}
            className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {STYLE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="aspect-ratio"
            className="text-[11px] font-medium text-[var(--tx-3)]"
          >
            Aspect ratio
          </label>
          <select
            id="aspect-ratio"
            name="aspectRatio"
            defaultValue={settings.aspect_ratio}
            className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="custom-style-prompt"
            className="text-[11px] font-medium text-[var(--tx-3)]"
          >
            Custom prompt (optional)
          </label>
          <textarea
            id="custom-style-prompt"
            name="customStylePrompt"
            rows={3}
            defaultValue={settings.custom_style_prompt ?? ""}
            placeholder="e.g. moody noir lighting, high contrast"
            className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 py-1.5 text-[12px] text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>

        <Button type="submit" variant="ember" size="sm" disabled={!dirty}>
          Save style
        </Button>
      </form>
    </section>
  );
}
