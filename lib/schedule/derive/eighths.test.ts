import { describe, it, expect } from "vitest";
import { computeEighthsRollup } from "@/lib/schedule/derive/eighths";

describe("computeEighthsRollup", () => {
  it("sums segment eighths per shoot day from scene strips", () => {
    const strips = [
      { shoot_day_id: "d1", type: "scene", scene_segment_id: "s1" },
      { shoot_day_id: "d1", type: "scene", scene_segment_id: "s2" },
      { shoot_day_id: "d1", type: "day_break", scene_segment_id: null },
      { shoot_day_id: "d2", type: "scene", scene_segment_id: "s3" },
    ];
    const segments = [
      { id: "s1", page_eighths: 8 },
      { id: "s2", page_eighths: 4 },
      { id: "s3", page_eighths: 2 },
    ];
    const r = computeEighthsRollup(strips, segments);
    expect(r.find((x) => x.shootDayId === "d1")!.eighths).toBe(12);
    expect(r.find((x) => x.shootDayId === "d2")!.eighths).toBe(2);
  });

  it("counts a non-scene (day_break/banner) strip as 0 eighths", () => {
    const strips = [
      { shoot_day_id: "d1", type: "scene", scene_segment_id: "s1" },
      { shoot_day_id: "d1", type: "day_break", scene_segment_id: null },
      { shoot_day_id: "d1", type: "banner", scene_segment_id: null },
    ];
    const segments = [{ id: "s1", page_eighths: 5 }];
    const r = computeEighthsRollup(strips, segments);
    expect(r).toHaveLength(1);
    expect(r.find((x) => x.shootDayId === "d1")!.eighths).toBe(5);
  });

  it("treats a scene strip with no matching segment as 0 and does not crash", () => {
    const strips = [
      { shoot_day_id: "d1", type: "scene", scene_segment_id: "missing" },
      { shoot_day_id: "d1", type: "scene", scene_segment_id: "s1" },
    ];
    const segments = [{ id: "s1", page_eighths: 6 }];
    const r = computeEighthsRollup(strips, segments);
    expect(r.find((x) => x.shootDayId === "d1")!.eighths).toBe(6);
  });

  it("returns an empty array for empty input", () => {
    expect(computeEighthsRollup([], [])).toEqual([]);
  });

  it("does not emit a shoot day that has only non-scene strips", () => {
    const strips = [
      { shoot_day_id: "d1", type: "day_break", scene_segment_id: null },
      { shoot_day_id: "d2", type: "scene", scene_segment_id: "s1" },
    ];
    const segments = [{ id: "s1", page_eighths: 3 }];
    const r = computeEighthsRollup(strips, segments);
    expect(r.map((x) => x.shootDayId)).toEqual(["d2"]);
  });
});
