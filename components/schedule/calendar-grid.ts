// Pure month-grid math for the read-only calendar view.
//
// WHY a separate, pure module: the calendar component renders a 6-or-5-week
// grid of dates. The date math (which days fall in which week row) is the only
// genuinely testable logic in Task 16, so it lives here as a pure function with
// no React, no I/O, no `new Date()` baked into module scope — callers pass the
// year/month they want. That keeps it deterministic and unit-testable.
//
// Uses date-fns (already installed) for the month/week boundary math so we
// inherit its locale-correct, DST-safe interval handling rather than rolling
// our own.

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";

/**
 * Build the calendar matrix for a given month: full weeks (rows of 7 days)
 * spanning from the start of the week containing the 1st through the end of the
 * week containing the last day of the month.
 *
 * - `month` is 0-indexed (0 = January, 11 = December), matching JS Date.
 * - `weekStartsOn` follows date-fns (0 = Sunday … 6 = Saturday); defaults to
 *   Sunday so the grid matches the weekday-header order the component renders.
 *
 * Every returned row is exactly 7 days; leading/trailing days belong to the
 * adjacent months (the component mutes them). Returns 5 or 6 rows depending on
 * how the month falls.
 */
export function monthMatrix(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0,
): Date[][] {
  const anchor = new Date(year, month, 1);
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}
