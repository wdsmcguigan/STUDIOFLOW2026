import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { runBreakdown } from "@/lib/breakdown/ai/engine";

const PAYLOAD = JSON.stringify({
  schemaVersion: 1,
  items: [
    { kind: "element", category: "Props", name: "chrome revolver", description: null, confidence: 0.9, quote: "chrome revolver", prefix: "draws a ", suffix: "." },
    { kind: "character", name: "MARY", presenceType: "speaking", description: null, aliasOf: null, confidence: 0.95, quote: "Mary", prefix: "", suffix: " draws" },
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

describe("runBreakdown", () => {
  it("returns validated, versioned items from the model", async () => {
    const out = await runBreakdown({
      model: mock(),
      sceneText: "Mary draws a chrome revolver.",
      catalog: { categories: ["Props"], characters: [], elements: [] },
    });
    expect(out.schemaVersion).toBe(1);
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toMatchObject({ kind: "element", name: "chrome revolver" });
    expect(out.items[1]).toMatchObject({ kind: "character", presenceType: "speaking" });
  });
});
