import { describe, it, expect } from "vitest";
import { resolveCrewCallTime, resolveCastCallTime } from "./calls";

// ---------------------------------------------------------------------------
// resolveCrewCallTime
// Cascade: individual dayCall.call_time > deptCallByDept[dept] > generalCallTime > null
// ---------------------------------------------------------------------------

describe("resolveCrewCallTime", () => {
  const member = { department: "Camera" };
  const deptCalls: Record<string, string> = { Camera: "07:00", Grip: "07:30" };
  const general = "08:00";

  it("uses individual dayCall.call_time when present — wins over dept + general", () => {
    const dayCall = { call_time: "06:00" };
    expect(resolveCrewCallTime(member, dayCall, deptCalls, general)).toBe(
      "06:00",
    );
  });

  it("falls through to dept call when dayCall has null call_time", () => {
    const dayCall = { call_time: null };
    expect(resolveCrewCallTime(member, dayCall, deptCalls, general)).toBe(
      "07:00",
    );
  });

  it("falls through to dept call when dayCall is undefined", () => {
    expect(resolveCrewCallTime(member, undefined, deptCalls, general)).toBe(
      "07:00",
    );
  });

  it("falls through to dept call when dayCall is null", () => {
    expect(resolveCrewCallTime(member, null, deptCalls, general)).toBe("07:00");
  });

  it("uses general call when no dayCall call_time and dept not in map", () => {
    const memberOther = { department: "Locations" };
    expect(
      resolveCrewCallTime(memberOther, null, deptCalls, general),
    ).toBe("08:00");
  });

  it("returns null when no dayCall, no dept entry, and generalCallTime is null", () => {
    const memberOther = { department: "Locations" };
    expect(
      resolveCrewCallTime(memberOther, null, deptCalls, null),
    ).toBeNull();
  });

  it("returns null when all inputs are absent/null/empty", () => {
    expect(resolveCrewCallTime({ department: "Art" }, null, {}, null)).toBeNull();
  });

  it("empty-string department has no dept entry → falls through to general", () => {
    // deptCallByDept[""] is absent; should fall to general
    const memberEmpty = { department: "" };
    expect(resolveCrewCallTime(memberEmpty, null, deptCalls, general)).toBe(
      general,
    );
  });

  it("empty-string department with no general → null", () => {
    const memberEmpty = { department: "" };
    expect(resolveCrewCallTime(memberEmpty, null, deptCalls, null)).toBeNull();
  });

  it("individual dayCall.call_time overrides even when dept and general both exist", () => {
    const dayCall = { call_time: "05:30" };
    expect(resolveCrewCallTime(member, dayCall, deptCalls, general)).toBe(
      "05:30",
    );
  });

  it("dept call wins over general when no individual override", () => {
    // Grip has a dept call of 07:30; general is 08:00
    const grip = { department: "Grip" };
    expect(resolveCrewCallTime(grip, null, deptCalls, general)).toBe("07:30");
  });
});

// ---------------------------------------------------------------------------
// resolveCastCallTime
// callTime: castDayCall?.call_time ?? generalCallTime ?? null
// makeup/wardrobe/onSet: pass through from castDayCall (or null)
// ---------------------------------------------------------------------------

describe("resolveCastCallTime", () => {
  const general = "08:00";

  it("uses castDayCall.call_time when present — overrides general", () => {
    const castDayCall = {
      call_time: "06:30",
      makeup_time: "06:00",
      wardrobe_time: "06:15",
      on_set_time: "07:00",
    };
    const result = resolveCastCallTime(castDayCall, general);
    expect(result.callTime).toBe("06:30");
    expect(result.makeup).toBe("06:00");
    expect(result.wardrobe).toBe("06:15");
    expect(result.onSet).toBe("07:00");
  });

  it("falls back to general when castDayCall.call_time is null", () => {
    const castDayCall = {
      call_time: null,
      makeup_time: "06:00",
      wardrobe_time: null,
      on_set_time: "07:00",
    };
    const result = resolveCastCallTime(castDayCall, general);
    expect(result.callTime).toBe("08:00");
    expect(result.makeup).toBe("06:00");
    expect(result.wardrobe).toBeNull();
    expect(result.onSet).toBe("07:00");
  });

  it("falls back to general when castDayCall is null", () => {
    const result = resolveCastCallTime(null, general);
    expect(result.callTime).toBe("08:00");
    expect(result.makeup).toBeNull();
    expect(result.wardrobe).toBeNull();
    expect(result.onSet).toBeNull();
  });

  it("falls back to general when castDayCall is undefined", () => {
    const result = resolveCastCallTime(undefined, general);
    expect(result.callTime).toBe("08:00");
    expect(result.makeup).toBeNull();
    expect(result.wardrobe).toBeNull();
    expect(result.onSet).toBeNull();
  });

  it("returns all null when castDayCall is null and generalCallTime is null", () => {
    const result = resolveCastCallTime(null, null);
    expect(result.callTime).toBeNull();
    expect(result.makeup).toBeNull();
    expect(result.wardrobe).toBeNull();
    expect(result.onSet).toBeNull();
  });

  it("makeup/wardrobe/onSet pass through as null when castDayCall has all nulls", () => {
    const castDayCall = {
      call_time: "07:00",
      makeup_time: null,
      wardrobe_time: null,
      on_set_time: null,
    };
    const result = resolveCastCallTime(castDayCall, general);
    expect(result.callTime).toBe("07:00");
    expect(result.makeup).toBeNull();
    expect(result.wardrobe).toBeNull();
    expect(result.onSet).toBeNull();
  });
});
