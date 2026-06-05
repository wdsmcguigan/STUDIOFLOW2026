import { describe, it, expect } from "vitest";
import { computeCompanyMoves, type MovesGraph } from "@/lib/schedule/derive/moves";

const baseGraph: MovesGraph = {
  shootDays: [
    { id: "d1", ordinal: 0, date: "2026-07-01" },
    { id: "d2", ordinal: 1, date: "2026-07-02" },
  ],
  strips: [
    { shoot_day_id: "d1", ordinal: 0, type: "scene", scene_segment_id: "g1" },
    { shoot_day_id: "d2", ordinal: 0, type: "scene", scene_segment_id: "g2" },
  ],
  segments: [
    { id: "g1", scene_id: "sc1" },
    { id: "g2", scene_id: "sc2" },
  ],
  scenes: [
    { id: "sc1", set_id: "set1" },
    { id: "sc2", set_id: "set2" },
  ],
  sets: [
    { id: "set1", location_id: "loc1" },
    { id: "set2", location_id: "loc2" },
  ],
};

describe("computeCompanyMoves", () => {
  it("flags a move when consecutive scenes are at different parent locations", () => {
    const m = computeCompanyMoves(baseGraph);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({
      fromSetId: "set1",
      toSetId: "set2",
      date: "2026-07-02",
    });
  });

  it("does not flag a move when consecutive scenes share the same parent location", () => {
    const graph: MovesGraph = {
      ...baseGraph,
      sets: [
        { id: "set1", location_id: "loc1" },
        { id: "set2", location_id: "loc1" }, // same location, different set
      ],
    };
    expect(computeCompanyMoves(graph)).toHaveLength(0);
  });

  it("does not flag a move when consecutive scenes are at the same set", () => {
    const graph: MovesGraph = {
      ...baseGraph,
      scenes: [
        { id: "sc1", set_id: "set1" },
        { id: "sc2", set_id: "set1" }, // same set
      ],
    };
    expect(computeCompanyMoves(graph)).toHaveLength(0);
  });

  it("skips day_break/banner strips and detects the move between surrounding scenes", () => {
    const graph: MovesGraph = {
      ...baseGraph,
      strips: [
        { shoot_day_id: "d1", ordinal: 0, type: "scene", scene_segment_id: "g1" },
        // a banner on d1 between the scenes
        { shoot_day_id: "d1", ordinal: 1, type: "banner", scene_segment_id: null },
        // a day break opening d2
        { shoot_day_id: "d2", ordinal: 0, type: "day_break", scene_segment_id: null },
        { shoot_day_id: "d2", ordinal: 1, type: "scene", scene_segment_id: "g2" },
      ],
    };
    const m = computeCompanyMoves(graph);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({
      fromSetId: "set1",
      toSetId: "set2",
      date: "2026-07-02",
    });
  });

  it("follows board order (shoot_day ordinal, strip ordinal), not array order", () => {
    // Three scenes: loc1 -> loc2 -> loc1. In board order that is two moves.
    // Provide strips and shootDays scrambled in the arrays.
    const graph: MovesGraph = {
      shootDays: [
        { id: "d3", ordinal: 2, date: "2026-07-03" },
        { id: "d1", ordinal: 0, date: "2026-07-01" },
        { id: "d2", ordinal: 1, date: "2026-07-02" },
      ],
      strips: [
        // scrambled — d2 first, then d3, then d1
        { shoot_day_id: "d2", ordinal: 0, type: "scene", scene_segment_id: "g2" },
        { shoot_day_id: "d3", ordinal: 0, type: "scene", scene_segment_id: "g3" },
        { shoot_day_id: "d1", ordinal: 0, type: "scene", scene_segment_id: "g1" },
      ],
      segments: [
        { id: "g1", scene_id: "sc1" },
        { id: "g2", scene_id: "sc2" },
        { id: "g3", scene_id: "sc3" },
      ],
      scenes: [
        { id: "sc1", set_id: "set1" },
        { id: "sc2", set_id: "set2" },
        { id: "sc3", set_id: "set3" },
      ],
      sets: [
        { id: "set1", location_id: "loc1" },
        { id: "set2", location_id: "loc2" },
        { id: "set3", location_id: "loc1" }, // back to loc1
      ],
    };
    const m = computeCompanyMoves(graph);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ fromSetId: "set1", toSetId: "set2", date: "2026-07-02" });
    expect(m[1]).toMatchObject({ fromSetId: "set2", toSetId: "set3", date: "2026-07-03" });
  });

  it("respects strip ordinal within a single shoot day", () => {
    const graph: MovesGraph = {
      shootDays: [{ id: "d1", ordinal: 0, date: "2026-07-01" }],
      strips: [
        // scrambled within the day
        { shoot_day_id: "d1", ordinal: 1, type: "scene", scene_segment_id: "g2" },
        { shoot_day_id: "d1", ordinal: 0, type: "scene", scene_segment_id: "g1" },
      ],
      segments: [
        { id: "g1", scene_id: "sc1" },
        { id: "g2", scene_id: "sc2" },
      ],
      scenes: [
        { id: "sc1", set_id: "set1" },
        { id: "sc2", set_id: "set2" },
      ],
      sets: [
        { id: "set1", location_id: "loc1" },
        { id: "set2", location_id: "loc2" },
      ],
    };
    const m = computeCompanyMoves(graph);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ fromSetId: "set1", toSetId: "set2", date: "2026-07-01" });
  });

  it("does not crash and skips moves involving an unresolvable location (null set_id)", () => {
    const graph: MovesGraph = {
      ...baseGraph,
      strips: [
        { shoot_day_id: "d1", ordinal: 0, type: "scene", scene_segment_id: "g1" },
        { shoot_day_id: "d2", ordinal: 0, type: "scene", scene_segment_id: "g2" },
      ],
      scenes: [
        { id: "sc1", set_id: "set1" },
        { id: "sc2", set_id: null }, // unresolvable
      ],
    };
    // Null -> non-null and non-null -> null transitions do not count as moves.
    expect(computeCompanyMoves(graph)).toHaveLength(0);
  });

  it("skips moves when a set has a null location_id", () => {
    const graph: MovesGraph = {
      ...baseGraph,
      sets: [
        { id: "set1", location_id: "loc1" },
        { id: "set2", location_id: null }, // unresolvable location
      ],
    };
    expect(computeCompanyMoves(graph)).toHaveLength(0);
  });

  it("treats an unresolved scene as a gap and compares the next resolvable scene to the prior resolvable one", () => {
    // sc1 (loc1) -> sc2 (null) -> sc3 (loc2): a single move loc1 -> loc2 across the gap.
    const graph: MovesGraph = {
      shootDays: [
        { id: "d1", ordinal: 0, date: "2026-07-01" },
        { id: "d2", ordinal: 1, date: "2026-07-02" },
        { id: "d3", ordinal: 2, date: "2026-07-03" },
      ],
      strips: [
        { shoot_day_id: "d1", ordinal: 0, type: "scene", scene_segment_id: "g1" },
        { shoot_day_id: "d2", ordinal: 0, type: "scene", scene_segment_id: "g2" },
        { shoot_day_id: "d3", ordinal: 0, type: "scene", scene_segment_id: "g3" },
      ],
      segments: [
        { id: "g1", scene_id: "sc1" },
        { id: "g2", scene_id: "sc2" },
        { id: "g3", scene_id: "sc3" },
      ],
      scenes: [
        { id: "sc1", set_id: "set1" },
        { id: "sc2", set_id: null },
        { id: "sc3", set_id: "set3" },
      ],
      sets: [
        { id: "set1", location_id: "loc1" },
        { id: "set3", location_id: "loc2" },
      ],
    };
    const m = computeCompanyMoves(graph);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ fromSetId: "set1", toSetId: "set3", date: "2026-07-03" });
  });

  it("returns an empty array for no strips", () => {
    expect(computeCompanyMoves({ ...baseGraph, strips: [] })).toHaveLength(0);
  });
});
