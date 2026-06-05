import { describe, it, expect } from "vitest";
import { monthMatrix } from "@/components/schedule/calendar-grid";

describe("monthMatrix", () => {
  it("returns rows of exactly 7 days", () => {
    const weeks = monthMatrix(2026, 5); // June 2026
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("covers every day of the requested month", () => {
    // June 2026 has 30 days; all of them must appear somewhere in the grid.
    const weeks = monthMatrix(2026, 5);
    const flat = weeks.flat();
    for (let d = 1; d <= 30; d++) {
      const present = flat.some(
        (day) =>
          day.getFullYear() === 2026 &&
          day.getMonth() === 5 &&
          day.getDate() === d,
      );
      expect(present).toBe(true);
    }
  });

  it("starts the grid on the configured week start (Sunday by default)", () => {
    const weeks = monthMatrix(2026, 5); // June 1 2026 is a Monday
    expect(weeks[0][0].getDay()).toBe(0); // Sunday
    // Last cell of the last row is a Saturday.
    const lastRow = weeks[weeks.length - 1];
    expect(lastRow[6].getDay()).toBe(6);
  });

  it("honors a Monday week start", () => {
    const weeks = monthMatrix(2026, 5, 1);
    expect(weeks[0][0].getDay()).toBe(1); // Monday
    const lastRow = weeks[weeks.length - 1];
    expect(lastRow[6].getDay()).toBe(0); // Sunday
  });

  it("pads with adjacent-month days so the first row is full", () => {
    // February 2026 starts on a Sunday, so the first row needs no leading pad,
    // but the grid must still be full weeks. Use January 2026 (starts Thursday)
    // to force leading days from December 2025.
    const weeks = monthMatrix(2026, 0); // January 2026
    const firstCell = weeks[0][0];
    // First visible cell precedes Jan 1 — belongs to the prior month.
    expect(firstCell.getMonth()).not.toBe(0);
  });
});
