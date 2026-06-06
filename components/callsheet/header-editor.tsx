"use client";

/**
 * HeaderEditor — edit call sheet header fields and bump revision.
 *
 * Fields: general call time / weather note / hospital name & address / notes.
 * Action: upsertCallSheetHeaderAction (full form submit).
 * Revision bump: bumpRevisionAction (separate form / button).
 *
 * Pattern: "use client", actions as props, <form action={…}>.
 * Design: tokens only — no hardcoded hex/colours.
 */

import { Button } from "@/components/ui/button";
import type { CallSheet } from "@/lib/callsheet/schema";

interface HeaderEditorProps {
  projectId: string;
  shootDayId: string;
  /** Existing call sheet header values (null when no row has been created yet). */
  callSheet: CallSheet | null;
  upsertCallSheetHeaderAction: (formData: FormData) => Promise<void>;
  bumpRevisionAction: (formData: FormData) => Promise<void>;
}

const inputCls =
  "h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]";

const textareaCls =
  "rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 py-1.5 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] resize-y min-h-[60px]";

export function HeaderEditor({
  projectId,
  shootDayId,
  callSheet,
  upsertCallSheetHeaderAction,
  bumpRevisionAction,
}: HeaderEditorProps) {
  return (
    <div className="space-y-6">
      {/* ── Header fields form ── */}
      <form action={upsertCallSheetHeaderAction} className="space-y-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="shootDayId" value={shootDayId} />

        {/* General call time */}
        <div className="flex flex-col gap-0.5">
          <label className={labelCls} htmlFor="header-general-call">
            General call time
          </label>
          <input
            id="header-general-call"
            type="time"
            name="generalCallTime"
            defaultValue={callSheet?.general_call_time ?? ""}
            aria-label="General call time"
            className={inputCls + " w-28"}
          />
        </div>

        {/* Weather note */}
        <div className="flex flex-col gap-0.5">
          <label className={labelCls} htmlFor="header-weather">
            Weather note
          </label>
          <input
            id="header-weather"
            type="text"
            name="weatherNote"
            defaultValue={callSheet?.weather_note ?? ""}
            maxLength={500}
            placeholder="e.g. Partly cloudy, 68°F"
            aria-label="Weather note"
            className={inputCls + " w-full max-w-sm"}
          />
        </div>

        {/* Hospital */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-0.5 flex-1 min-w-[180px]">
            <label className={labelCls} htmlFor="header-hospital-name">
              Nearest hospital name
            </label>
            <input
              id="header-hospital-name"
              type="text"
              name="hospitalName"
              defaultValue={callSheet?.hospital_name ?? ""}
              maxLength={200}
              placeholder="e.g. Cedar-Sinai Medical Center"
              aria-label="Nearest hospital name"
              className={inputCls + " w-full"}
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-[200px]">
            <label className={labelCls} htmlFor="header-hospital-address">
              Hospital address
            </label>
            <input
              id="header-hospital-address"
              type="text"
              name="hospitalAddress"
              defaultValue={callSheet?.hospital_address ?? ""}
              maxLength={500}
              placeholder="Street address"
              aria-label="Hospital address"
              className={inputCls + " w-full"}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-0.5">
          <label className={labelCls} htmlFor="header-notes">
            Notes
          </label>
          <textarea
            id="header-notes"
            name="notes"
            defaultValue={callSheet?.notes ?? ""}
            maxLength={1000}
            rows={3}
            placeholder="General crew notes for this day…"
            aria-label="Notes"
            className={textareaCls + " w-full max-w-lg"}
          />
        </div>

        <Button type="submit" variant="ember" size="sm">
          Save header
        </Button>
      </form>

      {/* ── Revision bump ── */}
      <div className="rounded-lg border border-[var(--line)] bg-[var(--s1)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[var(--tx)]">
              Revision
              {callSheet && callSheet.revision > 0 ? (
                <span className="ml-2 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[var(--brand-on)]">
                  Rev {callSheet.revision}
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-[var(--tx-3)]">
              Bump the revision number to mark this call sheet as updated.
              The revision is displayed prominently on the PDF.
            </p>
          </div>

          <form action={bumpRevisionAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="shootDayId" value={shootDayId} />
            <Button type="submit" variant="secondary" size="sm">
              Mark revised
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
