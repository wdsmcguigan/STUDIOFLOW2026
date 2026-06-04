import { describe, it, expect } from "vitest";
import { buildBreakdownPrompt } from "@/lib/breakdown/ai/prompt";

describe("buildBreakdownPrompt", () => {
  const catalog = {
    categories: ["Props", "Wardrobe"],
    characters: [{ primaryName: "MARY", aliases: ["MARY ANN"] }],
    elements: [{ name: "chrome revolver", category: "Props" }],
  };

  it("includes the scene text and the existing catalog (F1)", () => {
    const p = buildBreakdownPrompt({ sceneText: "Mary draws a revolver.", catalog });
    expect(p).toContain("Mary draws a revolver.");
    expect(p).toContain("MARY");           // reuse canonical character
    expect(p).toContain("chrome revolver"); // reuse canonical element
    expect(p).toContain("Props");
  });

  it("instructs suggestions-only + quote anchoring", () => {
    const p = buildBreakdownPrompt({ sceneText: "x", catalog });
    expect(p.toLowerCase()).toContain("quote");
  });
});
