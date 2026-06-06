import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/** Text model for scene→shot-list decomposition. Swap here. */
export function getDecomposeModel(): LanguageModel {
  return google("gemini-2.5-flash");
}

/** Image model (multimodal LLM). Config-driven; see research companion (newer Nano Banana variants exist). */
export function getImageModel(): LanguageModel {
  return google(process.env.STORYBOARD_IMAGE_MODEL ?? "gemini-2.5-flash-image");
}
