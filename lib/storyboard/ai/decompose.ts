import { generateObject, type LanguageModel } from "ai";
import {
  shotListOutput,
  type ShotListOutput,
  SHOT_SIZES,
  SHOT_ANGLES,
  SHOT_MOVEMENTS,
} from "@/lib/storyboard/schema";
import type { SceneMeta } from "@/lib/storyboard/ai/prompt";

function buildDecomposePrompt(args: {
  sceneMeta: SceneMeta;
  sceneText: string;
}): string {
  const { sceneMeta, sceneText } = args;

  const settingParts = [
    sceneMeta.intExt,
    sceneMeta.locationName,
    sceneMeta.timeOfDay,
  ].filter(Boolean);
  const setting = settingParts.length > 0 ? settingParts.join(" / ") : "unspecified";

  return [
    "You are a cinematographer's storyboard assistant. Propose a shot list of 3–12 coverage shots for ONE scene.",
    "",
    "For EACH shot, output exactly these fields:",
    `- size: one of ${SHOT_SIZES.join(", ")}`,
    `- angle: one of ${SHOT_ANGLES.join(", ")}`,
    `- movement: one of ${SHOT_MOVEMENTS.join(", ")}`,
    "- lens: optional focal length or lens note (string or null)",
    "- action: free-text description of what happens in this shot (required, non-empty)",
    "",
    "Rules:",
    "- Use ONLY the allowed enum values for size, angle, and movement. No other values are valid.",
    "- Choose shots that together cover the scene dramatically and cinematically.",
    "- Vary framing (don't use the same size for every shot).",
    "- 3 shots minimum, 12 shots maximum.",
    "",
    `SCENE SETTING: ${setting}`,
    sceneMeta.synopsis ? `SYNOPSIS: ${sceneMeta.synopsis}` : "",
    "",
    "SCENE TEXT:",
    sceneText,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/** Pure, model-injected decomposition of ONE scene into a shot list. Tests inject a mock model. */
export async function decomposeScene(args: {
  model: LanguageModel;
  sceneMeta: SceneMeta;
  sceneText: string;
}): Promise<ShotListOutput> {
  const prompt = buildDecomposePrompt({ sceneMeta: args.sceneMeta, sceneText: args.sceneText });
  const { object } = await generateObject({
    model: args.model,
    schema: shotListOutput,
    prompt,
  });
  return object;
}
