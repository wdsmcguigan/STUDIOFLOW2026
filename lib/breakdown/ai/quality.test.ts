import { describe, it, expect } from "vitest";
import { scoreBreakdown } from "@/lib/breakdown/ai/quality";
import { runBreakdown } from "@/lib/breakdown/ai/engine";
import { getBreakdownModel } from "@/lib/breakdown/ai/model";
import {
  REFERENCE_SCENE_TEXT,
  REFERENCE_EXPECTED,
} from "@/lib/breakdown/__fixtures__/reference-scene";

// ---------------------------------------------------------------------------
// Pure scorer unit tests — always run, no API key required
// ---------------------------------------------------------------------------

describe("scoreBreakdown", () => {
  it("computes precision/recall/f1 on (kind,name) overlap", () => {
    const expected = [
      { kind: "element" as const, name: "chrome revolver" },
      { kind: "character" as const, name: "MARY" },
    ];
    const actual = [
      { kind: "element" as const, name: "chrome revolver" },
      { kind: "element" as const, name: "lamp" },
    ];
    const r = scoreBreakdown(expected, actual);
    expect(r.precision).toBeCloseTo(0.5); // 1 of 2 actual correct
    expect(r.recall).toBeCloseTo(0.5); // 1 of 2 expected found
    expect(r.f1).toBeCloseTo(0.5);
    expect(r.truePositives).toBe(1);
    expect(r.expectedCount).toBe(2);
    expect(r.actualCount).toBe(2);
  });

  it("is case/whitespace-insensitive on names and dedupes", () => {
    const r = scoreBreakdown(
      [{ kind: "character" as const, name: "Mary" }],
      [{ kind: "character" as const, name: "  MARY  " }],
    );
    expect(r.precision).toBeCloseTo(1);
    expect(r.recall).toBeCloseTo(1);
    expect(r.f1).toBeCloseTo(1);
  });

  it("handles empty sets without NaN", () => {
    const r = scoreBreakdown([], []);
    expect(r.precision).toBe(0);
    expect(r.recall).toBe(0);
    expect(r.f1).toBe(0);
  });

  it("handles empty expected (zero recall denominator)", () => {
    const r = scoreBreakdown([], [{ kind: "element" as const, name: "lamp" }]);
    expect(r.precision).toBe(0); // 0 tp / 1 actual
    expect(r.recall).toBe(0); // exp.size === 0 → 0
    expect(r.f1).toBe(0);
  });

  it("handles empty actual (zero precision denominator)", () => {
    const r = scoreBreakdown(
      [{ kind: "element" as const, name: "lamp" }],
      [],
    );
    expect(r.precision).toBe(0); // act.size === 0 → 0
    expect(r.recall).toBe(0); // 0 tp / 1 expected
    expect(r.f1).toBe(0);
  });

  it("kind mismatch counts as miss — element vs character with same name", () => {
    const r = scoreBreakdown(
      [{ kind: "element" as const, name: "revolver" }],
      [{ kind: "character" as const, name: "revolver" }],
    );
    expect(r.precision).toBeCloseTo(0);
    expect(r.recall).toBeCloseTo(0);
  });

  it("deduplicates repeated items in expected and actual", () => {
    const r = scoreBreakdown(
      [
        { kind: "element" as const, name: "lamp" },
        { kind: "element" as const, name: "lamp" },
      ],
      [{ kind: "element" as const, name: "lamp" }],
    );
    // After dedup: exp.size=1, act.size=1, tp=1
    expect(r.precision).toBeCloseTo(1);
    expect(r.recall).toBeCloseTo(1);
    expect(r.expectedCount).toBe(1);
    expect(r.actualCount).toBe(1);
  });

  it("perfect score when actual matches expected exactly", () => {
    const items = [
      { kind: "character" as const, name: "MARY" },
      { kind: "element" as const, name: "chrome revolver" },
    ];
    const r = scoreBreakdown(items, items);
    expect(r.precision).toBeCloseTo(1);
    expect(r.recall).toBeCloseTo(1);
    expect(r.f1).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// LIVE measurement — requires a real Gemini key (GOOGLE_GENERATIVE_AI_API_KEY).
// Skipped in CI/without the key.
// This PRINTS precision/recall/f1; it is a measurement, NOT a pass/fail gate.
// ---------------------------------------------------------------------------

describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)(
  "AI breakdown quality (live, measurement only)",
  () => {
    it(
      "measures precision/recall vs the reference scene",
      async () => {
        const out = await runBreakdown({
          model: getBreakdownModel(),
          sceneText: REFERENCE_SCENE_TEXT,
          catalog: {
            categories: ["Props", "Set Dressing", "Wardrobe", "Vehicles"],
            characters: [],
            elements: [],
          },
        });
        const actual = out.items.map((i) => ({ kind: i.kind, name: i.name }));
        const score = scoreBreakdown(REFERENCE_EXPECTED, actual);
        console.log("[AI quality]", JSON.stringify(score, null, 2));
        // Sanity only — not a quality gate
        expect(score.actualCount).toBeGreaterThan(0);
      },
      30_000,
    );
  },
);
