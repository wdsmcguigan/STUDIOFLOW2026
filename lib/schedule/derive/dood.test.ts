import { describe, it, expect } from "vitest";
import { computeDOOD } from "@/lib/schedule/derive/dood";

const graph = {
  shootDays: [
    { id: "d1", date: "2026-07-01", unit: "main", day_type: "shoot" },
    { id: "d2", date: "2026-07-02", unit: "main", day_type: "shoot" },
    { id: "d3", date: "2026-07-03", unit: "main", day_type: "shoot" },
    { id: "d4", date: "2026-07-04", unit: "main", day_type: "shoot" },
    { id: "d5", date: "2026-07-05", unit: "main", day_type: "shoot" },
  ],
  strips: [
    { shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" },
    { shoot_day_id: "d5", type: "scene", scene_segment_id: "g2" },
  ],
  segments: [{ id: "g1", scene_id: "sc1" }, { id: "g2", scene_id: "sc1" }],
  sceneCharactersConfirmed: [{ scene_id: "sc1", character_id: "ch1" }],
  characters: [{ id: "ch1", cast_person_id: "p1" }],
  castOverrides: [],
  companyOffDays: [],
};
const cfg = { allowHoldDays: true, allowDropPickup: false, minDropPickupCalendarDays: 2 };

describe("computeDOOD", () => {
  it("derives SW / H / WF across a work span (hold on)", () => {
    const d = computeDOOD(graph, cfg);
    const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
    expect(byDate["2026-07-01"]).toBe("SW");
    expect(byDate["2026-07-02"]).toBe("H");
    expect(byDate["2026-07-03"]).toBe("H");
    expect(byDate["2026-07-04"]).toBe("H");
    expect(byDate["2026-07-05"]).toBe("WF");
  });

  it("single work day renders SWF", () => {
    const g2 = { ...graph, strips: [{ shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" }], segments: [{ id: "g1", scene_id: "sc1" }] };
    const d = computeDOOD(g2, cfg);
    expect(d.find(e => e.personId === "p1" && e.date === "2026-07-01")!.code).toBe("SWF");
  });

  it("excludes company-off days from Hold", () => {
    const d = computeDOOD({ ...graph, companyOffDays: ["2026-07-03"] }, cfg);
    expect(d.find(e => e.personId === "p1" && e.date === "2026-07-03")).toBeUndefined(); // off day → no DOOD cell (or 'O')
  });

  it("drop/pickup when enabled and the gap meets the configurable minimum", () => {
    const d = computeDOOD(graph, { allowHoldDays: true, allowDropPickup: true, minDropPickupCalendarDays: 2 });
    const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
    expect(byDate["2026-07-01"]).toBe("SW");
    expect(byDate["2026-07-03"]).toBe("D");     // gap (3 non-work days >= 2) -> dropped
    expect(byDate["2026-07-05"]).toBe("P");     // resumes -> pickup
    expect(byDate["2026-07-02"]).toBeUndefined(); // released, not held
  });

  it("an override wins and is marked", () => {
    const d = computeDOOD({ ...graph, castOverrides: [{ person_id: "p1", date: "2026-07-02", status: "travel" }] }, cfg);
    const cell = d.find(e => e.personId === "p1" && e.date === "2026-07-02")!;
    expect(cell.code).toBe("T");
    expect(cell.source).toBe("override");
  });

  // ---- Additional coverage ----

  it("no hold, no drop/pickup → gap days get no cell, only span ends marked", () => {
    const d = computeDOOD(graph, { allowHoldDays: false, allowDropPickup: false, minDropPickupCalendarDays: 2 });
    const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
    expect(byDate["2026-07-01"]).toBe("SW");
    expect(byDate["2026-07-05"]).toBe("WF");
    expect(byDate["2026-07-02"]).toBeUndefined();
    expect(byDate["2026-07-03"]).toBeUndefined();
    expect(byDate["2026-07-04"]).toBeUndefined();
  });

  it("a gap shorter than the minimum stays Hold even when drop/pickup is enabled", () => {
    // Work d1 and d3 only → single gap day 07-02 (1 calendar day < min 2).
    const g = {
      ...graph,
      strips: [
        { shoot_day_id: "d1", type: "scene", scene_segment_id: "g1" },
        { shoot_day_id: "d3", type: "scene", scene_segment_id: "g2" },
      ],
    };
    const d = computeDOOD(g, { allowHoldDays: true, allowDropPickup: true, minDropPickupCalendarDays: 2 });
    const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
    expect(byDate["2026-07-01"]).toBe("SW");
    expect(byDate["2026-07-02"]).toBe("H"); // gap of 1 < min 2 → held, not dropped
    expect(byDate["2026-07-03"]).toBe("WF");
  });

  it("a company-off day splits a long gap into short sub-gaps → no drop, off day gets no cell", () => {
    // p1 works 07-01 (SW) and 07-05 (WF). 07-03 is a company-off day, so the
    // span's non-work interior (07-02, 07-03-off, 07-04) is NOT one 3-day gap:
    // the off day BREAKS it into two 1-calendar-day sub-gaps [07-02] and [07-04],
    // and the off day is itself never part of a run. Drop/pickup is ON with
    // min 2, but neither sub-gap reaches 2 → no drop is placed (in particular,
    // the old "pickup - min" arithmetic would have wrongly placed D on the
    // off day 07-03). With holds on, both sub-gap days fall back to Hold.
    // Expected DOOD: 07-01 SW, 07-02 H, 07-03 (none), 07-04 H, 07-05 WF.
    const d = computeDOOD(
      { ...graph, companyOffDays: ["2026-07-03"] },
      { allowHoldDays: true, allowDropPickup: true, minDropPickupCalendarDays: 2 },
    );
    const rows = d.filter(e => e.personId === "p1");
    const byDate = Object.fromEntries(rows.map(e => [e.date, e.code]));
    expect(byDate["2026-07-01"]).toBe("SW");
    expect(byDate["2026-07-02"]).toBe("H");
    expect(byDate["2026-07-03"]).toBeUndefined(); // off day → no cell
    expect(byDate["2026-07-04"]).toBe("H");
    expect(byDate["2026-07-05"]).toBe("WF");
    // No 'D' anywhere, and certainly not on the off day.
    expect(rows.some(e => e.code === "D")).toBe(false);
    expect(rows.some(e => e.date === "2026-07-03")).toBe(false);
  });

  it("a travel-typed dated day inside the span counts as work for someone already working", () => {
    // d3 has no scene strip but is day_type 'travel'; person p1 works d1 & d5.
    const g = {
      ...graph,
      shootDays: graph.shootDays.map(sd => (sd.id === "d3" ? { ...sd, day_type: "travel" } : sd)),
    };
    const d = computeDOOD(g, { allowHoldDays: true, allowDropPickup: false, minDropPickupCalendarDays: 2 });
    const byDate = Object.fromEntries(d.filter(e => e.personId === "p1").map(e => [e.date, e.code]));
    // 07-03 is a work-equivalent (travel) day → W, not H.
    expect(byDate["2026-07-03"]).toBe("W");
    expect(byDate["2026-07-02"]).toBe("H");
    expect(byDate["2026-07-04"]).toBe("H");
  });
});
