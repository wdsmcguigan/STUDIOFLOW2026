"use client";

import { useRef } from "react";
import type { DoodEntry } from "@/lib/schedule/schema";

/** Cast-override statuses (matches setCastOverrideAction's enum). */
const OVERRIDE_STATUSES = [
  "work",
  "hold",
  "start",
  "finish",
  "travel",
  "drop",
  "pickup",
  "idle",
] as const;

/**
 * One DOOD cell — the override-set affordance.
 *
 * Renders the derived/override code, and is itself a tiny <form> posting to
 * setCastOverrideAction. A select (current code as placeholder, the eight
 * override statuses as options) submits the form on change. Client-side only to
 * wire the onChange→submit; the write itself is the server action (thin client:
 * the cell captures one choice and hands it to the server).
 *
 * Override cells are visually marked — accent ring + a corner dot — so hand-set
 * cells read distinctly from derived ones. Tokens only.
 */
export function DoodCell({
  personId,
  date,
  entry,
  projectId,
  setCastOverrideAction,
}: {
  personId: string;
  date: string;
  entry: DoodEntry | undefined;
  projectId: string;
  setCastOverrideAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const isOverride = entry?.source === "override";
  const code = entry?.code ?? "";

  return (
    <td className="p-0.5 text-center align-middle">
      <form ref={formRef} action={setCastOverrideAction} className="relative">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="date" value={date} />

        {/* Override marker dot (top-right corner). */}
        {isOverride ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-0.5 top-0.5 z-10 size-1.5 rounded-full bg-[var(--brand)]"
          />
        ) : null}

        <select
          name="status"
          defaultValue=""
          aria-label={`Set cast status for ${date}`}
          onChange={(e) => {
            if (e.currentTarget.value) formRef.current?.requestSubmit();
          }}
          className={`h-7 w-full min-w-[2.75rem] cursor-pointer appearance-none rounded-md border bg-[var(--s2)] px-1 text-center font-mono text-xs font-semibold text-[var(--tx)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
            isOverride
              ? "border-[var(--brand)] ring-1 ring-[var(--brand)]/40"
              : "border-[var(--line)]"
          } ${code ? "" : "text-[var(--tx-3)]"}`}
        >
          {/* Current derived/override code shown as the selected placeholder. */}
          <option value="" disabled hidden>
            {code || "·"}
          </option>
          {OVERRIDE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </form>
    </td>
  );
}
