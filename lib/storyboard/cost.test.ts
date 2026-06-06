import { describe, it, expect } from "vitest";
import { estimateCost, PRICE_PER_IMAGE, DEFAULT_PRICE } from "@/lib/storyboard/cost";

describe("estimateCost (pure)", () => {
  it("known model: returns n × PRICE_PER_IMAGE[model]", () => {
    const model = "gemini-2.5-flash-image";
    const n = 4;
    expect(estimateCost(model, n)).toBe(n * PRICE_PER_IMAGE[model]);
  });

  it("unknown model: falls back to DEFAULT_PRICE", () => {
    const model = "unknown-model-xyz";
    const n = 3;
    expect(estimateCost(model, n)).toBe(n * DEFAULT_PRICE);
  });

  it("n === 0: returns 0 regardless of model", () => {
    expect(estimateCost("gemini-2.5-flash-image", 0)).toBe(0);
    expect(estimateCost("unknown-model-xyz", 0)).toBe(0);
  });

  it("n === 1: returns exactly one unit price", () => {
    const model = "gemini-2.5-flash-image";
    expect(estimateCost(model, 1)).toBe(PRICE_PER_IMAGE[model]);
  });
});
