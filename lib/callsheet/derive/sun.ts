// ---------------------------------------------------------------------------
// computeSunTimes — PURE
// No Date.now(), no argless new Date(), no DB, no IO, no side effects.
//
// The ONLY use of `new Date()` constructs a Date from the caller-supplied
// `dateISO` string (deterministic w.r.t. inputs). This keeps the function
// pure: same args → same output, regardless of when or where it runs.
//
// Local-time approximation: the production graph has no timezone field, only
// lat/long. We approximate the location's local wall-clock by shifting the UTC
// instant by Math.round(longitude / 15) hours, then formatting with the UTC
// getters. This yields a sensible call-sheet time (±1h around DST/boundaries)
// instead of a misleading raw-UTC time, and stays fully deterministic/pure.
// (A real per-location timezone is a later seam.)
// ---------------------------------------------------------------------------

import SunCalc from "suncalc";

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

/**
 * Compute sunrise and sunset times (UTC, "HH:mm") for a given location and date.
 *
 * @param latitude  - Decimal degrees. Null/undefined → returns null.
 * @param longitude - Decimal degrees. Null/undefined → returns null.
 * @param dateISO   - ISO date string "YYYY-MM-DD". The noon-UTC instant is
 *                    constructed from this value (deterministic from input).
 * @returns `{ sunrise, sunset }` formatted as "HH:mm" approximate LOCAL solar
 *          time (longitude-derived offset), or null if coords are missing or
 *          SunCalc yields an invalid date (polar day/night).
 */
export function computeSunTimes(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  dateISO: string,
): SunTimes | null {
  if (latitude == null || longitude == null) {
    return null;
  }

  // Deterministic Date from the caller-supplied dateISO — NOT Date.now().
  // Using noon UTC avoids DST/date-boundary edge cases in suncalc's internals.
  const noon = new Date(dateISO + "T12:00:00Z");

  const t = SunCalc.getTimes(noon, latitude, longitude);

  // Guard against polar day/night (suncalc returns Invalid Date for those).
  if (isNaN(t.sunrise.getTime()) || isNaN(t.sunset.getTime())) {
    return null;
  }

  // Approximate the location's local wall-clock from longitude (15° per hour),
  // then format with UTC getters → deterministic, sensible local-ish time.
  const offsetMs = Math.round(longitude / 15) * 3_600_000;

  return {
    sunrise: formatUTC(new Date(t.sunrise.getTime() + offsetMs)),
    sunset: formatUTC(new Date(t.sunset.getTime() + offsetMs)),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Format a Date as "HH:mm" using UTC components (zero-padded). */
function formatUTC(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, "0");
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
