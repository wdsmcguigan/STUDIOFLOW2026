import type { RefImage } from "@/lib/storyboard/schema";

const STYLE_FRAGMENTS: Record<string, string> = {
  storyboard_sketch: "rough black-and-white storyboard sketch, dynamic linework",
  graphic_novel_ink: "inked graphic-novel panel, bold blacks, cross-hatching",
  photoreal_cinematic: "photorealistic cinematic film still, shallow depth of field",
  rough_pencil: "loose pencil storyboard, gestural, grayscale",
};

export interface SceneMeta { intExt: string | null; timeOfDay: string | null; locationName: string | null; synopsis: string | null; }
export interface ShotMeta { size: string | null; angle: string | null; movement: string | null; lens: string | null; action: string | null; }
export interface StyleMeta { stylePreset: string; customStylePrompt: string | null; aspectRatio: string; }

export function buildPanelPrompt(args: { sceneMeta: SceneMeta; shot: ShotMeta; style: StyleMeta }): string {
  const { sceneMeta, shot, style } = args;
  const art = style.customStylePrompt?.trim() || STYLE_FRAGMENTS[style.stylePreset] || STYLE_FRAGMENTS.storyboard_sketch;
  const framing = [shot.size, shot.angle, shot.movement, shot.lens].filter(Boolean).join(", ");
  const setting = [sceneMeta.intExt, sceneMeta.locationName, sceneMeta.timeOfDay].filter(Boolean).join(" — ") || "unspecified setting";
  // Google's verbatim comic-panel template (research companion 2026-06-06-storyboard-research.md).
  return [
    `A single comic book panel in a ${art} style.`,
    `In the foreground, ${shot.action || sceneMeta.synopsis || "the scene's action"}${framing ? ` (${framing})` : ""}.`,
    `In the background, ${setting}.`,
    `Aspect ratio ${style.aspectRatio}.`,
  ].join(" ");
}

export function selectConditioningRefs(
  args: { characterRefs: RefImage[]; locationRef: RefImage | null },
  cap = 6,
): RefImage[] {
  const refs = [...(args.locationRef ? [args.locationRef] : []), ...args.characterRefs];
  return refs.slice(0, cap);
}
