import Link from "next/link";
import type { ShootDay } from "@/lib/schedule/schema";

/**
 * DayPicker — horizontal dated-day selector for the call sheet page.
 *
 * Each dated shoot day renders as a link to `?day=<id>`. The selected day
 * receives the amber active treatment (brand-soft bg + brand-on text + amber
 * left-spine glow) matching the nav item convention.
 *
 * Server component — no state; selection is driven by the URL searchParam.
 * Undated shoot days are excluded (they have no date, so no call sheet context).
 */

interface DayPickerProps {
  /** All dated shoot days for this project, sorted by ordinal. */
  shootDays: ShootDay[];
  /** The currently selected shoot day id (from searchParams.day). */
  selectedDayId: string | null;
  /** Base path (without ?day=…) — used to build the hrefs. */
  basePath: string;
}

/** Format an ISO date string ("yyyy-MM-dd") as a short human label. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Capitalize the first letter of a day_type string. */
function formatDayType(dayType: string): string {
  return dayType.charAt(0).toUpperCase() + dayType.slice(1);
}

export function DayPicker({ shootDays, selectedDayId, basePath }: DayPickerProps) {
  // Only dated days appear in the picker.
  const datedDays = shootDays.filter((d) => d.date !== null);

  if (datedDays.length === 0) {
    return (
      <p className="text-sm text-[var(--tx-3)]">No dated shoot days yet.</p>
    );
  }

  return (
    <nav aria-label="Shoot day picker" className="flex flex-wrap gap-2">
      {datedDays.map((day, idx) => {
        const isActive = day.id === selectedDayId;
        const dayNumber = idx + 1;

        return (
          <Link
            key={day.id}
            href={`${basePath}?day=${day.id}`}
            aria-current={isActive ? "page" : undefined}
            className={[
              "relative flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
              isActive
                ? "border-[var(--brand-line)] bg-[var(--brand-soft)]"
                : "border-[var(--line)] bg-card hover:bg-muted/40",
            ].join(" ")}
          >
            {/* Amber left-spine on active — matches nav active convention */}
            {isActive && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-[3px]"
                style={{
                  background: "var(--brand)",
                  boxShadow: "0 0 9px var(--brand)",
                }}
              />
            )}

            {/* Day number */}
            <span
              className={[
                "text-[10px] font-bold uppercase tracking-[0.6px]",
                isActive ? "text-[var(--brand-on)]" : "text-[var(--tx-3)]",
              ].join(" ")}
            >
              Day {dayNumber}
            </span>

            {/* Date */}
            <span
              className={[
                "text-sm font-semibold",
                isActive ? "text-[var(--brand-on)]" : "text-[var(--tx)]",
              ].join(" ")}
            >
              {formatDate(day.date!)}
            </span>

            {/* Day type */}
            <span
              className={[
                "text-[11px]",
                isActive ? "text-[var(--brand-on)]/80" : "text-[var(--tx-3)]",
              ].join(" ")}
            >
              {formatDayType(day.day_type)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
