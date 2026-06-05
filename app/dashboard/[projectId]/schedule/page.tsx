import { createClient } from "@/lib/supabase/server";
import { getStripboard, getConflicts, getDOOD, getCalendar } from "@/lib/schedule/data";
import { listPeople, listElements } from "@/lib/breakdown/data";
import { Button } from "@/components/ui/button";
import { Stripboard } from "@/components/schedule/stripboard";
import { CalendarView } from "@/components/schedule/calendar-view";
import { ConflictPanel } from "@/components/schedule/conflict-panel";
import { DoodGrid } from "@/components/schedule/dood-grid";
import type { SceneLabel } from "@/components/schedule/strip";
import type { SceneOption } from "@/components/schedule/shoot-day";
import {
  createShootDayAction,
  setShootDayDateAction,
  addSceneToDayAction,
  insertDayBreakAction,
  insertBannerAction,
  deleteStripAction,
  reorderStripsAction,
  setCastOverrideAction,
} from "./actions";

/**
 * Schedule (stripboard) page — server component.
 *
 * Loads the derived stripboard (getStripboard) plus a light scene-label map so
 * scene strips can show scene number / INT-EXT / location / time / eighths.
 * Strip color comes from the configurable palette (INT/EXT × time → token).
 *
 * Thin client / smart server: the board renders this output and captures drag
 * input → calls server actions. No business logic lives in the client.
 */
export default async function SchedulePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Derived board (shoot days, strips-by-day, eighths rollup, moves) plus the
  // two other read-only derivation surfaces: conflicts and the DOOD grid. All
  // three are derived-on-read by the pure engine — nothing here is persisted.
  const [board, conflicts, dood, calendarDays, people, elements] = await Promise.all([
    getStripboard(supabase as never, projectId),
    getConflicts(supabase as never, projectId),
    getDOOD(supabase as never, projectId),
    // Dated shoot days for the read-only calendar month grid (Task 16).
    getCalendar(supabase as never, projectId),
    // Label sources: the engine returns ids (person_id / element_id); we resolve
    // human names here, server-side, and pass label maps down to the panels.
    listPeople(supabase as never, projectId),
    listElements(supabase as never, projectId),
  ]);

  // person_id → name (cast + cast_status conflicts, DOOD rows).
  const personLabels: Record<string, string> = {};
  for (const p of people) personLabels[p.id] = p.name;

  // element_id → name (element conflicts).
  const elementLabels: Record<string, string> = {};
  for (const e of elements) elementLabels[e.id] = e.name;

  // Stable DOOD columns: the dated shoot days (ascending). Undated days have no
  // calendar position, so they never appear as columns.
  const doodDates = board.shootDays
    .map((d) => d.date)
    .filter((d): d is string => d !== null)
    .sort((a, b) => a.localeCompare(b));

  // Scene-label resolution: walk strip.scene_segment_id → segment.scene_id →
  // scene. Two project-scoped reads (RLS-enforced); kept simple for v1.
  const [{ data: segRows }, { data: sceneRows }] = await Promise.all([
    supabase
      .from("scene_segments")
      .select("id, scene_id")
      .eq("project_id", projectId),
    supabase
      .from("scenes")
      .select("id, scene_number, int_ext, location_slug, time_of_day, page_eighths, ordinal, status")
      .eq("project_id", projectId),
  ]);

  // scene_id → scene label
  const sceneById = new Map(
    (sceneRows ?? []).map((s) => [
      s.id,
      {
        sceneNumber: s.scene_number,
        intExt: s.int_ext,
        locationSlug: s.location_slug,
        timeOfDay: s.time_of_day,
        pageEighths: s.page_eighths,
      } as SceneLabel,
    ]),
  );

  // segment_id → scene_id
  const sceneIdBySegment = new Map(
    (segRows ?? []).map((seg) => [seg.id, seg.scene_id]),
  );

  // strip.id → SceneLabel (scene strips only)
  const sceneLabelByStripId: Record<string, SceneLabel> = {};
  for (const strips of Object.values(board.stripsByDay)) {
    for (const strip of strips) {
      if (strip.type !== "scene" || !strip.scene_segment_id) continue;
      const sceneId = sceneIdBySegment.get(strip.scene_segment_id);
      if (!sceneId) continue;
      const label = sceneById.get(sceneId);
      if (label) sceneLabelByStripId[strip.id] = label;
    }
  }

  // Scenes available to add to a day — active scenes, in script order.
  const sceneOptions: SceneOption[] = (sceneRows ?? [])
    .filter((s) => s.status === "active")
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((s) => ({
      id: s.id,
      label: [
        s.scene_number ? `${s.scene_number}.` : null,
        s.int_ext ?? null,
        s.location_slug ?? "Untitled scene",
        s.time_of_day ?? null,
      ]
        .filter(Boolean)
        .join(" "),
    }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-extrabold tracking-[-0.3px] text-[var(--tx)]">
            Schedule
          </h1>
          <p className="text-sm text-[var(--tx-3)]">
            The stripboard — drag scenes between and within shoot days. Day
            breaks and banners hold their place.
          </p>
        </div>

        {/* Create shoot day */}
        <form action={createShootDayAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <Button type="submit" variant="ember" size="sm">
            + New shoot day
          </Button>
        </form>
      </header>

      {/* The board */}
      <Stripboard
        // Re-seed local drag state whenever the server data changes.
        key={`${board.shootDays.length}:${Object.values(board.stripsByDay).reduce(
          (n, s) => n + s.length,
          0,
        )}`}
        shootDays={board.shootDays}
        stripsByDay={board.stripsByDay}
        eighths={board.eighths}
        sceneLabelByStripId={sceneLabelByStripId}
        sceneOptions={sceneOptions}
        projectId={projectId}
        setShootDayDateAction={setShootDayDateAction}
        addSceneToDayAction={addSceneToDayAction}
        insertDayBreakAction={insertDayBreakAction}
        insertBannerAction={insertBannerAction}
        deleteStripAction={deleteStripAction}
        reorderStripsAction={reorderStripsAction}
      />

      {/* Calendar — a SECONDARY, read-only month grid of dated shoot days
          (spec decision 8). Editing happens on the board above; each chip here
          is a click-through link to that day's section (#shoot-day-<id>). */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-display text-base font-extrabold tracking-[-0.2px] text-[var(--tx)]">
            Calendar
          </h2>
          <p className="text-sm text-[var(--tx-3)]">
            Read-only month view. Click a day to jump to it on the board.
          </p>
        </div>
        <CalendarView shootDays={calendarDays} />
      </section>

      {/* Read-only derivation surfaces, below the board. Both render engine
          output; the only write across them is setting a cast override. */}
      <ConflictPanel
        conflicts={conflicts}
        labels={{ person: personLabels, element: elementLabels }}
      />

      <DoodGrid
        entries={dood}
        personLabels={personLabels}
        dates={doodDates}
        projectId={projectId}
        setCastOverrideAction={setCastOverrideAction}
      />
    </main>
  );
}
