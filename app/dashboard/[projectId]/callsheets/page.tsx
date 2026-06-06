import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listShootDays } from "@/lib/schedule/data";
import {
  listCrewMembers,
  listCrewDayCalls,
  listCrewDeptCalls,
  listCastDayCalls,
  loadCallSheetInputs,
} from "@/lib/callsheet/data";
import { assembleCallSheet } from "@/lib/callsheet/derive/assemble";
import { DayPicker } from "@/components/callsheet/day-picker";
import { CallSheetView } from "@/components/callsheet/call-sheet-view";
import { CrewRosterEditor } from "@/components/callsheet/crew-roster-editor";
import { DayCallsEditor } from "@/components/callsheet/day-calls-editor";
import { HeaderEditor } from "@/components/callsheet/header-editor";
import { Button } from "@/components/ui/button";
import {
  createCrewMemberAction,
  updateCrewMemberAction,
  deleteCrewMemberAction,
  setCrewDeptCallAction,
  setCrewDayCallAction,
  removeCrewDayCallAction,
  setCastDayCallAction,
  upsertCallSheetHeaderAction,
  bumpRevisionAction,
} from "./actions";

/**
 * Call Sheets page — server component.
 *
 * URL shape: /dashboard/[projectId]/callsheets?day=<shootDayId>&tab=<tab>
 *
 * Tabs:
 *   "view"   — the assembled read view (CallSheetView) — default
 *   "edit"   — day-specific call times (DayCallsEditor) + header (HeaderEditor)
 *   "roster" — project-wide crew roster (CrewRosterEditor)
 *
 * Pattern: await params + searchParams (Next.js 16 — both are Promises);
 * createClient(); load data; pass actions to editors.
 *
 * Thin client / smart server: all data fetching here; editors just capture input.
 */
export default async function CallSheetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();

  // Load all shoot days; filter to dated ones for the picker.
  const allShootDays = await listShootDays(supabase as never, projectId);
  const datedDays = allShootDays.filter((d) => d.date !== null);

  // Resolve the selected shoot day:
  //   1. searchParams.day (if it refers to a known dated day)
  //   2. First dated day as the default
  //   3. null — no dated days
  const dayParam = typeof sp.day === "string" ? sp.day : null;
  const selectedDay =
    (dayParam ? datedDays.find((d) => d.id === dayParam) : null) ??
    datedDays[0] ??
    null;

  // Active tab: "view" | "edit" | "roster"
  const tabParam = typeof sp.tab === "string" ? sp.tab : null;
  const activeTab: "view" | "edit" | "roster" =
    tabParam === "edit" || tabParam === "roster" ? tabParam : "view";

  const basePath = `/dashboard/${projectId}/callsheets`;
  const dayQuery = selectedDay ? `day=${selectedDay.id}` : "";

  function tabHref(tab: "view" | "edit" | "roster") {
    const qs = [dayQuery, `tab=${tab}`].filter(Boolean).join("&");
    return `${basePath}?${qs}`;
  }

  // --- Load the day's slice + editor data in parallel (when a day is selected) ---
  // loadCallSheetInputs is the single slice-load; the assembled view derives from
  // it (no separate getCallSheet call → no redundant schedule/DOOD fetch).
  let crew: Awaited<ReturnType<typeof listCrewMembers>>;
  let crewDayCalls: Awaited<ReturnType<typeof listCrewDayCalls>>;
  let crewDeptCalls: Awaited<ReturnType<typeof listCrewDeptCalls>>;
  let castDayCalls: Awaited<ReturnType<typeof listCastDayCalls>>;
  let callSheetInputs: Awaited<ReturnType<typeof loadCallSheetInputs>> | null;

  if (selectedDay) {
    [crew, crewDayCalls, crewDeptCalls, castDayCalls, callSheetInputs] =
      await Promise.all([
        listCrewMembers(supabase as never, projectId),
        listCrewDayCalls(supabase as never, selectedDay.id),
        listCrewDeptCalls(supabase as never, selectedDay.id),
        listCastDayCalls(supabase as never, selectedDay.id),
        loadCallSheetInputs(supabase as never, selectedDay.id),
      ]);
  } else {
    crew = await listCrewMembers(supabase as never, projectId);
    crewDayCalls = [];
    crewDeptCalls = [];
    castDayCalls = [];
    callSheetInputs = null;
  }

  // Assemble the derived view from the slice we already loaded (pure engine).
  const callSheet = callSheetInputs ? assembleCallSheet(callSheetInputs) : null;

  // callSheet header row for the HeaderEditor — from callSheetInputs
  const callSheetHeaderRow = callSheetInputs?.callSheet ?? null;
  // cast people working today (from the DOOD gate)
  const castPeople = callSheetInputs?.castPeople ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      {/* ── Page header ── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-extrabold tracking-[-0.3px] text-[var(--tx)]">
            Call Sheets
          </h1>
          <p className="text-sm text-[var(--tx-3)]">
            Derived on read from the production graph — schedule, cast, and crew
            drive call times automatically.
          </p>
        </div>

        {/* Export PDF — Task-11 streaming route */}
        {selectedDay && (
          <a
            href={`${basePath}/${selectedDay.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Export PDF
            </Button>
          </a>
        )}
      </header>

      {/* ── Empty state: no dated shoot days ── */}
      {datedDays.length === 0 && (
        <section
          aria-labelledby="empty-state-heading"
          className="rounded-xl border border-dashed border-[var(--line-2)] bg-card p-8 text-center"
        >
          <h2
            id="empty-state-heading"
            className="mb-2 text-sm font-semibold text-foreground"
          >
            No dated shoot days
          </h2>
          <p className="mb-5 text-sm text-[var(--tx-3)]">
            Call sheets are generated per shoot day. Date your shoot days in the
            schedule to unlock call sheet generation.
          </p>
          <Link href={`/dashboard/${projectId}/schedule`}>
            <Button variant="ember" size="sm">
              Go to Schedule
            </Button>
          </Link>
        </section>
      )}

      {/* ── Day picker ── */}
      {datedDays.length > 0 && (
        <section aria-label="Select shoot day">
          <DayPicker
            shootDays={datedDays}
            selectedDayId={selectedDay?.id ?? null}
            basePath={basePath}
          />
        </section>
      )}

      {/* ── Tab bar ── */}
      {datedDays.length > 0 && (
        <nav
          aria-label="Call sheet tabs"
          className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--s1)] p-1"
        >
          {(
            [
              { key: "view", label: "Call Sheet" },
              { key: "edit", label: "Edit Day Calls" },
              { key: "roster", label: "Crew Roster" },
            ] as const
          ).map(({ key, label }) => (
            <Link
              key={key}
              href={tabHref(key)}
              aria-current={activeTab === key ? "page" : undefined}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === key
                  ? "bg-[var(--brand-soft)] text-[var(--brand-on)]"
                  : "text-[var(--tx-3)] hover:bg-muted/40 hover:text-[var(--tx)]",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      {/* ── Tab panels ── */}

      {/* VIEW tab */}
      {activeTab === "view" && callSheet && selectedDay && (
        <section aria-labelledby="call-sheet-view-heading" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="call-sheet-view-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Call Sheet — {selectedDay.date}
            </h2>

            {/* Secondary export PDF link */}
            <a
              href={`${basePath}/${selectedDay.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[var(--tx-3)] underline underline-offset-2 hover:text-[var(--tx)] transition-colors"
            >
              Open PDF ↗
            </a>
          </div>

          <CallSheetView callSheet={callSheet} />
        </section>
      )}

      {/* EDIT tab — Day Calls + Header editors side-by-side (stacked on mobile) */}
      {activeTab === "edit" && selectedDay && (
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Day calls — takes main width */}
          <section
            aria-labelledby="day-calls-editor-heading"
            className="space-y-2"
          >
            <h2
              id="day-calls-editor-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Day Calls — {selectedDay.date}
            </h2>
            <DayCallsEditor
              projectId={projectId}
              shootDayId={selectedDay.id}
              generalCallTime={callSheetHeaderRow?.general_call_time ?? null}
              crew={crew}
              crewDayCalls={crewDayCalls}
              crewDeptCalls={crewDeptCalls}
              castPeople={castPeople}
              castDayCalls={castDayCalls}
              upsertCallSheetHeaderAction={upsertCallSheetHeaderAction}
              setCrewDayCallAction={setCrewDayCallAction}
              removeCrewDayCallAction={removeCrewDayCallAction}
              setCrewDeptCallAction={setCrewDeptCallAction}
              setCastDayCallAction={setCastDayCallAction}
            />
          </section>

          {/* Header + revision — narrower column */}
          <section
            aria-labelledby="header-editor-heading"
            className="w-full lg:w-80 space-y-2"
          >
            <h2
              id="header-editor-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Header &amp; Revision
            </h2>
            <HeaderEditor
              projectId={projectId}
              shootDayId={selectedDay.id}
              callSheet={callSheetHeaderRow}
              upsertCallSheetHeaderAction={upsertCallSheetHeaderAction}
              bumpRevisionAction={bumpRevisionAction}
            />
          </section>
        </div>
      )}

      {/* ROSTER tab — project-wide crew list */}
      {activeTab === "roster" && (
        <section
          aria-labelledby="crew-roster-editor-heading"
          className="space-y-2"
        >
          <div className="space-y-0.5">
            <h2
              id="crew-roster-editor-heading"
              className="font-display text-sm font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]"
            >
              Crew Roster
            </h2>
            <p className="text-xs text-[var(--tx-3)]">
              Manage the project&apos;s crew list. Department and position drive the
              call-time cascade on each shoot day.
            </p>
          </div>
          <CrewRosterEditor
            projectId={projectId}
            crew={crew}
            createCrewMemberAction={createCrewMemberAction}
            updateCrewMemberAction={updateCrewMemberAction}
            deleteCrewMemberAction={deleteCrewMemberAction}
          />
        </section>
      )}
    </main>
  );
}
