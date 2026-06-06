"use client";

/**
 * DayCallsEditor — per-shoot-day call time authoring.
 *
 * Three sections:
 *   (a) General call — upserts the header's general_call_time.
 *   (b) Crew called today — per-member checkbox (add/remove) + optional
 *       individual time override. Checked = row exists in crew_day_calls.
 *   (c) Department calls — per-department time override.
 *   (d) Cast times — per-cast-person call/makeup/wardrobe/on-set.
 *
 * Pattern: "use client", actions as props, <form action={…}>.
 * Design: tokens only — no hardcoded hex/colours.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CrewMember, CrewDayCall, CrewDeptCall, CastDayCall } from "@/lib/callsheet/schema";
import type { CastPersonEntry } from "@/lib/callsheet/data";

interface DayCallsEditorProps {
  projectId: string;
  shootDayId: string;
  /** General call time from the header (HH:mm or null). */
  generalCallTime: string | null;
  /** All crew members on the project. */
  crew: CrewMember[];
  /** Existing crew_day_calls rows for this day (who is called + individual overrides). */
  crewDayCalls: CrewDayCall[];
  /** Existing crew_dept_calls rows for this day. */
  crewDeptCalls: CrewDeptCall[];
  /** Cast people working today (from the DOOD gate). */
  castPeople: CastPersonEntry[];
  /** Existing cast_day_calls rows for this day. */
  castDayCalls: CastDayCall[];
  // Actions
  upsertCallSheetHeaderAction: (formData: FormData) => Promise<void>;
  setCrewDayCallAction: (formData: FormData) => Promise<void>;
  removeCrewDayCallAction: (formData: FormData) => Promise<void>;
  setCrewDeptCallAction: (formData: FormData) => Promise<void>;
  setCastDayCallAction: (formData: FormData) => Promise<void>;
}

const inputCls =
  "h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]";

const sectionHeadingCls =
  "mb-3 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]";

// ---------------------------------------------------------------------------
// Sub-section: general call time
// ---------------------------------------------------------------------------

function GeneralCallSection({
  projectId,
  shootDayId,
  generalCallTime,
  upsertCallSheetHeaderAction,
}: {
  projectId: string;
  shootDayId: string;
  generalCallTime: string | null;
  upsertCallSheetHeaderAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <form
      action={upsertCallSheetHeaderAction}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="shootDayId" value={shootDayId} />

      <div className="flex flex-col gap-0.5">
        <label className={labelCls} htmlFor="general-call-time">
          General call
        </label>
        <input
          id="general-call-time"
          type="time"
          name="generalCallTime"
          defaultValue={generalCallTime ?? ""}
          aria-label="General call time"
          className={inputCls + " w-28"}
        />
      </div>

      <Button type="submit" variant="secondary" size="xs">
        Set
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sub-section: crew called today
// ---------------------------------------------------------------------------

function CrewDayCallsSection({
  projectId,
  shootDayId,
  crew,
  crewDayCalls,
  setCrewDayCallAction,
  removeCrewDayCallAction,
}: {
  projectId: string;
  shootDayId: string;
  crew: CrewMember[];
  crewDayCalls: CrewDayCall[];
  setCrewDayCallAction: (formData: FormData) => Promise<void>;
  removeCrewDayCallAction: (formData: FormData) => Promise<void>;
}) {
  // Index existing day-call rows by crewMemberId for quick lookup
  const dayCallByMemberId = new Map(
    crewDayCalls.map((c) => [c.crew_member_id, c])
  );

  // Local toggling state — optimistic check so the form fields appear immediately
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(crewDayCalls.map((c) => c.crew_member_id))
  );

  if (crew.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-4 text-center text-xs text-[var(--tx-3)]">
        No crew members yet — add some in the Crew Roster tab.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--s1)]">
      {crew.map((member) => {
        const called = checkedIds.has(member.id);
        const existing = dayCallByMemberId.get(member.id);

        return (
          <li key={member.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            {/* Checkbox to toggle called/not-called */}
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={called}
                onChange={async (e) => {
                  const nextCalled = e.target.checked;
                  // Optimistic update
                  setCheckedIds((prev) => {
                    const next = new Set(prev);
                    if (nextCalled) next.add(member.id);
                    else next.delete(member.id);
                    return next;
                  });

                  const fd = new FormData();
                  fd.set("projectId", projectId);
                  fd.set("shootDayId", shootDayId);
                  fd.set("crewMemberId", member.id);

                  if (nextCalled) {
                    // Upsert with null call time (cascade to dept/general)
                    fd.set("callTime", "");
                    await setCrewDayCallAction(fd);
                  } else {
                    await removeCrewDayCallAction(fd);
                  }
                }}
                className="rounded border-[var(--line-2)]"
              />
              <span className="min-w-0 truncate text-xs font-medium text-[var(--tx)]">
                {member.name}
              </span>
              {member.department && (
                <span className="shrink-0 text-[10px] text-[var(--tx-3)]">
                  {member.department}
                </span>
              )}
            </label>

            {/* Individual time override — only visible if crew member is called */}
            {called && (
              <form
                action={setCrewDayCallAction}
                className="flex items-center gap-1.5"
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="shootDayId" value={shootDayId} />
                <input type="hidden" name="crewMemberId" value={member.id} />
                <input
                  type="time"
                  name="callTime"
                  defaultValue={existing?.call_time ?? ""}
                  aria-label={`Individual call time for ${member.name}`}
                  className={inputCls + " w-24"}
                />
                <Button type="submit" variant="ghost" size="xs">
                  Set
                </Button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Sub-section: department calls
// ---------------------------------------------------------------------------

function DeptCallsSection({
  projectId,
  shootDayId,
  crew,
  crewDeptCalls,
  setCrewDeptCallAction,
}: {
  projectId: string;
  shootDayId: string;
  crew: CrewMember[];
  crewDeptCalls: CrewDeptCall[];
  setCrewDeptCallAction: (formData: FormData) => Promise<void>;
}) {
  // Collect unique department names from crew + existing dept calls
  const deptSet = new Set<string>();
  for (const m of crew) {
    if (m.department) deptSet.add(m.department);
  }
  for (const d of crewDeptCalls) {
    deptSet.add(d.department);
  }
  const departments = Array.from(deptSet).sort();

  // Index existing dept calls for default values
  const deptCallByDept = new Map(crewDeptCalls.map((d) => [d.department, d]));

  if (departments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-4 text-center text-xs text-[var(--tx-3)]">
        No departments found. Assign departments to crew members first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Existing departments */}
      <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--s1)]">
        {departments.map((dept) => {
          const existing = deptCallByDept.get(dept);
          return (
            <li key={dept} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--tx)]">
                {dept}
              </span>
              <form
                action={setCrewDeptCallAction}
                className="flex items-center gap-1.5"
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="shootDayId" value={shootDayId} />
                <input type="hidden" name="department" value={dept} />
                <input
                  type="time"
                  name="callTime"
                  defaultValue={existing?.call_time ?? ""}
                  required
                  aria-label={`Department call time for ${dept}`}
                  className={inputCls + " w-24"}
                />
                <Button type="submit" variant="ghost" size="xs">
                  Set
                </Button>
              </form>
            </li>
          );
        })}
      </ul>

      {/* Add ad-hoc department call */}
      <form
        action={setCrewDeptCallAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--line)] bg-[var(--s1)] px-3 py-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="shootDayId" value={shootDayId} />
        <div className="flex flex-col gap-0.5">
          <label className={labelCls}>Department</label>
          <input
            type="text"
            name="department"
            required
            maxLength={200}
            placeholder="e.g. Catering"
            aria-label="Department name"
            className={inputCls + " w-32"}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className={labelCls}>Call time</label>
          <input
            type="time"
            name="callTime"
            required
            aria-label="Department call time"
            className={inputCls + " w-24"}
          />
        </div>
        <Button type="submit" variant="secondary" size="xs">
          Add dept call
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-section: cast call times
// ---------------------------------------------------------------------------

function CastCallsSection({
  projectId,
  shootDayId,
  castPeople,
  castDayCalls,
  setCastDayCallAction,
}: {
  projectId: string;
  shootDayId: string;
  castPeople: CastPersonEntry[];
  castDayCalls: CastDayCall[];
  setCastDayCallAction: (formData: FormData) => Promise<void>;
}) {
  const castCallByPersonId = new Map(
    castDayCalls.map((c) => [c.person_id, c])
  );

  if (castPeople.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-4 text-center text-xs text-[var(--tx-3)]">
        No cast on call for this day.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--s1)]">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--s2)]">
            <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Name / Character
            </th>
            <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Call
            </th>
            <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              M/U
            </th>
            <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Ward.
            </th>
            <th className="px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              On Set
            </th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {castPeople.map((person) => {
            const existing = castCallByPersonId.get(person.personId);
            return (
              <tr key={person.personId} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2">
                  <span className="font-medium text-[var(--tx)]">{person.name}</span>
                  {person.characterName && (
                    <span className="ml-1 text-[var(--tx-3)]">
                      ({person.characterName})
                    </span>
                  )}
                </td>
                <td colSpan={5} className="px-3 py-1.5">
                  <form
                    action={setCastDayCallAction}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="shootDayId" value={shootDayId} />
                    <input type="hidden" name="personId" value={person.personId} />
                    <input
                      type="time"
                      name="callTime"
                      defaultValue={existing?.call_time ?? ""}
                      aria-label={`Call time for ${person.name}`}
                      className={inputCls + " w-24"}
                    />
                    <input
                      type="time"
                      name="makeupTime"
                      defaultValue={existing?.makeup_time ?? ""}
                      aria-label={`Makeup time for ${person.name}`}
                      className={inputCls + " w-24"}
                    />
                    <input
                      type="time"
                      name="wardrobeTime"
                      defaultValue={existing?.wardrobe_time ?? ""}
                      aria-label={`Wardrobe time for ${person.name}`}
                      className={inputCls + " w-24"}
                    />
                    <input
                      type="time"
                      name="onSetTime"
                      defaultValue={existing?.on_set_time ?? ""}
                      aria-label={`On-set time for ${person.name}`}
                      className={inputCls + " w-24"}
                    />
                    <Button type="submit" variant="ghost" size="xs">
                      Save
                    </Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayCallsEditor — main export
// ---------------------------------------------------------------------------

export function DayCallsEditor({
  projectId,
  shootDayId,
  generalCallTime,
  crew,
  crewDayCalls,
  crewDeptCalls,
  castPeople,
  castDayCalls,
  upsertCallSheetHeaderAction,
  setCrewDayCallAction,
  removeCrewDayCallAction,
  setCrewDeptCallAction,
  setCastDayCallAction,
}: DayCallsEditorProps) {
  return (
    <div className="space-y-6">
      {/* (a) General call */}
      <section aria-labelledby="day-calls-general-heading">
        <h3 id="day-calls-general-heading" className={sectionHeadingCls}>
          General call time
        </h3>
        <GeneralCallSection
          projectId={projectId}
          shootDayId={shootDayId}
          generalCallTime={generalCallTime}
          upsertCallSheetHeaderAction={upsertCallSheetHeaderAction}
        />
      </section>

      {/* (b) Crew called today */}
      <section aria-labelledby="day-calls-crew-heading">
        <h3 id="day-calls-crew-heading" className={sectionHeadingCls}>
          Crew called today
        </h3>
        <p className="mb-2 text-[11px] text-[var(--tx-3)]">
          Check to mark a crew member as called. Set an individual time to override the department or general call.
        </p>
        <CrewDayCallsSection
          projectId={projectId}
          shootDayId={shootDayId}
          crew={crew}
          crewDayCalls={crewDayCalls}
          setCrewDayCallAction={setCrewDayCallAction}
          removeCrewDayCallAction={removeCrewDayCallAction}
        />
      </section>

      {/* (c) Department calls */}
      <section aria-labelledby="day-calls-dept-heading">
        <h3 id="day-calls-dept-heading" className={sectionHeadingCls}>
          Department calls
        </h3>
        <DeptCallsSection
          projectId={projectId}
          shootDayId={shootDayId}
          crew={crew}
          crewDeptCalls={crewDeptCalls}
          setCrewDeptCallAction={setCrewDeptCallAction}
        />
      </section>

      {/* (d) Cast times */}
      <section aria-labelledby="day-calls-cast-heading">
        <h3 id="day-calls-cast-heading" className={sectionHeadingCls}>
          Cast times
        </h3>
        <CastCallsSection
          projectId={projectId}
          shootDayId={shootDayId}
          castPeople={castPeople}
          castDayCalls={castDayCalls}
          setCastDayCallAction={setCastDayCallAction}
        />
      </section>
    </div>
  );
}
