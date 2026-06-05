"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Strip as StripRow, ShootDay as ShootDayRow, EighthsRollup } from "@/lib/schedule/schema";
import { ShootDay, type SceneOption } from "./shoot-day";
import type { SceneLabel } from "./strip";

interface StripboardProps {
  shootDays: ShootDayRow[];
  /** strips grouped by shoot_day_id, each group ordered by ordinal (server). */
  stripsByDay: Record<string, StripRow[]>;
  eighths: EighthsRollup[];
  /** strip.id → resolved scene label (scene strips only). */
  sceneLabelByStripId: Record<string, SceneLabel>;
  /** scenes available to add to a day. */
  sceneOptions: SceneOption[];
  projectId: string;
  setShootDayDateAction: (formData: FormData) => Promise<void>;
  addSceneToDayAction: (formData: FormData) => Promise<void>;
  insertDayBreakAction: (formData: FormData) => Promise<void>;
  insertBannerAction: (formData: FormData) => Promise<void>;
  deleteStripAction: (formData: FormData) => Promise<void>;
  reorderStripsAction: (formData: FormData) => Promise<void>;
}

/** Resolve which day a droppable/sortable id belongs to, given current state. */
function findDayOfStrip(
  byDay: Record<string, StripRow[]>,
  stripId: string,
): string | null {
  for (const [dayId, strips] of Object.entries(byDay)) {
    if (strips.some((s) => s.id === stripId)) return dayId;
  }
  return null;
}

/**
 * The stripboard. Renders getStripboard output and captures drag input.
 *
 * dnd-kit multiple-containers wiring:
 * - each ShootDay is a droppable container (id `day:<dayId>`) AND a
 *   SortableContext over its strip ids;
 * - drag REORDER is within a single day (the provided reorderStripsAction only
 *   renumbers ordinals; it has no shoot_day_id move). A drop onto a different
 *   day is ignored rather than faked — re-homing a strip across days needs a
 *   move action that isn't in this task's surface, so we don't pretend.
 * - onDragEnd persists the affected day via reorderStripsAction.
 *
 * NON-DESTRUCTIVE GUARANTEE (the StudioBinder data-loss bug we design against):
 * day_break and banner strips are REAL rows with ordinals. The day's bucket we
 * reorder includes EVERY strip type — we never filter day_breaks/banners out.
 * So the orderedIds we send to reorderStripsAction always contain them, and
 * their ordinals are renumbered in place. Reordering scene strips around a day
 * break keeps the day break exactly where it sits in the sequence.
 */
export function Stripboard({
  shootDays,
  stripsByDay,
  eighths,
  sceneLabelByStripId,
  sceneOptions,
  projectId,
  setShootDayDateAction,
  addSceneToDayAction,
  insertDayBreakAction,
  insertBannerAction,
  deleteStripAction,
  reorderStripsAction,
}: StripboardProps) {
  // Local, optimistic copy of the grouping. Server state re-seeds via the
  // `key` on this component when the page revalidates after an action.
  const [byDay, setByDay] = useState<Record<string, StripRow[]>>(() => {
    // Ensure every shoot day has a bucket (even empty ones — drop targets).
    const seeded: Record<string, StripRow[]> = {};
    for (const d of shootDays) seeded[d.id] = stripsByDay[d.id] ?? [];
    return seeded;
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const eighthsByDay = new Map(eighths.map((e) => [e.shootDayId, e.eighths]));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeStripId = String(active.id);
    const overId = String(over.id);

    // Cross-day drops are intentionally ignored (see component doc): the
    // reorder action has no shoot_day_id move, so we never fake re-homing.
    const fromDay = findDayOfStrip(byDay, activeStripId);
    const overDay = overId.startsWith("day:")
      ? overId.slice("day:".length)
      : findDayOfStrip(byDay, overId);
    if (!fromDay || fromDay !== overDay) return;

    // Compute the final layout functionally so we read the freshest state.
    // `finalState` is captured for persistence after the updater runs.
    let finalState: Record<string, StripRow[]> = byDay;
    setByDay((prev) => {
      const dayId = findDayOfStrip(prev, activeStripId);
      if (!dayId) {
        finalState = prev;
        return prev;
      }
      // Same-day reorder: arrayMove within the day's bucket.
      if (!overId.startsWith("day:")) {
        const dayStrips = prev[dayId] ?? [];
        const oldIndex = dayStrips.findIndex((s) => s.id === activeStripId);
        const newIndex = dayStrips.findIndex((s) => s.id === overId);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          const next = { ...prev, [dayId]: arrayMove(dayStrips, oldIndex, newIndex) };
          finalState = next;
          return next;
        }
      }
      finalState = prev;
      return prev;
    });

    // Persist every day whose order differs from the server snapshot. The
    // orderedIds for each day include EVERY strip type (scene + day_break +
    // banner) — day breaks/banners are NEVER filtered out, so reordering scene
    // strips around them renumbers ordinals in place and preserves the rows.
    const affectedDays = new Set<string>();
    const allDayIds = new Set([
      ...Object.keys(finalState),
      ...Object.keys(stripsByDay),
    ]);
    for (const d of allDayIds) {
      const before = (stripsByDay[d] ?? []).map((s) => s.id).join(",");
      const after = (finalState[d] ?? []).map((s) => s.id).join(",");
      if (before !== after) affectedDays.add(d);
    }

    for (const d of affectedDays) {
      const orderedIds = (finalState[d] ?? []).map((s) => s.id);
      if (orderedIds.length === 0) continue;
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("orderedIds", orderedIds.join(","));
      await reorderStripsAction(fd);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4" data-active-strip={activeId ?? undefined}>
        {shootDays.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line-2)] bg-[var(--s1)] p-8 text-center text-sm text-[var(--tx-3)]">
            No shoot days yet. Create one above to start building the board.
          </p>
        ) : (
          shootDays.map((day) => (
            <ShootDay
              key={day.id}
              day={day}
              strips={byDay[day.id] ?? []}
              sceneLabelByStripId={sceneLabelByStripId}
              eighths={eighthsByDay.get(day.id) ?? 0}
              sceneOptions={sceneOptions}
              projectId={projectId}
              setShootDayDateAction={setShootDayDateAction}
              addSceneToDayAction={addSceneToDayAction}
              insertDayBreakAction={insertDayBreakAction}
              insertBannerAction={insertBannerAction}
              deleteStripAction={deleteStripAction}
            />
          ))
        )}
      </div>
    </DndContext>
  );
}
