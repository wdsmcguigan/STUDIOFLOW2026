import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { decomposeScene } from "@/lib/storyboard/ai/decompose";
import type { SceneMeta } from "@/lib/storyboard/ai/prompt";

const PAYLOAD = JSON.stringify({
  schemaVersion: 1,
  shots: [
    { size: "WS", angle: "eye", movement: "static", lens: null, action: "Establishing: Mary enters" },
    { size: "CU", angle: "low", movement: "push_in", lens: null, action: "Mary draws a revolver" },
  ],
});

const MOCK_RESULT: LanguageModelV3GenerateResult = {
  finishReason: { unified: "stop", raw: "stop" },
  usage: {
    inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 10, text: 10, reasoning: undefined },
  },
  content: [{ type: "text", text: PAYLOAD }],
  warnings: [],
};

function mock() {
  return new MockLanguageModelV3({
    doGenerate: async () => MOCK_RESULT,
  });
}

const sceneMeta: SceneMeta = {
  intExt: "INT",
  timeOfDay: "NIGHT",
  locationName: "SALOON",
  synopsis: "Mary enters and draws a revolver.",
};

describe("decomposeScene", () => {
  it("returns validated, versioned shot list from the model", async () => {
    const out = await decomposeScene({
      model: mock(),
      sceneMeta,
      sceneText: "Mary enters the saloon. She draws a revolver.",
    });
    expect(out.schemaVersion).toBe(1);
    expect(out.shots).toHaveLength(2);
    expect(out.shots[0]).toMatchObject({ size: "WS", angle: "eye", movement: "static" });
    expect(out.shots[1]).toMatchObject({ size: "CU", angle: "low", movement: "push_in" });
  });
});
