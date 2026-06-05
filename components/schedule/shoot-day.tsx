"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import type { Strip as StripRow, ShootDay as ShootDayRow } from "@/lib/schedule/schema";
import { Strip, type SceneLabel } from "./strip";

/** A scene available to add to a day (id + readable label). */
export interface SceneOption {
  id: string;
  label: string;
}

interface ShootDayProps {
  day: ShootDayRow;
  strips: StripRow[];
  /** segment.scene_id → scene label, resolved server-side. */
  sceneLabelByStripId: Record<string, SceneLabel>;
  /** page-eighths total for this day (already in 1/8 units). */
  eighths: number;
  /** scenes the user can add (for the add-scene control). */
  sceneOptions: SceneOption[];
  projectId: string;
  setShootDayDateAction: (formData: FormData) => Promise<void>;
  addSceneToDayAction: (formData: FormData) => Promise<void>;
  insertDayBreakAction: (formData: FormData) => Promise<void>;
  insertBannerAction: (formData: FormData) => Promise<void>;
  deleteStripAction: (formData: FormData) => Promise<void>;
}

/** Render page-eighths total as "X 3/8 pg". */
function formatEighths(eighths: number): string {
  if (eighths <= 0) return "0 pg";
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole === 0) return `${rem}/8 pg`;
  if (rem === 0) return `${whole} pg`;
  return `${whole} ${rem}/8 pg`;
}

/**
 * One shoot day: header (name/type/date + eighths rollup), the sortable strip
 * list (a droppable container), and the add / insert controls. The day is
 * always a valid drop target — even when empty — via useDroppable, so a strip
 * can be moved into a day that has no strips yet.
 */
export function ShootDay({
  day,
  strips,
  sceneLabelByStripId,
  eighths,
  sceneOptions,
  projectId,
  setShootDayDateAction,
  addSceneToDayAction,
  insertDayBreakAction,
  insertBannerAction,
  deleteStripAction,
}: ShootDayProps) {
  // Empty-day drop target: the SortableContext alone can't catch a drop when
  // it has no items, so the container itself is a droppable keyed by day id.
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${day.id}`,
    data: { type: "day", shootDayId: day.id },
  });

  const stripIds = strips.map((s) => s.id);
  const sceneCount = strips.filter((s) => s.type === "scene").length;

  return (
    <section
      // Anchor target for the calendar view's click-through chips
      // (#shoot-day-<id>). scroll-mt keeps the day clear of any sticky header.
      id={`shoot-day-${day.id}`}
      aria-label={day.name ?? `Shoot day ${day.ordinal + 1}`}
      className="scroll-mt-20 rounded-xl border border-[var(--line)] bg-[var(--s2)]"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-sm font-extrabold tracking-[-0.2px] text-[var(--tx)]">
            {day.name ?? `Day ${day.ordinal + 1}`}
          </h2>
          <span className="rounded bg-[var(--s1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            {day.day_type}
            {day.unit && day.unit !== "main" ? ` · ${day.unit}` : ""}
          </span>
        </div>

        {/* Date assignment */}
        <form action={setShootDayDateAction} className="flex items-center gap-1.5">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="id" value={day.id} />
          <input
            type="date"
            name="date"
            defaultValue={day.date ?? ""}
            aria-label="Shoot date"
            className="h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <Button type="submit" variant="ghost" size="xs">
            Set
          </Button>
        </form>

        {/* Eighths rollup */}
        <div className="ml-auto flex items-center gap-3 text-xs text-[var(--tx-3)]">
          <span>
            {sceneCount} {sceneCount === 1 ? "scene" : "scenes"}
          </span>
          <span className="font-mono font-semibold text-[var(--tx-2)]">
            {formatEighths(eighths)}
          </span>
        </div>
      </header>

      {/* Strip list — droppable + sortable */}
      <div
        ref={setNodeRef}
        className={`min-h-[44px] space-y-1.5 p-3 transition-colors ${
          isOver ? "bg-[var(--brand-soft)]" : ""
        }`}
      >
        <SortableContext items={stripIds} strategy={verticalListSortingStrategy}>
          {strips.length === 0 ? (
            <p className="px-1 py-2 text-center text-xs text-[var(--tx-3)]">
              No strips yet — add a scene below, or drag one here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {strips.map((strip) => (
                <Strip
                  key={strip.id}
                  strip={strip}
                  scene={sceneLabelByStripId[strip.id]}
                  projectId={projectId}
                  deleteStripAction={deleteStripAction}
                />
              ))}
            </ul>
          )}
        </SortableContext>
      </div>

      {/* Controls */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] px-3 py-2.5">
        {/* Add scene */}
        <form action={addSceneToDayAction} className="flex items-center gap-1.5">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="shootDayId" value={day.id} />
          <select
            name="sceneId"
            required
            defaultValue=""
            aria-label="Scene to add"
            className="h-7 max-w-[220px] rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <option value="" disabled>
              Add scene…
            </option>
            {sceneOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="ember" size="xs">
            Add
          </Button>
        </form>

        {/* Insert day break */}
        <form action={insertDayBreakAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="shootDayId" value={day.id} />
          <Button type="submit" variant="outline" size="xs">
            + Day break
          </Button>
        </form>

        {/* Insert banner */}
        <form action={insertBannerAction} className="flex items-center gap-1.5">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="shootDayId" value={day.id} />
          <input
            type="text"
            name="bannerText"
            required
            maxLength={500}
            placeholder="Banner text"
            aria-label="Banner text"
            className="h-7 w-[140px] rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <Button type="submit" variant="outline" size="xs">
            + Banner
          </Button>
        </form>
      </footer>
    </section>
  );
}
