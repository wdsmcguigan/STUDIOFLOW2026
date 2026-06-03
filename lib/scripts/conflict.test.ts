import { describe, it, expect } from "vitest";
import { markConflicts } from "@/lib/scripts/conflict";
import type { SceneDiff } from "@/lib/scripts/schema";

const baseParsed = {
  sceneNumber: "1", intExt: "INT", locationSlug: "DINER", timeOfDay: "DAY",
  bodyText: "x", synopsis: "", pageEighths: 8, textAnchorStart: 0, textAnchorEnd: 1, ordinal: 0,
};

describe("markConflicts", () => {
  it("upgrades a modified scene to conflict when it was also edited in-app", () => {
    const diff: SceneDiff[] = [
      { classification: "modified", sceneId: "id-a", confidence: 1, parsedOrdinal: 0, parsed: baseParsed },
    ];
    const out = markConflicts(diff, new Set(["id-a"]));
    expect(out[0].classification).toBe("conflict");
  });

  it("leaves a modified scene alone when it was not edited in-app", () => {
    const diff: SceneDiff[] = [
      { classification: "modified", sceneId: "id-a", confidence: 1, parsedOrdinal: 0, parsed: baseParsed },
    ];
    const out = markConflicts(diff, new Set(["id-other"]));
    expect(out[0].classification).toBe("modified");
  });

  it("does not turn an unchanged scene into a conflict", () => {
    const diff: SceneDiff[] = [
      { classification: "unchanged", sceneId: "id-a", confidence: 1, parsedOrdinal: 0, parsed: baseParsed },
    ];
    const out = markConflicts(diff, new Set(["id-a"]));
    expect(out[0].classification).toBe("unchanged");
  });
});
