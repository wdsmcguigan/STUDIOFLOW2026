// ---------------------------------------------------------------------------
// Unit tests for computeSunTimes — PURE, no DB, no IO
// These tests are TZ-independent because computeSunTimes uses UTC formatting.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { computeSunTimes } from "./sun";

// Known location: Los Angeles, CA
const LA_LAT = 34.05;
const LA_LNG = -118.24;
const TEST_DATE = "2026-09-01";

// London is used for the sunrise < sunset ordering test because LA's UTC sunset
// wraps past midnight UTC (PDT = UTC-7), so "02:20" < "13:27" string-wise,
// which would flip the comparison. London stays within the same UTC calendar day.
const LON_LAT = 51.5;
const LON_LNG = -0.12;

describe("computeSunTimes", () => {
  // -------------------------------------------------------------------------
  // Null / missing coordinates
  // -------------------------------------------------------------------------
  it("returns null when latitude is null", () => {
    expect(computeSunTimes(null, LA_LNG, TEST_DATE)).toBeNull();
  });

  it("returns null when longitude is null", () => {
    expect(computeSunTimes(LA_LAT, null, TEST_DATE)).toBeNull();
  });

  it("returns null when both lat and lng are null", () => {
    expect(computeSunTimes(null, null, TEST_DATE)).toBeNull();
  });

  it("returns null when latitude is undefined", () => {
    expect(computeSunTimes(undefined, LA_LNG, TEST_DATE)).toBeNull();
  });

  it("returns null when longitude is undefined", () => {
    expect(computeSunTimes(LA_LAT, undefined, TEST_DATE)).toBeNull();
  });

  it("returns null when both lat and lng are undefined", () => {
    expect(computeSunTimes(undefined, undefined, TEST_DATE)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Valid coordinates — format checks
  // -------------------------------------------------------------------------
  it("returns an object with sunrise and sunset strings for valid coords", () => {
    const result = computeSunTimes(LA_LAT, LA_LNG, TEST_DATE);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("sunrise");
    expect(result).toHaveProperty("sunset");
  });

  it("formats sunrise as HH:mm", () => {
    const result = computeSunTimes(LA_LAT, LA_LNG, TEST_DATE);
    expect(result!.sunrise).toMatch(/^\d\d:\d\d$/);
  });

  it("formats sunset as HH:mm", () => {
    const result = computeSunTimes(LA_LAT, LA_LNG, TEST_DATE);
    expect(result!.sunset).toMatch(/^\d\d:\d\d$/);
  });

  it("sunrise comes before sunset (string compare of UTC HH:mm)", () => {
    // Use London: UTC sunrise ~05:14, UTC sunset ~18:50 on 2026-09-01.
    // Both are on the same UTC calendar day so string "HH:mm" compare is valid.
    // (LA can't be used here because LA's UTC sunset wraps past midnight UTC.)
    const result = computeSunTimes(LON_LAT, LON_LNG, TEST_DATE);
    expect(result).not.toBeNull();
    expect(result!.sunrise < result!.sunset).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Determinism
  // -------------------------------------------------------------------------
  it("returns equal values when called twice with the same args", () => {
    const r1 = computeSunTimes(LA_LAT, LA_LNG, TEST_DATE);
    const r2 = computeSunTimes(LA_LAT, LA_LNG, TEST_DATE);
    expect(r1).toEqual(r2);
  });

  // -------------------------------------------------------------------------
  // Edge: southern hemisphere (Sydney, AU) — still valid, format only
  // -------------------------------------------------------------------------
  it("handles southern hemisphere coordinates", () => {
    const result = computeSunTimes(-33.87, 151.21, TEST_DATE); // Sydney
    expect(result).not.toBeNull();
    expect(result!.sunrise).toMatch(/^\d\d:\d\d$/);
    expect(result!.sunset).toMatch(/^\d\d:\d\d$/);
  });

  // -------------------------------------------------------------------------
  // Edge: different date (winter solstice) — still valid
  // -------------------------------------------------------------------------
  it("handles winter solstice date", () => {
    const result = computeSunTimes(LA_LAT, LA_LNG, "2026-12-21");
    expect(result).not.toBeNull();
    expect(result!.sunrise).toMatch(/^\d\d:\d\d$/);
    expect(result!.sunset).toMatch(/^\d\d:\d\d$/);
  });
});
