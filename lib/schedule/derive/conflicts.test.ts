import { describe, it, expect } from "vitest";
import { computeConflicts } from "@/lib/schedule/derive/conflicts";

const base = {
  shootDays: [
    { id: "d1", date: "2026-07-01", unit: "main" },
    { id: "d2", date: "2026-07-01", unit: "second" },
    { id: "d3", date: "2026-07-02", unit: "main" },
  ],
  strips: [
    { shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" },
    { shoot_day_id: "d2", type: "scene", scene_segment_id: "g2" },
  ],
  segments: [
    { id: "g1", scene_id: "sc1" },
    { id: "g2", scene_id: "sc2" },
  ],
  scenes: [
    { id: "sc1", set_id: null },
    { id: "sc2", set_id: null },
  ],
  sceneCharactersConfirmed: [
    { scene_id: "sc1", character_id: "ch1" },
    { scene_id: "sc2", character_id: "ch1" },
  ],
  characters: [{ id: "ch1", cast_person_id: "p1" }],
  sceneElementsConfirmed: [],
  castOverrides: [],
};

describe("computeConflicts", () => {
  it("flags a cast member needed in two units on the same date (cross-unit)", () => {
    const c = computeConflicts(base);
    const cast = c.filter((x) => x.type === "cast" && x.resourceId === "p1");
    expect(cast).toHaveLength(1);
    expect(cast[0].date).toBe("2026-07-01");
    expect(cast[0].segmentIds.sort()).toEqual(["g1", "g2"]);
  });

  it("clears when one segment moves to another date", () => {
    const moved = {
      ...base,
      strips: [
        { shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" },
        { shoot_day_id: "d3", type: "scene", scene_segment_id: "g2" },
      ],
    };
    expect(computeConflicts(moved).filter((x) => x.type === "cast")).toHaveLength(0);
  });

  it("flags an actor scheduled on an override hold day", () => {
    const withHold = {
      ...base,
      strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }],
      sceneCharactersConfirmed: [{ scene_id: "sc1", character_id: "ch1" }],
      castOverrides: [{ person_id: "p1", date: "2026-07-01", status: "hold" }],
    };
    expect(
      computeConflicts(withHold).some(
        (x) => x.type === "cast_status" && x.resourceId === "p1",
      ),
    ).toBe(true);
  });

  it("flags an element double-booked on the same date (one conflict, both segments)", () => {
    const withElem = {
      ...base,
      sceneCharactersConfirmed: [],
      sceneElementsConfirmed: [
        { scene_id: "sc1", element_id: "e1" },
        { scene_id: "sc2", element_id: "e1" },
      ],
    };
    const c = computeConflicts(withElem).filter(
      (x) => x.type === "element" && x.resourceId === "e1",
    );
    expect(c).toHaveLength(1);
    expect(c[0].date).toBe("2026-07-01");
    expect(c[0].segmentIds.sort()).toEqual(["g1", "g2"]);
  });

  it("flags a person needed by two segments on the same shoot day (same unit)", () => {
    const sameDay = {
      ...base,
      shootDays: [{ id: "d1", date: "2026-07-01", unit: "main" }],
      strips: [
        { shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" },
        { shoot_day_id: "d1", type: "scene", scene_segment_id: "g2" },
      ],
    };
    const cast = computeConflicts(sameDay).filter(
      (x) => x.type === "cast" && x.resourceId === "p1",
    );
    expect(cast).toHaveLength(1);
    expect(cast[0].segmentIds.sort()).toEqual(["g1", "g2"]);
    // single unit → unit set to that unit, not null
    expect(cast[0].unit).toBe("main");
  });

  it("sets unit to null for cross-unit conflicts", () => {
    const cast = computeConflicts(base).filter((x) => x.type === "cast");
    expect(cast[0].unit).toBeNull();
  });

  it("does not flag cast_status for a benign override status (work)", () => {
    const withWork = {
      ...base,
      strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }],
      sceneCharactersConfirmed: [{ scene_id: "sc1", character_id: "ch1" }],
      castOverrides: [{ person_id: "p1", date: "2026-07-01", status: "work" }],
    };
    expect(
      computeConflicts(withWork).some((x) => x.type === "cast_status"),
    ).toBe(false);
  });

  it("ignores undated shoot days", () => {
    const undated = {
      ...base,
      shootDays: [
        { id: "d1", date: null, unit: "main" },
        { id: "d2", date: null, unit: "second" },
      ],
    };
    expect(computeConflicts(undated)).toHaveLength(0);
  });

  it("skips characters with a null cast_person_id", () => {
    const nullCast = {
      ...base,
      characters: [{ id: "ch1", cast_person_id: null }],
    };
    expect(computeConflicts(nullCast).filter((x) => x.type === "cast")).toHaveLength(0);
  });

  it("ignores non-scene strips", () => {
    const banners = {
      ...base,
      strips: [
        { shoot_day_id: "d1", type: "banner", scene_segment_id: "g1" },
        { shoot_day_id: "d2", type: "day_break", scene_segment_id: "g2" },
      ],
    };
    expect(computeConflicts(banners)).toHaveLength(0);
  });
});
