import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/** Production model. Swap the provider/string here to change models. */
export function getBreakdownModel(): LanguageModel {
  return google("gemini-2.5-flash");
}
