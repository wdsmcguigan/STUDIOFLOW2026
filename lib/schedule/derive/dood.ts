import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import type { DoodCode, DoodEntry } from "@/lib/schedule/schema";

/**
 * Day-Out-of-Days (DOOD) derivation — pure EP / Movie-Magic rules.
 *
 * Given a structural slice of the production graph plus a config, produce one
 * DoodEntry per (person, date) cell that should be displayed. The function is
 * deterministic and side-effect free: it never reads the DB, never calls
 * `Date.now()` / `new Date()`, and never needs a notion of "today" — every date
 * comes from the input data.
 *
 * Codes (see schema `doodCode`):
 *   W   work day
 *   S/F first / last work day → rendered compound as SW / WF (SWF when the
 *       person works exactly one day)
 *   H   hold — a paid non-work day between first and last work day, excluding
 *       company-off days, only when `config.allowHoldDays`
 *   D/P drop / pickup — opt-in (`config.allowDropPickup`) release of an actor
 *       across a long enough gap; see the gap rules below
 *   T   travel
 *   O   company-off (not emitted here; off days produce no cell)
 *   I   idle — override-only, never auto-derived
 *
 * Overrides always win: a persisted (person, date) override sets the cell to
 * the status's mapped code with source 'override', beating any derived value.
 */

/** Minimal structural shapes the engine needs — kept inline so it stays
 *  decoupled from the DB/Zod types and is trivially testable with plain
 *  objects. A subset of ScheduleGraph plus companyOffDays. */
interface ShootDayLike {
  id: string;
  date: string; // ISO yyyy-MM-dd
  unit: string;
  day_type: string;
}
interface StripLike {
  shoot_day_id: string;
  type: string;
  scene_segment_id: string | null;
}
interface SegmentLike {
  id: string;
  scene_id: string;
}
interface SceneCharacterLike {
  scene_id: string;
  character_id: string;
}
interface CharacterLike {
  id: string;
  cast_person_id: string | null;
}
interface CastOverrideLike {
  person_id: string;
  date: string; // ISO yyyy-MM-dd
  status: string; // matches castStatus enum values
}

export interface DoodGraph {
  shootDays: ShootDayLike[];
  strips: StripLike[];
  segments: SegmentLike[];
  sceneCharactersConfirmed: SceneCharacterLike[];
  characters: CharacterLike[];
  castOverrides: CastOverrideLike[];
  companyOffDays: string[];
}

export interface DoodConfig {
  allowHoldDays: boolean;
  allowDropPickup: boolean;
  /** Minimum calendar-day length a non-work gap must reach to qualify for a
   *  drop/pickup. NEVER hardcoded — always read from config. */
  minDropPickupCalendarDays: number;
}

/** Map a cast-status override value to its single-letter DOOD code. */
const OVERRIDE_CODE: Record<string, DoodCode> = {
  work: "W",
  hold: "H",
  start: "S",
  finish: "F",
  travel: "T",
  drop: "D",
  pickup: "P",
  idle: "I",
};

export function computeDOOD(graph: DoodGraph, config: DoodConfig): DoodEntry[] {
  // --- index lookups -------------------------------------------------------
  const segmentToScene = new Map<string, string>();
  for (const seg of graph.segments) segmentToScene.set(seg.id, seg.scene_id);

  const charactersByScene = new Map<string, string[]>();
  for (const sc of graph.sceneCharactersConfirmed) {
    const list = charactersByScene.get(sc.scene_id) ?? [];
    list.push(sc.character_id);
    charactersByScene.set(sc.scene_id, list);
  }

  const personByCharacter = new Map<string, string | null>();
  for (const ch of graph.characters) personByCharacter.set(ch.id, ch.cast_person_id);

  const shootDayById = new Map<string, ShootDayLike>();
  for (const sd of graph.shootDays) shootDayById.set(sd.id, sd);

  const offDays = new Set(graph.companyOffDays);

  // --- 1. work dates per person -------------------------------------------
  // A person works a dated day when a scene strip on that day maps to a scene
  // confirming a character the person is cast to.
  const workDatesByPerson = new Map<string, Set<string>>();
  const addWork = (personId: string, date: string) => {
    let set = workDatesByPerson.get(personId);
    if (!set) {
      set = new Set();
      workDatesByPerson.set(personId, set);
    }
    set.add(date);
  };

  for (const strip of graph.strips) {
    if (strip.type !== "scene" || strip.scene_segment_id === null) continue;
    const shootDay = shootDayById.get(strip.shoot_day_id);
    if (!shootDay) continue; // un-dated / unknown day → not on the calendar
    const sceneId = segmentToScene.get(strip.scene_segment_id);
    if (sceneId === undefined) continue;
    const charIds = charactersByScene.get(sceneId);
    if (!charIds) continue;
    for (const charId of charIds) {
      const personId = personByCharacter.get(charId);
      if (!personId) continue; // unassigned character → no person
      addWork(personId, shootDay.date);
    }
  }

  // Travel handling (v1): a dated day with day_type === 'travel' counts as a
  // work-equivalent day for a person already working somewhere in their span.
  // We derive the cast span purely from scene strips above, then fold in any
  // travel day that falls inside [first, last]. Travel outside the span is
  // ignored (it can still be applied via an override). This keeps derivation
  // anchored to scenes while honouring scheduled company travel.
  const travelDates = graph.shootDays
    .filter((sd) => sd.day_type === "travel")
    .map((sd) => sd.date);
  if (travelDates.length > 0) {
    for (const [personId, workSet] of workDatesByPerson) {
      const sorted = [...workSet].sort();
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      for (const td of travelDates) {
        if (td > first && td < last) addWork(personId, td);
      }
    }
  }

  // --- 2-4. derive per person ---------------------------------------------
  const entries: DoodEntry[] = [];

  for (const [personId, workSet] of workDatesByPerson) {
    const workDates = [...workSet].sort();
    const first = workDates[0];
    const last = workDates[workDates.length - 1];
    const firstDate = parseISO(first);
    const lastDate = parseISO(last);

    // cell code per date, derived (overrides folded in afterwards)
    const cellByDate = new Map<string, DoodCode>();

    if (first === last) {
      cellByDate.set(first, "SWF");
    } else {
      // Walk the calendar span and classify each day.
      const allDays = eachDayOfInterval({ start: firstDate, end: lastDate }).map((d) =>
        format(d, "yyyy-MM-dd"),
      );

      // First pass: mark work days; collect gap days (non-work, non-off).
      for (const date of allDays) {
        if (workSet.has(date)) {
          cellByDate.set(date, "W");
        }
        // off days and gap days are handled below
      }

      // Resolve maximal gap runs inside (first, last). A gap run is a maximal
      // contiguous sequence of days that are BOTH non-work AND non-off: a work
      // day OR a company-off day terminates the current run, and an off day is
      // itself never part of any run (and never produces a cell).
      let runStart: number | null = null; // index into allDays
      const interior = allDays;

      const flushRun = (startIdx: number, endIdxExclusive: number) => {
        // gap run = interior[startIdx .. endIdxExclusive-1], guaranteed all
        // non-work, non-off days (off days break runs, so none appear here).
        const gapDays: string[] = [];
        for (let i = startIdx; i < endIdxExclusive; i++) gapDays.push(interior[i]);
        if (gapDays.length === 0) return;

        // The pickup is the next WORK day at/after the day that terminated the
        // run. If an off day terminated the run, skip forward over off days to
        // the resuming work day. Run-length qualification counts only the
        // non-off, non-work days in this contiguous run (== gapDays.length).
        let pickupIdx = endIdxExclusive;
        while (pickupIdx < interior.length && !workSet.has(interior[pickupIdx])) pickupIdx++;
        const hasPickup = pickupIdx < interior.length;

        if (config.allowDropPickup && gapDays.length >= config.minDropPickupCalendarDays) {
          // Drop is placed `minDropPickupCalendarDays` calendar days before the
          // pickup (the resuming work day). That arithmetic could land on an
          // off day or outside the run, so clamp it to the latest valid day in
          // the run (non-off, non-work) that is <= the computed drop date; if
          // none qualifies, fall back to the run's first day. Every other gap
          // day is released (no cell); off days never carry a cell.
          if (hasPickup) {
            const pickupDate = interior[pickupIdx];
            const wantedDrop = format(
              subDays(parseISO(pickupDate), config.minDropPickupCalendarDays),
              "yyyy-MM-dd",
            );
            // gapDays is ascending; pick the latest gap day <= wantedDrop.
            let dropDate = gapDays[0];
            for (const d of gapDays) {
              if (d <= wantedDrop) dropDate = d;
              else break;
            }
            cellByDate.set(dropDate, "D");
            cellByDate.set(pickupDate, "P");
          } else if (config.allowHoldDays) {
            // No resuming work day (run trails to an off-day boundary) → cannot
            // form a drop/pickup pair; fall back to Hold.
            for (const date of gapDays) cellByDate.set(date, "H");
          }
          // remaining gap days: released → no cell
        } else if (config.allowHoldDays) {
          for (const date of gapDays) cellByDate.set(date, "H");
        }
        // else: no cells for gap days
      };

      for (let i = 0; i < interior.length; i++) {
        const date = interior[i];
        const isWork = workSet.has(date);
        const isOff = offDays.has(date);
        if (!isWork && !isOff) {
          if (runStart === null) runStart = i;
        } else {
          // a work day OR an off day terminates the current run
          if (runStart !== null) {
            flushRun(runStart, i);
            runStart = null;
          }
        }
      }
      // A trailing run cannot exist because the last interior day is `last`,
      // which is always a work day. (runStart left dangling only if the span
      // ended on a non-work day, impossible by construction.)
    }

    // First/last work-day compounding for derived codes. Only upgrade a plain
    // work cell — a pickup ('P') landing on the last work day stays a pickup.
    if (first !== last) {
      if (cellByDate.get(first) === "W") cellByDate.set(first, "SW");
      if (cellByDate.get(last) === "W") cellByDate.set(last, "WF");
    }

    for (const [date, code] of cellByDate) {
      entries.push({ personId, date, code, source: "derived" });
    }
  }

  // --- 5. overrides win ----------------------------------------------------
  // Apply within each person's span. An override replaces any derived cell at
  // that (person, date) and stands alone if there was no derived cell.
  const spanByPerson = new Map<string, { first: string; last: string }>();
  for (const [personId, workSet] of workDatesByPerson) {
    const sorted = [...workSet].sort();
    spanByPerson.set(personId, { first: sorted[0], last: sorted[sorted.length - 1] });
  }

  for (const ov of graph.castOverrides) {
    const span = spanByPerson.get(ov.person_id);
    if (!span) continue; // person has no derived span → ignore (v1)
    if (ov.date < span.first || ov.date > span.last) continue; // outside span
    const code = OVERRIDE_CODE[ov.status];
    if (!code) continue; // unknown status → skip
    // remove any existing entry for this (person, date)
    const idx = entries.findIndex(
      (e) => e.personId === ov.person_id && e.date === ov.date,
    );
    if (idx >= 0) entries.splice(idx, 1);
    entries.push({ personId: ov.person_id, date: ov.date, code, source: "override" });
  }

  return entries;
}
