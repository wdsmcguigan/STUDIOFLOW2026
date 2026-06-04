import { generateObject, type LanguageModel } from "ai";
import { aiBreakdownOutput, type AiBreakdownOutput } from "@/lib/breakdown/schema";
import { buildBreakdownPrompt, type BreakdownCatalog } from "@/lib/breakdown/ai/prompt";

/** Pure, model-injected breakdown of ONE scene. Tests inject a mock model. */
export async function runBreakdown(args: {
  model: LanguageModel;
  sceneText: string;
  catalog: BreakdownCatalog;
}): Promise<AiBreakdownOutput> {
  const prompt = buildBreakdownPrompt({ sceneText: args.sceneText, catalog: args.catalog });
  const { object } = await generateObject({
    model: args.model,
    schema: aiBreakdownOutput,
    // Gemini native structured outputs reject z.union; our items use a discriminated union.
    providerOptions: { google: { structuredOutputs: false } },
    prompt,
  });
  return object;
}
