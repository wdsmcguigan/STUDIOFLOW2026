// ---------------------------------------------------------------------------
// Call-time cascade engine — PURE
// No Date, no DB, no IO, no side effects.
//
// Cascade rule (most-specific wins):
//   individual dayCall.call_time > dept call > general call > null
//
// Inline "*Like" structural types decouple from DB/Zod row shapes so:
//   - tests use plain objects (no schema import needed)
//   - a column rename never ripples into pure logic
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Minimal structural input types ("*Like" pattern)
// ---------------------------------------------------------------------------

/** Minimal shape of a crew member needed to resolve its call time. */
interface CrewMemberLike {
  department: string;
}

/**
 * Minimal shape of a crew_day_calls row (the per-member override).
 * null/undefined means no row exists for this member on this day.
 */
interface CrewDayCallLike {
  call_time: string | null;
}

/**
 * Minimal shape of a cast_day_calls row.
 * null/undefined means no row exists for this cast member on this day.
 */
interface CastDayCallLike {
  call_time: string | null;
  makeup_time: string | null;
  wardrobe_time: string | null;
  on_set_time: string | null;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface CastCallTimes {
  callTime: string | null;
  makeup: string | null;
  wardrobe: string | null;
  onSet: string | null;
}

// ---------------------------------------------------------------------------
// resolveCrewCallTime
// Pure: determine the effective call time for one crew member on one shoot day.
//
// Cascade (most-specific wins):
//   1. dayCall?.call_time  — individual override row
//   2. deptCallByDept[member.department]  — department-level row
//   3. generalCallTime  — shoot-day general call
//   4. null
//
// A non-null dayCall.call_time wins unconditionally.  A row existing with
// call_time = null (e.g. member is on the sheet but has no specific time)
// intentionally falls through to the next level rather than forcing null.
// ---------------------------------------------------------------------------

export function resolveCrewCallTime(
  member: CrewMemberLike,
  dayCall: CrewDayCallLike | null | undefined,
  deptCallByDept: Record<string, string>,
  generalCallTime: string | null,
): string | null {
  return (
    dayCall?.call_time ??
    deptCallByDept[member.department] ??
    generalCallTime ??
    null
  );
}

// ---------------------------------------------------------------------------
// resolveCastCallTime
// Pure: determine the effective call + makeup/wardrobe/on-set times for one
// cast member on one shoot day.
//
// callTime: castDayCall?.call_time ?? generalCallTime ?? null
// makeup/wardrobe/onSet: pass through from castDayCall (or null if no row)
//
// Rationale: only the main call_time participates in the general-call fallback;
// the ancillary times (makeup, wardrobe, on-set) are cast-specific and have no
// general equivalent, so they are either present or null.
// ---------------------------------------------------------------------------

export function resolveCastCallTime(
  castDayCall: CastDayCallLike | null | undefined,
  generalCallTime: string | null,
): CastCallTimes {
  return {
    callTime: castDayCall?.call_time ?? generalCallTime ?? null,
    makeup: castDayCall?.makeup_time ?? null,
    wardrobe: castDayCall?.wardrobe_time ?? null,
    onSet: castDayCall?.on_set_time ?? null,
  };
}
