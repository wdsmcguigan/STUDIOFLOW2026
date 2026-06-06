import { describe, it, expect } from "vitest";
import {
  crewMember,
  callSheet,
  crewDeptCall,
  crewDayCall,
  castDayCall,
  createCrewMemberInput,
  updateCrewMemberInput,
  setCrewDeptCallInput,
  setCrewDayCallInput,
  removeCrewDayCallInput,
  setCastDayCallInput,
  upsertCallSheetHeaderInput,
  bumpRevisionInput,
} from "@/lib/callsheet/schema";

// ---- Read-row tests (loose parsing) ----------------------------------------

describe("crewMember row", () => {
  it("parses a fully-populated row", () => {
    const id = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const personId = crypto.randomUUID();
    expect(
      crewMember.safeParse({
        id,
        project_id: projectId,
        person_id: personId,
        name: "Jane Smith",
        department: "Camera",
        position: "1st AC",
        email: "jane@example.com",
        phone: "555-1234",
        day_rate: 650.0,
        ordinal: 2,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("parses loose strings (empty department/position) with null optionals", () => {
    expect(
      crewMember.safeParse({
        id: crypto.randomUUID(),
        project_id: crypto.randomUUID(),
        person_id: null,
        name: "X",
        department: "",
        position: "",
        email: null,
        phone: null,
        day_rate: null,
        ordinal: 0,
        created_at: "t",
        updated_at: "t",
      }).success,
    ).toBe(true);
  });
});

describe("callSheet row", () => {
  it("parses a fully-populated header row", () => {
    expect(
      callSheet.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        general_call_time: "07:00",
        weather_note: "Sunny, 72°F",
        hospital_name: "Cedars-Sinai",
        hospital_address: "8700 Beverly Blvd",
        notes: "Bring rain gear",
        revision: 1,
        published_at: "2026-09-01T08:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("parses a minimal row with all nullable fields null", () => {
    expect(
      callSheet.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        general_call_time: null,
        weather_note: null,
        hospital_name: null,
        hospital_address: null,
        notes: null,
        revision: 1,
        published_at: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("crewDeptCall row", () => {
  it("parses a crew_dept_calls row (call_time is NOT NULL in DB)", () => {
    expect(
      crewDeptCall.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        department: "Grip",
        call_time: "07:00",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("crewDayCall row", () => {
  it("parses a crew_day_calls row with null call_time", () => {
    expect(
      crewDayCall.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        crew_member_id: crypto.randomUUID(),
        call_time: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("parses a crew_day_calls row with an explicit call_time", () => {
    expect(
      crewDayCall.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        crew_member_id: crypto.randomUUID(),
        call_time: "08:00",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("castDayCall row", () => {
  it("parses a cast_day_calls row with all time fields null", () => {
    expect(
      castDayCall.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        person_id: crypto.randomUUID(),
        call_time: null,
        makeup_time: null,
        wardrobe_time: null,
        on_set_time: null,
        notes: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("parses a cast_day_calls row with all time fields set", () => {
    expect(
      castDayCall.safeParse({
        id: crypto.randomUUID(),
        shoot_day_id: crypto.randomUUID(),
        person_id: crypto.randomUUID(),
        call_time: "07:00",
        makeup_time: "06:00",
        wardrobe_time: "06:30",
        on_set_time: "07:30",
        notes: "Rush makeup",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });
});

// ---- Write-input tests (strict parsing) ------------------------------------

describe("createCrewMemberInput", () => {
  it("accepts a valid full input", () => {
    expect(
      createCrewMemberInput.safeParse({
        projectId: crypto.randomUUID(),
        name: "Grip",
        department: "Grip",
        position: "Key Grip",
      }).success,
    ).toBe(true);
  });

  it("accepts optional fields", () => {
    expect(
      createCrewMemberInput.safeParse({
        projectId: crypto.randomUUID(),
        name: "Gaffer",
        department: "Electric",
        position: "Gaffer",
        email: "gaffer@crew.com",
        phone: "555-9999",
        dayRate: 800,
        personId: crypto.randomUUID(),
        ordinal: 1,
      }).success,
    ).toBe(true);
  });

  it("requires name (missing name fails)", () => {
    expect(
      createCrewMemberInput.safeParse({ projectId: crypto.randomUUID() }).success,
    ).toBe(false);
  });

  it("requires projectId (missing projectId fails)", () => {
    expect(
      createCrewMemberInput.safeParse({ name: "Grip", department: "Grip", position: "Key Grip" })
        .success,
    ).toBe(false);
  });

  it("rejects empty name after trim", () => {
    expect(
      createCrewMemberInput.safeParse({
        projectId: crypto.randomUUID(),
        name: "   ",
        department: "Grip",
        position: "Key Grip",
      }).success,
    ).toBe(false);
  });

  it("allows null dayRate", () => {
    expect(
      createCrewMemberInput.safeParse({
        projectId: crypto.randomUUID(),
        name: "PA",
        department: "Production",
        position: "PA",
        dayRate: null,
      }).success,
    ).toBe(true);
  });
});

describe("updateCrewMemberInput", () => {
  it("accepts a patch with only the required id", () => {
    expect(
      updateCrewMemberInput.safeParse({ id: crypto.randomUUID() }).success,
    ).toBe(true);
  });

  it("accepts a partial patch", () => {
    expect(
      updateCrewMemberInput.safeParse({
        id: crypto.randomUUID(),
        name: "Updated Name",
        department: "Camera",
      }).success,
    ).toBe(true);
  });

  it("requires id", () => {
    expect(
      updateCrewMemberInput.safeParse({ name: "No Id" }).success,
    ).toBe(false);
  });
});

describe("setCrewDeptCallInput", () => {
  it("accepts a valid department call", () => {
    expect(
      setCrewDeptCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        department: "Grip",
        callTime: "07:00",
      }).success,
    ).toBe(true);
  });

  it("requires department", () => {
    expect(
      setCrewDeptCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        callTime: "07:00",
      }).success,
    ).toBe(false);
  });
});

describe("setCrewDayCallInput", () => {
  it("accepts null call_time (cascade — cleared override)", () => {
    expect(
      setCrewDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        crewMemberId: crypto.randomUUID(),
        callTime: null,
      }).success,
    ).toBe(true);
  });

  it("accepts a string call_time", () => {
    expect(
      setCrewDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        crewMemberId: crypto.randomUUID(),
        callTime: "08:30",
      }).success,
    ).toBe(true);
  });

  it("requires both shootDayId and crewMemberId", () => {
    expect(
      setCrewDayCallInput.safeParse({
        crewMemberId: crypto.randomUUID(),
        callTime: "07:00",
      }).success,
    ).toBe(false);
    expect(
      setCrewDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        callTime: "07:00",
      }).success,
    ).toBe(false);
  });
});

describe("removeCrewDayCallInput", () => {
  it("accepts valid UUIDs", () => {
    expect(
      removeCrewDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        crewMemberId: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });

  it("requires both fields", () => {
    expect(
      removeCrewDayCallInput.safeParse({ shootDayId: crypto.randomUUID() }).success,
    ).toBe(false);
  });
});

describe("setCastDayCallInput", () => {
  it("accepts all optional time fields as null/undefined", () => {
    expect(
      setCastDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        personId: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });

  it("accepts all time fields populated", () => {
    expect(
      setCastDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        personId: crypto.randomUUID(),
        callTime: "07:00",
        makeupTime: "06:00",
        wardrobeTime: "06:30",
        onSetTime: "07:30",
        notes: "Early start",
      }).success,
    ).toBe(true);
  });

  it("accepts null for all time overrides (clear them)", () => {
    expect(
      setCastDayCallInput.safeParse({
        shootDayId: crypto.randomUUID(),
        personId: crypto.randomUUID(),
        callTime: null,
        makeupTime: null,
        wardrobeTime: null,
        onSetTime: null,
        notes: null,
      }).success,
    ).toBe(true);
  });

  it("requires shootDayId + personId", () => {
    expect(
      setCastDayCallInput.safeParse({ personId: crypto.randomUUID() }).success,
    ).toBe(false);
    expect(
      setCastDayCallInput.safeParse({ shootDayId: crypto.randomUUID() }).success,
    ).toBe(false);
  });
});

describe("upsertCallSheetHeaderInput", () => {
  it("accepts only the required shootDayId (all header fields optional)", () => {
    expect(
      upsertCallSheetHeaderInput.safeParse({ shootDayId: crypto.randomUUID() }).success,
    ).toBe(true);
  });

  it("accepts all header fields", () => {
    expect(
      upsertCallSheetHeaderInput.safeParse({
        shootDayId: crypto.randomUUID(),
        generalCallTime: "07:00",
        weatherNote: "Partly cloudy, 68°F",
        hospitalName: "Cedars-Sinai",
        hospitalAddress: "8700 Beverly Blvd, Los Angeles, CA 90048",
        notes: "Lunch at 13:00",
      }).success,
    ).toBe(true);
  });

  it("accepts null for all header fields (explicit clear)", () => {
    expect(
      upsertCallSheetHeaderInput.safeParse({
        shootDayId: crypto.randomUUID(),
        generalCallTime: null,
        weatherNote: null,
        hospitalName: null,
        hospitalAddress: null,
        notes: null,
      }).success,
    ).toBe(true);
  });

  it("requires shootDayId", () => {
    expect(
      upsertCallSheetHeaderInput.safeParse({ generalCallTime: "07:00" }).success,
    ).toBe(false);
  });
});

describe("bumpRevisionInput", () => {
  it("accepts a valid shootDayId", () => {
    expect(
      bumpRevisionInput.safeParse({ shootDayId: crypto.randomUUID() }).success,
    ).toBe(true);
  });

  it("requires shootDayId", () => {
    expect(bumpRevisionInput.safeParse({}).success).toBe(false);
  });
});
