// ---------------------------------------------------------------------------
// assembleCallSheet — unit tests (PURE; no DB, no IO, no Date.now)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { assembleCallSheet } from "./assemble";

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

const DAY_ID_A = "aaaaaaaa-0000-0000-0000-000000000001";
const DAY_ID_B = "bbbbbbbb-0000-0000-0000-000000000002";
const DAY_ID_C = "cccccccc-0000-0000-0000-000000000003";

const CREW_ID_1 = "c1000000-0000-0000-0000-000000000001";
const CREW_ID_2 = "c2000000-0000-0000-0000-000000000002";
const CREW_ID_3 = "c3000000-0000-0000-0000-000000000003";

const PERSON_ID_1 = "p1000000-0000-0000-0000-000000000001";
const PERSON_ID_2 = "p2000000-0000-0000-0000-000000000002";

/** A minimal slice matching CallSheetInputsLike for the current shoot day (DAY_ID_B at index 1 of 3). */
function makeSlice(overrides: Partial<Parameters<typeof assembleCallSheet>[0]> = {}): Parameters<typeof assembleCallSheet>[0] {
  return {
    shootDay: {
      id: DAY_ID_B,
      project_id: "proj-0000-0000-0000-000000000001",
      date: "2026-06-10",
      day_type: "shoot",
      unit: null,
      ordinal: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    orderedDatedDayIds: [DAY_ID_A, DAY_ID_B, DAY_ID_C],
    scenes: [
      {
        sceneNumber: "12",
        intExt: "INT",
        setOrLocation: "Kitchen",
        timeOfDay: "DAY",
        pageEighths: 4,
        synopsis: "Characters argue over breakfast.",
      },
      {
        sceneNumber: "13",
        intExt: "EXT",
        setOrLocation: "Front Yard",
        timeOfDay: "NIGHT",
        pageEighths: 2,
        synopsis: "The dog escapes.",
      },
    ],
    castPeople: [
      {
        personId: PERSON_ID_1,
        name: "Alice Actor",
        characterName: "The Protagonist",
        contactEmail: "alice@example.com",
        contactPhone: "555-1001",
      },
      {
        personId: PERSON_ID_2,
        name: "Bob Background",
        characterName: null,
        contactEmail: null,
        contactPhone: null,
      },
    ],
    crewMembers: [
      {
        id: CREW_ID_1,
        project_id: "proj-0000-0000-0000-000000000001",
        person_id: null,
        name: "Dana Director",
        department: "Directing",
        position: "Director",
        email: "dana@example.com",
        phone: "555-2001",
        day_rate: null,
        ordinal: 0,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: CREW_ID_2,
        project_id: "proj-0000-0000-0000-000000000001",
        person_id: null,
        name: "Eddie Electric",
        department: "Electric",
        position: "Gaffer",
        email: "eddie@example.com",
        phone: null,
        day_rate: null,
        ordinal: 1,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: CREW_ID_3,
        project_id: "proj-0000-0000-0000-000000000001",
        person_id: null,
        name: "Frances Focus",
        department: "Camera",
        position: "1st AC",
        email: null,
        phone: "555-3003",
        day_rate: null,
        ordinal: 2,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    // Only CREW_ID_1 and CREW_ID_2 have crewDayCalls — CREW_ID_3 does NOT
    crewDayCalls: [
      {
        id: "dc-1000-0000-0000-000000000001",
        shoot_day_id: DAY_ID_B,
        crew_member_id: CREW_ID_1,
        call_time: "07:30", // individual override
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "dc-2000-0000-0000-000000000002",
        shoot_day_id: DAY_ID_B,
        crew_member_id: CREW_ID_2,
        call_time: null, // row exists but call_time is null → cascade to dept
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    crewDeptCalls: [
      {
        id: "ddc-0000-0000-0000-000000000001",
        shoot_day_id: DAY_ID_B,
        department: "Electric",
        call_time: "08:00", // dept override for Electric
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    castDayCalls: [
      {
        id: "cdc-0000-0000-0000-000000000001",
        shoot_day_id: DAY_ID_B,
        person_id: PERSON_ID_1,
        call_time: "09:00", // individual cast override
        makeup_time: "08:00",
        wardrobe_time: "08:30",
        on_set_time: "09:30",
        notes: "Bring blue dress",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      // PERSON_ID_2 has no castDayCall row → falls back to general call time
    ],
    callSheet: {
      id: "cs-00000-0000-0000-000000000001",
      shoot_day_id: DAY_ID_B,
      general_call_time: "09:00",
      weather_note: "Partly cloudy",
      hospital_name: "St. Mary's Hospital",
      hospital_address: "123 Main St",
      notes: "Lock-up by 20:00",
      revision: 3,
      published_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    location: {
      id: "loc-00000-0000-0000-000000000001",
      project_id: "proj-0000-0000-0000-000000000001",
      name: "Griffith Observatory",
      address: "2800 E Observatory Rd, Los Angeles, CA 90027",
      geo_lat: 34.1185,
      geo_lng: -118.3004,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("assembleCallSheet", () => {
  // -------------------------------------------------------------------------
  // header: Day X of Y
  // -------------------------------------------------------------------------
  describe("header", () => {
    it("computes dayNumber and dayCount: day at index 1 of 3 → dayNumber 2, dayCount 3", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.header.dayNumber).toBe(2);
      expect(result.header.dayCount).toBe(3);
    });

    it("copies date from shootDay", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.header.date).toBe("2026-06-10");
    });

    it("copies generalCallTime from callSheet", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.header.generalCallTime).toBe("09:00");
    });

    it("generalCallTime is null when callSheet has null", () => {
      const slice = makeSlice();
      slice.callSheet = { ...slice.callSheet, general_call_time: null };
      const result = assembleCallSheet(slice);
      expect(result.header.generalCallTime).toBeNull();
    });

    it("copies weather/hospital/notes/revision from callSheet", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.header.weather).toBe("Partly cloudy");
      expect(result.header.hospitalName).toBe("St. Mary's Hospital");
      expect(result.header.hospitalAddress).toBe("123 Main St");
      expect(result.header.notes).toBe("Lock-up by 20:00");
      expect(result.header.revision).toBe(3);
    });

    it("uses opts.productionName when provided", () => {
      const result = assembleCallSheet(makeSlice(), { productionName: "The Great Film" });
      expect(result.header.production).toBe("The Great Film");
    });

    it("defaults production to empty string when opts is omitted", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.header.production).toBe("");
    });

    it("computes sunrise and sunset when location is present (format HH:mm)", () => {
      const result = assembleCallSheet(makeSlice());
      // With a valid location + date, sunrise/sunset should be non-null strings
      expect(result.header.sunrise).not.toBeNull();
      expect(result.header.sunset).not.toBeNull();
      // Format: HH:mm — exactly 5 chars matching /^\d{2}:\d{2}$/
      expect(result.header.sunrise).toMatch(/^\d{2}:\d{2}$/);
      expect(result.header.sunset).toMatch(/^\d{2}:\d{2}$/);
      // Sanity: sunrise before sunset for LA in June
      expect(result.header.sunrise! < result.header.sunset!).toBe(true);
    });

    it("returns sunrise/sunset null when location is null", () => {
      const slice = makeSlice({ location: null });
      const result = assembleCallSheet(slice);
      expect(result.header.sunrise).toBeNull();
      expect(result.header.sunset).toBeNull();
    });

    it("returns sunrise/sunset null when shootDay.date is null", () => {
      const slice = makeSlice();
      slice.shootDay = { ...slice.shootDay, date: null };
      const result = assembleCallSheet(slice);
      expect(result.header.sunrise).toBeNull();
      expect(result.header.sunset).toBeNull();
    });

    it("returns dayNumber 1 when shoot day is first in the ordered list", () => {
      const slice = makeSlice();
      slice.shootDay = { ...slice.shootDay, id: DAY_ID_A };
      const result = assembleCallSheet(slice);
      expect(result.header.dayNumber).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // scenes
  // -------------------------------------------------------------------------
  describe("scenes", () => {
    it("maps scenes in order", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.scenes).toHaveLength(2);
      expect(result.scenes[0].sceneNumber).toBe("12");
      expect(result.scenes[1].sceneNumber).toBe("13");
    });

    it("carries all CallSheetScene fields", () => {
      const result = assembleCallSheet(makeSlice());
      const scene = result.scenes[0];
      expect(scene.intExt).toBe("INT");
      expect(scene.setOrLocation).toBe("Kitchen");
      expect(scene.timeOfDay).toBe("DAY");
      expect(scene.pageEighths).toBe(4);
      expect(scene.synopsis).toBe("Characters argue over breakfast.");
    });

    it("maps null fields through", () => {
      const slice = makeSlice();
      slice.scenes = [
        {
          sceneNumber: null,
          intExt: null,
          setOrLocation: null,
          timeOfDay: null,
          pageEighths: null,
          synopsis: null,
        },
      ];
      const result = assembleCallSheet(slice);
      const scene = result.scenes[0];
      expect(scene.sceneNumber).toBeNull();
      expect(scene.pageEighths).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // cast
  // -------------------------------------------------------------------------
  describe("cast", () => {
    it("includes all castPeople entries", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result.cast).toHaveLength(2);
    });

    it("resolves callTime from castDayCall when row exists", () => {
      const result = assembleCallSheet(makeSlice());
      const alice = result.cast.find((r) => r.personId === PERSON_ID_1)!;
      expect(alice.callTime).toBe("09:00");
    });

    it("falls back to general call when no castDayCall row exists", () => {
      const result = assembleCallSheet(makeSlice());
      const bob = result.cast.find((r) => r.personId === PERSON_ID_2)!;
      expect(bob.callTime).toBe("09:00"); // general call time
    });

    it("passes makeup/wardrobe/onSet through from castDayCall", () => {
      const result = assembleCallSheet(makeSlice());
      const alice = result.cast.find((r) => r.personId === PERSON_ID_1)!;
      expect(alice.makeup).toBe("08:00");
      expect(alice.wardrobe).toBe("08:30");
      expect(alice.onSet).toBe("09:30");
    });

    it("makeup/wardrobe/onSet are null when no castDayCall row exists", () => {
      const result = assembleCallSheet(makeSlice());
      const bob = result.cast.find((r) => r.personId === PERSON_ID_2)!;
      expect(bob.makeup).toBeNull();
      expect(bob.wardrobe).toBeNull();
      expect(bob.onSet).toBeNull();
    });

    it("includes characterName and contact details from castPeople", () => {
      const result = assembleCallSheet(makeSlice());
      const alice = result.cast.find((r) => r.personId === PERSON_ID_1)!;
      expect(alice.characterName).toBe("The Protagonist");
      expect(alice.contactEmail).toBe("alice@example.com");
      expect(alice.contactPhone).toBe("555-1001");
    });

    it("characterName null passes through", () => {
      const result = assembleCallSheet(makeSlice());
      const bob = result.cast.find((r) => r.personId === PERSON_ID_2)!;
      expect(bob.characterName).toBeNull();
    });

    it("copies notes from castDayCall", () => {
      const result = assembleCallSheet(makeSlice());
      const alice = result.cast.find((r) => r.personId === PERSON_ID_1)!;
      expect(alice.notes).toBe("Bring blue dress");
    });

    it("notes is null when no castDayCall row exists", () => {
      const result = assembleCallSheet(makeSlice());
      const bob = result.cast.find((r) => r.personId === PERSON_ID_2)!;
      expect(bob.notes).toBeNull();
    });

    it("cast row callTime is null when no castDayCall and no general call time", () => {
      const slice = makeSlice({ location: null });
      slice.callSheet = { ...slice.callSheet, general_call_time: null };
      slice.castDayCalls = []; // remove all cast day calls
      const result = assembleCallSheet(slice);
      expect(result.cast[0].callTime).toBeNull();
      expect(result.cast[1].callTime).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // crew: crewByDepartment
  // -------------------------------------------------------------------------
  describe("crewByDepartment", () => {
    it("only includes crew members who have a crewDayCalls row", () => {
      const result = assembleCallSheet(makeSlice());
      // CREW_ID_3 (Frances Focus, Camera) has no crewDayCalls row → excluded
      const allMembers = result.crewByDepartment.flatMap((b) => b.members);
      expect(allMembers).toHaveLength(2);
      expect(allMembers.find((m) => m.crewMemberId === CREW_ID_3)).toBeUndefined();
    });

    it("groups crew by department", () => {
      const result = assembleCallSheet(makeSlice());
      const departments = result.crewByDepartment.map((b) => b.department);
      expect(departments).toContain("Directing");
      expect(departments).toContain("Electric");
      expect(departments).not.toContain("Camera"); // Frances excluded
    });

    it("sorts departments alphabetically", () => {
      const result = assembleCallSheet(makeSlice());
      const departments = result.crewByDepartment.map((b) => b.department);
      const sorted = [...departments].sort((a, b) => a.localeCompare(b));
      expect(departments).toEqual(sorted);
    });

    it("resolves individual override (CREW_ID_1 has call_time '07:30')", () => {
      const result = assembleCallSheet(makeSlice());
      const dir = result.crewByDepartment.find((b) => b.department === "Directing")!;
      expect(dir.members[0].callTime).toBe("07:30");
    });

    it("cascades to dept call when individual call_time is null (CREW_ID_2)", () => {
      const result = assembleCallSheet(makeSlice());
      const elec = result.crewByDepartment.find((b) => b.department === "Electric")!;
      expect(elec.members[0].callTime).toBe("08:00"); // from dept call
    });

    it("cascades to general call when no individual or dept override", () => {
      // Add a third dept with a member + dayCall but no deptCall, no individual time
      const slice = makeSlice();
      const CREW_ID_4 = "c4000000-0000-0000-0000-000000000004";
      slice.crewMembers = [
        ...slice.crewMembers,
        {
          id: CREW_ID_4,
          project_id: "proj-0000-0000-0000-000000000001",
          person_id: null,
          name: "Greg Grip",
          department: "Grip",
          position: "Key Grip",
          email: null,
          phone: null,
          day_rate: null,
          ordinal: 3,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      slice.crewDayCalls = [
        ...slice.crewDayCalls,
        {
          id: "dc-4000-0000-0000-000000000004",
          shoot_day_id: DAY_ID_B,
          crew_member_id: CREW_ID_4,
          call_time: null, // no individual override
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      // No dept call for Grip → should cascade to general call "09:00"
      const result = assembleCallSheet(slice);
      const grip = result.crewByDepartment.find((b) => b.department === "Grip")!;
      expect(grip.members[0].callTime).toBe("09:00");
    });

    it("callTime is null when no individual, no dept, and no general call", () => {
      const slice = makeSlice();
      slice.callSheet = { ...slice.callSheet, general_call_time: null };
      slice.crewDeptCalls = []; // remove dept calls
      // CREW_ID_1 has call_time "07:30" so override it to null for this test
      slice.crewDayCalls = slice.crewDayCalls.map((dc) =>
        dc.crew_member_id === CREW_ID_1 ? { ...dc, call_time: null } : dc,
      );
      const result = assembleCallSheet(slice);
      const dir = result.crewByDepartment.find((b) => b.department === "Directing")!;
      expect(dir.members[0].callTime).toBeNull();
    });

    it("includes contactPhone and contactEmail from crewMembers", () => {
      const result = assembleCallSheet(makeSlice());
      const dir = result.crewByDepartment.find((b) => b.department === "Directing")!;
      expect(dir.members[0].contactPhone).toBe("555-2001");
      expect(dir.members[0].contactEmail).toBe("dana@example.com");
    });

    it("null phone/email passes through as null", () => {
      const result = assembleCallSheet(makeSlice());
      const elec = result.crewByDepartment.find((b) => b.department === "Electric")!;
      expect(elec.members[0].contactPhone).toBeNull(); // Eddie has no phone
    });

    it("members within a department are sorted by ordinal then name", () => {
      // Add a second member to the Directing department
      const slice = makeSlice();
      const CREW_ID_4 = "c4000000-0000-0000-0000-000000000004";
      slice.crewMembers = [
        ...slice.crewMembers,
        {
          id: CREW_ID_4,
          project_id: "proj-0000-0000-0000-000000000001",
          person_id: null,
          name: "Aaron AD",
          department: "Directing",
          position: "1st AD",
          email: null,
          phone: null,
          day_rate: null,
          ordinal: 5, // higher ordinal than CREW_ID_1 (ordinal 0)
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      slice.crewDayCalls = [
        ...slice.crewDayCalls,
        {
          id: "dc-4000-0000-0000-000000000004",
          shoot_day_id: DAY_ID_B,
          crew_member_id: CREW_ID_4,
          call_time: "07:30",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      const result = assembleCallSheet(slice);
      const dir = result.crewByDepartment.find((b) => b.department === "Directing")!;
      expect(dir.members).toHaveLength(2);
      // CREW_ID_1 ordinal=0 should be first, CREW_ID_4 ordinal=5 second
      expect(dir.members[0].crewMemberId).toBe(CREW_ID_1);
      expect(dir.members[1].crewMemberId).toBe(CREW_ID_4);
    });

    it("crew member with no dayCall row is excluded even if they have a dept call", () => {
      // CREW_ID_3 (Camera, Frances) has no crewDayCall → excluded
      // even if we add a Camera dept call
      const slice = makeSlice();
      slice.crewDeptCalls = [
        ...slice.crewDeptCalls,
        {
          id: "ddc-cam-0000-0000-000000000002",
          shoot_day_id: DAY_ID_B,
          department: "Camera",
          call_time: "07:00",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      const result = assembleCallSheet(slice);
      const cameraDept = result.crewByDepartment.find((b) => b.department === "Camera");
      // Camera dept should not appear since no Camera crew has a dayCall
      expect(cameraDept).toBeUndefined();
    });

    it("returns empty crewByDepartment when no crew has a dayCall", () => {
      const slice = makeSlice({ crewDayCalls: [] });
      const result = assembleCallSheet(slice);
      expect(result.crewByDepartment).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // overall shape
  // -------------------------------------------------------------------------
  describe("overall shape", () => {
    it("returns all four top-level keys", () => {
      const result = assembleCallSheet(makeSlice());
      expect(result).toHaveProperty("header");
      expect(result).toHaveProperty("scenes");
      expect(result).toHaveProperty("cast");
      expect(result).toHaveProperty("crewByDepartment");
    });

    it("is pure: calling twice returns structurally identical objects", () => {
      const slice = makeSlice();
      const r1 = assembleCallSheet(slice);
      const r2 = assembleCallSheet(slice);
      expect(r1).toEqual(r2);
    });
  });
});
