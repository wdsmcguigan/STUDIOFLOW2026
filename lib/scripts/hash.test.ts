import { describe, it, expect } from "vitest";
import { contentHash, textAnchors } from "@/lib/scripts/hash";
import type { ParsedScene } from "@/lib/scripts/schema";

const base: ParsedScene = {
  sceneNumber: "1",
  intExt: "INT",
  locationSlug: "DINER",
  timeOfDay: "DAY",
  bodyText: "Mary sits alone.",
  synopsis: "",
  pageEighths: 8,
  textAnchorStart: 0,
  textAnchorEnd: 16,
  ordinal: 0,
};

describe("contentHash", () => {
  it("is stable for identical content", () => {
    expect(contentHash(base)).toBe(contentHash({ ...base }));
  });

  it("ignores the scene number (numbers are mutable; content is what matters)", () => {
    expect(contentHash(base)).toBe(contentHash({ ...base, sceneNumber: "5A" }));
  });

  it("ignores anchors and ordinal (position is not content)", () => {
    expect(contentHash(base)).toBe(
      contentHash({ ...base, ordinal: 99, textAnchorStart: 500, textAnchorEnd: 600 }),
    );
  });

  it("changes when the slugline changes", () => {
    expect(contentHash(base)).not.toBe(contentHash({ ...base, locationSlug: "PARK" }));
  });

  it("changes when the body changes", () => {
    expect(contentHash(base)).not.toBe(contentHash({ ...base, bodyText: "Mary stands." }));
  });
});

describe("textAnchors", () => {
  it("echoes the parsed scene's anchors", () => {
    expect(textAnchors(base)).toEqual({ start: 0, end: 16 });
  });
});
