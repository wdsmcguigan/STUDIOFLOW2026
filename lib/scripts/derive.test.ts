import { describe, it, expect } from "vitest";
import { pageEighthsFromBody, deriveSynopsis } from "@/lib/scripts/derive";

describe("pageEighthsFromBody", () => {
  it("returns at least 1 eighth for any non-empty body", () => {
    expect(pageEighthsFromBody("A short line.")).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 for an empty body", () => {
    expect(pageEighthsFromBody("")).toBe(0);
    expect(pageEighthsFromBody("   \n  ")).toBe(0);
  });

  it("scales roughly with length (8 eighths ~= a full page ~= 55 lines)", () => {
    const oneLine = pageEighthsFromBody("x");
    const manyLines = pageEighthsFromBody(Array.from({ length: 55 }, () => "line").join("\n"));
    expect(manyLines).toBeGreaterThan(oneLine);
    expect(manyLines).toBe(8);
  });

  it("caps a single scene at a sane maximum and never returns a fraction", () => {
    const huge = pageEighthsFromBody(Array.from({ length: 5000 }, () => "line").join("\n"));
    expect(Number.isInteger(huge)).toBe(true);
    expect(huge).toBeGreaterThan(8);
  });
});

describe("deriveSynopsis", () => {
  it("prefers explicit synopsis lines, joined", () => {
    const s = deriveSynopsis({
      synopsisLines: ["They meet.", "It goes badly."],
      actionLines: ["Mary enters."],
    });
    expect(s).toBe("They meet. It goes badly.");
  });

  it("falls back to the first action line when there is no synopsis", () => {
    const s = deriveSynopsis({ synopsisLines: [], actionLines: ["Mary enters the diner.", "She sits."] });
    expect(s).toBe("Mary enters the diner.");
  });

  it("returns an empty string when there is nothing to derive", () => {
    expect(deriveSynopsis({ synopsisLines: [], actionLines: [] })).toBe("");
  });
});
