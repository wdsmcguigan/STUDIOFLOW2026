import { describe, it, expect } from "vitest";
import { buildPanelPrompt, selectConditioningRefs } from "@/lib/storyboard/ai/prompt";
import type { RefImage } from "@/lib/storyboard/schema";

describe("buildPanelPrompt", () => {
  const baseMeta = {
    sceneMeta: {
      intExt: "INT",
      timeOfDay: "NIGHT",
      locationName: "Police Station",
      synopsis: "Detective reviews evidence.",
    },
    shot: {
      size: "MCU",
      angle: "low",
      movement: "static",
      lens: "35mm",
      action: "Detective slams the folder on the desk.",
    },
    style: {
      stylePreset: "storyboard_sketch" as const,
      customStylePrompt: null,
      aspectRatio: "16:9",
    },
  };

  it("contains the literal 'comic book panel' (Google template)", () => {
    const p = buildPanelPrompt(baseMeta);
    expect(p).toContain("comic book panel");
  });

  it("contains the scene intExt, timeOfDay, and location name", () => {
    const p = buildPanelPrompt(baseMeta);
    expect(p).toContain("INT");
    expect(p).toContain("NIGHT");
    expect(p).toContain("Police Station");
  });

  it("contains the shot action text", () => {
    const p = buildPanelPrompt(baseMeta);
    expect(p).toContain("Detective slams the folder on the desk.");
  });

  it("contains the aspect ratio", () => {
    const p = buildPanelPrompt(baseMeta);
    expect(p).toContain("16:9");
  });

  it("uses customStylePrompt when provided, overriding preset", () => {
    const p = buildPanelPrompt({
      ...baseMeta,
      style: {
        ...baseMeta.style,
        customStylePrompt: "watercolor wash, impressionistic",
      },
    });
    expect(p).toContain("watercolor wash, impressionistic");
    expect(p).not.toContain("rough black-and-white storyboard sketch");
  });

  it("uses the resolved style fragment for known preset", () => {
    const p = buildPanelPrompt({
      ...baseMeta,
      style: {
        ...baseMeta.style,
        stylePreset: "graphic_novel_ink",
        customStylePrompt: null,
      },
    });
    expect(p).toContain("inked graphic-novel panel");
  });

  it("falls back to synopsis when shot.action is null", () => {
    const p = buildPanelPrompt({
      ...baseMeta,
      shot: { ...baseMeta.shot, action: null },
    });
    expect(p).toContain("Detective reviews evidence.");
  });

  it("includes camera framing details in the output", () => {
    const p = buildPanelPrompt(baseMeta);
    expect(p).toContain("MCU");
    expect(p).toContain("low");
    expect(p).toContain("35mm");
  });
});

describe("selectConditioningRefs", () => {
  const makeRef = (label: string): RefImage => ({
    signedUrl: `https://example.com/${label}.jpg`,
    mediaType: "image/jpeg",
    label,
  });

  const locationRef = makeRef("location-plate");
  const characterRefs = Array.from({ length: 8 }, (_, i) => makeRef(`char-${i}`));

  it("returns location plate FIRST, then character refs", () => {
    const refs = selectConditioningRefs({ characterRefs, locationRef });
    expect(refs[0]).toBe(locationRef);
  });

  it("caps at 6 by default: 1 location + 5 characters from 8 character refs", () => {
    const refs = selectConditioningRefs({ characterRefs, locationRef });
    expect(refs).toHaveLength(6);
    expect(refs[0]).toBe(locationRef);
    expect(refs[1]).toBe(characterRefs[0]);
    expect(refs[5]).toBe(characterRefs[4]);
  });

  it("respects a custom cap", () => {
    const refs = selectConditioningRefs({ characterRefs, locationRef }, 3);
    expect(refs).toHaveLength(3);
    expect(refs[0]).toBe(locationRef);
  });

  it("excludes a null locationRef", () => {
    const refs = selectConditioningRefs({ characterRefs, locationRef: null });
    expect(refs).toHaveLength(6);
    expect(refs[0]).toBe(characterRefs[0]);
  });

  it("preserves principal (input) order for character refs", () => {
    const refs = selectConditioningRefs({ characterRefs, locationRef: null }, 4);
    expect(refs[0]).toBe(characterRefs[0]);
    expect(refs[1]).toBe(characterRefs[1]);
    expect(refs[2]).toBe(characterRefs[2]);
    expect(refs[3]).toBe(characterRefs[3]);
  });

  it("returns all refs when total is under the cap", () => {
    const few = [makeRef("char-a"), makeRef("char-b")];
    const refs = selectConditioningRefs({ characterRefs: few, locationRef });
    expect(refs).toHaveLength(3);
  });
});
