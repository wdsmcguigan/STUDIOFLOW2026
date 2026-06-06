/**
 * TDD render tests for the call-sheet PDF document.
 *
 * Tests that renderCallSheetPdf produces a real PDF buffer (%PDF header)
 * for both a fully-populated fixture and a minimal/empty fixture.
 * No snapshot assertions — content changes over time; the %PDF check proves
 * react-pdf ran to completion without throwing.
 */

import { describe, it, expect } from "vitest";
import { renderCallSheetPdf } from "./call-sheet-document";
import type { AssembledCallSheet } from "@/lib/callsheet/schema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullFixture: AssembledCallSheet = {
  header: {
    production: "Test Feature Film",
    dayNumber: 3,
    dayCount: 20,
    date: "2026-06-06",
    generalCallTime: "07:00",
    sunrise: "05:42",
    sunset: "20:18",
    weather: "Sunny, 72°F",
    hospitalName: "Cedars-Sinai Medical Center",
    hospitalAddress: "8700 Beverly Blvd, Los Angeles, CA 90048",
    notes: "Please arrive 15 minutes early for parking.",
    revision: 2,
  },
  scenes: [
    {
      sceneNumber: "14A",
      intExt: "INT",
      setOrLocation: "Detective's Office",
      timeOfDay: "DAY",
      pageEighths: 6,
      synopsis: "Detective discovers the clue in the filing cabinet.",
    },
  ],
  cast: [
    {
      personId: "11111111-1111-1111-1111-111111111111",
      name: "Jane Smith",
      characterName: "Detective Reyes",
      callTime: "07:30",
      makeup: "06:30",
      wardrobe: "07:00",
      onSet: "07:30",
      contactPhone: "555-0100",
      contactEmail: "jane@example.com",
      notes: null,
    },
  ],
  crewByDepartment: [
    {
      department: "Camera",
      members: [
        {
          crewMemberId: "22222222-2222-2222-2222-222222222222",
          name: "Bob Lee",
          position: "Director of Photography",
          callTime: "06:30",
          contactPhone: "555-0200",
          contactEmail: "bob@example.com",
        },
      ],
    },
  ],
};

const emptyFixture: AssembledCallSheet = {
  header: {
    production: "Empty Production",
    dayNumber: 1,
    dayCount: 1,
    date: null,
    generalCallTime: null,
    sunrise: null,
    sunset: null,
    weather: null,
    hospitalName: null,
    hospitalAddress: null,
    notes: null,
    revision: 0,
  },
  scenes: [],
  cast: [],
  crewByDepartment: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderCallSheetPdf", () => {
  it("returns a Buffer whose first bytes are %PDF for a fully-populated call sheet", async () => {
    const buf = await renderCallSheetPdf(fullFixture);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    // All valid PDFs start with the magic bytes %PDF
    expect(buf.toString("latin1", 0, 4)).toBe("%PDF");
  });

  it("returns a valid PDF buffer even when scenes, cast, and crew are all empty (no throw)", async () => {
    const buf = await renderCallSheetPdf(emptyFixture);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.toString("latin1", 0, 4)).toBe("%PDF");
  });
});
