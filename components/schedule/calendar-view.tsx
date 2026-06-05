"use client";

import { useMemo, useState } from "react";
import {
  parseISO,
  isSameMonth,
  format,
  startOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import type { ShootDay } from "@/lib/schedule/schema";
import { monthMatrix } from "./calendar-grid";

// ---------------------------------------------------------------------------
// Configurable, token-based palette
// ---------------------------------------------------------------------------
//
// Color-code each shoot-day chip by its UNIT first (main / second / splinter),
// then fall back to DAY_TYPE. Like strip-palette.ts: every value is a CSS var
// reference into the locked "Tungsten & Sage" system — NEVER a raw hex — so a
// later settings surface can remap per-project without touching this component,
// and chips stay on-theme in both Umber (dark) and Kraft (light).

/** A calendar chip color token. */
interface CalendarColorToken {
  /** CSS var() reference for the chip's accent. */
  cssVar: string;
  /** Human label for a11y / tooltips. */
  label: string;
}

/** Unit → accent token. Keys are the normalized `unit` column values. */
const UNIT_PALETTE: Record<string, CalendarColorToken> = {
  main: { cssVar: "var(--cat-int-day)", label: "Main unit" },
  second: { cssVar: "var(--cat-ext-day)", label: "Second unit" },
  splinter: { cssVar: "var(--cat-int-night)", label: "Splinter unit" },
};

/** Day-type → accent token (fallback when unit isn't a known key). */
const DAY_TYPE_PALETTE: Record<string, CalendarColorToken> = {
  shoot: { cssVar: "var(--cat-int-day)", label: "Shoot day" },
  travel: { cssVar: "var(--cat-ext-night)", label: "Travel day" },
  prep: { cssVar: "var(--cat-ext-day)", label: "Prep day" },
  holiday: { cssVar: "var(--cat-int-night)", label: "Holiday" },
  hiatus: { cssVar: "var(--cat-int-night)", label: "Hiatus" },
};

/** Neutral fallback when neither unit nor day_type resolves. */
const NEUTRAL_TOKEN: CalendarColorToken = {
  cssVar: "var(--tx-3)",
  label: "Shoot day",
};

/** Resolve a shoot day's chip color: unit first, then day_type, then neutral. */
function chipColor(day: ShootDay): CalendarColorToken {
  const byUnit = day.unit ? UNIT_PALETTE[day.unit.toLowerCase()] : undefined;
  if (byUnit) return byUnit;
  const byType = day.day_type
    ? DAY_TYPE_PALETTE[day.day_type.toLowerCase()]
    : undefined;
  return byType ?? NEUTRAL_TOKEN;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface CalendarViewProps {
  /** Dated shoot days (date != null) from getCalendar. */
  shootDays: ShootDay[];
}

/**
 * Read-only month-grid calendar of shoot days (Phase 3, Task 16).
 *
 * SECONDARY surface: the stripboard is where dates are edited (spec decision 8).
 * This view never drags or edits — each shoot-day chip is a click-through link
 * to that day's section on the stripboard (`#shoot-day-<id>`).
 *
 * The default month is derived from the EARLIEST dated shoot day, NOT
 * `new Date()`, so the initial render is deterministic. Prev/next nav is local
 * client state layered on top of that deterministic anchor.
 */
export function CalendarView({ shootDays }: CalendarViewProps) {
  // Parse dates once; index shoot days by their ISO date string for O(1) cell
  // lookup. A single calendar date can carry MULTIPLE shoot days (e.g. main +
  // second unit), so each bucket is a list.
  const { datedDays, earliestMonth } = useMemo(() => {
    const dated = shootDays
      .filter((d): d is ShootDay & { date: string } => d.date !== null)
      .map((d) => ({ day: d, parsed: parseISO(d.date) }))
      .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());

    const earliest = dated.length > 0 ? startOfMonth(dated[0].parsed) : null;
    return { datedDays: dated, earliestMonth: earliest };
  }, [shootDays]);

  const daysByCell = useMemo(() => {
    const map = new Map<string, ShootDay[]>();
    for (const { day } of datedDays) {
      const key = day.date as string;
      const bucket = map.get(key) ?? [];
      bucket.push(day);
      map.set(key, bucket);
    }
    return map;
  }, [datedDays]);

  // Local month nav. Anchor is the earliest dated month (deterministic); if
  // there are no dated days we render the empty state and never reach the grid.
  const [viewMonth, setViewMonth] = useState<Date | null>(earliestMonth);

  if (!earliestMonth || !viewMonth) {
    return (
      <section
        aria-label="Shoot calendar"
        className="rounded-xl border border-dashed border-[var(--line-2)] bg-[var(--s1)] p-8 text-center"
      >
        <p className="text-sm text-[var(--tx-3)]">
          No dated shoot days yet. Assign dates on the board and they&rsquo;ll
          appear here.
        </p>
      </section>
    );
  }

  const weeks = monthMatrix(viewMonth.getFullYear(), viewMonth.getMonth());

  return (
    <section
      aria-label="Shoot calendar"
      className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--s2)]"
    >
      {/* Month nav */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <h2 className="font-display text-sm font-extrabold tracking-[-0.2px] text-[var(--tx)]">
          {format(viewMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label="Previous month"
            onClick={() => setViewMonth((m) => (m ? subMonths(m, 1) : m))}
          >
            ‹ Prev
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Jump to first shoot month"
            onClick={() => setViewMonth(earliestMonth)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label="Next month"
            onClick={() => setViewMonth((m) => (m ? addMonths(m, 1) : m))}
          >
            Next ›
          </Button>
        </div>
      </header>

      {/* Weekday header row */}
      <div className="grid grid-cols-7 border-b border-[var(--line)]">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => {
          const inMonth = isSameMonth(date, viewMonth);
          const iso = format(date, "yyyy-MM-dd");
          const cellDays = daysByCell.get(iso) ?? [];

          return (
            <div
              key={iso}
              className={`min-h-[88px] border-b border-r border-[var(--line)] p-1.5 last:border-r-0 ${
                inMonth ? "bg-[var(--s2)]" : "bg-[var(--s1)]"
              }`}
            >
              <div
                className={`mb-1 px-0.5 text-right text-[11px] font-medium tabular-nums ${
                  inMonth ? "text-[var(--tx-2)]" : "text-[var(--tx-3)]"
                }`}
              >
                {format(date, "d")}
              </div>

              <div className="space-y-1">
                {cellDays.map((day) => {
                  const token = chipColor(day);
                  const title = `${day.name ?? `Day ${day.ordinal + 1}`} · ${
                    day.day_type
                  }${day.unit && day.unit !== "main" ? ` · ${day.unit}` : ""}`;
                  return (
                    <a
                      key={day.id}
                      href={`#shoot-day-${day.id}`}
                      title={title}
                      aria-label={`Go to ${title} on the board`}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--s1)] px-1.5 py-1 text-[11px] leading-tight text-[var(--tx)] transition-colors hover:bg-[var(--brand-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: token.cssVar }}
                      />
                      <span className="truncate font-medium">
                        {day.name ?? `Day ${day.ordinal + 1}`}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
