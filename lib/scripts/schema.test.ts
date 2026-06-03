import { describe, it, expect } from "vitest";
import {
  createScriptInput,
  intExt,
  sceneStatus,
  scene,
  parsedScene,
  sceneDiffEntry,
} from "@/lib/scripts/schema";

describe("createScriptInput", () => {
  it("accepts a valid title and trims it", () => {
    const parsed = createScriptInput.parse({ projectId: "11111111-1111-1111-8111-111111111111", title: "  Pilot  " });
    expect(parsed.title).toBe("Pilot");
  });

  it("rejects an empty title", () => {
    const result = createScriptInput.safeParse({ projectId: "11111111-1111-1111-8111-111111111111", title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid projectId", () => {
    const result = createScriptInput.safeParse({ projectId: "nope", title: "Pilot" });
    expect(result.success).toBe(false);
  });
});

describe("enums", () => {
  it("intExt accepts INT/EXT", () => {
    expect(intExt.safeParse("INT/EXT").success).toBe(true);
  });
  it("intExt rejects garbage", () => {
    expect(intExt.safeParse("INSIDE").success).toBe(false);
  });
  it("sceneStatus accepts omitted", () => {
    expect(sceneStatus.safeParse("omitted").success).toBe(true);
  });
});

describe("scene read schema", () => {
  it("is loose on int_ext (DB column is text, must not throw on unknown)", () => {
    const row = {
      id: "11111111-1111-1111-8111-111111111111",
      project_id: "22222222-2222-2222-8222-222222222222",
      script_id: "33333333-3333-3333-8333-333333333333",
      ordinal: 1,
      scene_number: "1",
      number_locked: false,
      int_ext: "WEIRD",
      location_slug: "DINER",
      time_of_day: "DAY",
      synopsis: "They meet.",
      page_eighths: 8,
      script_day: "D1",
      status: "active",
      created_at: "2026-06-03T00:00:00Z",
      updated_at: "2026-06-03T00:00:00Z",
    };
    expect(scene.safeParse(row).success).toBe(true);
  });
});

describe("parsedScene", () => {
  it("validates adapter output", () => {
    const p = {
      sceneNumber: "5A",
      intExt: "INT",
      locationSlug: "DINER",
      timeOfDay: "DAY",
      bodyText: "ACTION.",
      synopsis: "They meet.",
      pageEighths: 8,
      textAnchorStart: 0,
      textAnchorEnd: 42,
      ordinal: 4,
    };
    expect(parsedScene.parse(p).sceneNumber).toBe("5A");
  });
});

describe("sceneDiffEntry", () => {
  it("classifies a modified scene with a matched id and confidence", () => {
    const d = {
      classification: "modified" as const,
      sceneId: "11111111-1111-1111-8111-111111111111",
      confidence: 0.82,
      parsedOrdinal: 3,
      parsed: {
        sceneNumber: "3",
        intExt: "EXT",
        locationSlug: "PARK",
        timeOfDay: "NIGHT",
        bodyText: "ACTION.",
        synopsis: "",
        pageEighths: 8,
        textAnchorStart: 0,
        textAnchorEnd: 10,
        ordinal: 2,
      },
    };
    expect(sceneDiffEntry.parse(d).classification).toBe("modified");
  });
});
