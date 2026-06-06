"use client";

/**
 * CrewRosterEditor — list, add, edit, and delete crew members.
 *
 * Pattern: "use client", actions received as props typed
 * `(formData: FormData) => Promise<void>`, invoked via <form action={…}>.
 * Design: tokens only — no hardcoded hex/colours. Matches globals-editor idiom.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CrewMember } from "@/lib/callsheet/schema";

interface CrewRosterEditorProps {
  projectId: string;
  crew: CrewMember[];
  createCrewMemberAction: (formData: FormData) => Promise<void>;
  updateCrewMemberAction: (formData: FormData) => Promise<void>;
  deleteCrewMemberAction: (formData: FormData) => Promise<void>;
}

const inputCls =
  "h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]";

export function CrewRosterEditor({
  projectId,
  crew,
  createCrewMemberAction,
  updateCrewMemberAction,
  deleteCrewMemberAction,
}: CrewRosterEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* ── Existing crew list ── */}
      {crew.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--line-2)] px-3 py-4 text-center text-xs text-[var(--tx-3)]">
          No crew members yet — add one below.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--s1)]">
          {crew.map((member) =>
            editingId === member.id ? (
              // ── Inline edit row ──
              <li key={member.id} className="px-3 py-3">
                <form
                  action={async (fd) => {
                    await updateCrewMemberAction(fd);
                    setEditingId(null);
                  }}
                  className="space-y-2"
                >
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="id" value={member.id} />

                  {/* Row 1: name + department + position */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className={labelCls}>Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={member.name}
                        required
                        maxLength={200}
                        aria-label="Name"
                        className={inputCls + " w-36"}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className={labelCls}>Department</label>
                      <input
                        type="text"
                        name="department"
                        defaultValue={member.department}
                        maxLength={200}
                        aria-label="Department"
                        className={inputCls + " w-28"}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className={labelCls}>Position</label>
                      <input
                        type="text"
                        name="position"
                        defaultValue={member.position}
                        maxLength={200}
                        aria-label="Position"
                        className={inputCls + " w-28"}
                      />
                    </div>
                  </div>

                  {/* Row 2: email + phone + day rate */}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className={labelCls}>Email</label>
                      <input
                        type="email"
                        name="email"
                        defaultValue={member.email ?? ""}
                        maxLength={200}
                        aria-label="Email"
                        className={inputCls + " w-44"}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className={labelCls}>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={member.phone ?? ""}
                        maxLength={50}
                        aria-label="Phone"
                        className={inputCls + " w-32"}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className={labelCls}>Day Rate ($)</label>
                      <input
                        type="number"
                        name="dayRate"
                        defaultValue={member.day_rate ?? ""}
                        step="any"
                        min="0"
                        aria-label="Day rate"
                        className={inputCls + " w-24 text-right"}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" variant="ember" size="xs">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
              // ── Read-only row ──
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-xs font-semibold text-[var(--tx)]">
                      {member.name}
                    </span>
                    {member.department && (
                      <span className="shrink-0 rounded border border-[var(--line)] bg-[var(--s2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                        {member.department}
                      </span>
                    )}
                    {member.position && (
                      <span className="text-xs text-[var(--tx-3)]">
                        {member.position}
                      </span>
                    )}
                  </div>
                  {(member.email || member.phone) && (
                    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--tx-3)]">
                      {member.email && <span>{member.email}</span>}
                      {member.phone && <span>{member.phone}</span>}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {member.day_rate != null && (
                    <span className="font-mono text-xs text-[var(--tx-2)]">
                      ${member.day_rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditingId(member.id)}
                  >
                    Edit
                  </Button>
                  {/* Delete */}
                  <form action={deleteCrewMemberAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="crewMemberId" value={member.id} />
                    <Button type="submit" variant="ghost" size="xs">
                      Remove
                    </Button>
                  </form>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {/* ── Add crew member form ── */}
      <form
        action={createCrewMemberAction}
        className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--s1)] px-3 py-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
          Add crew member
        </p>

        <input type="hidden" name="projectId" value={projectId} />

        {/* Row 1: name + department + position */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Name *</label>
            <input
              type="text"
              name="name"
              required
              maxLength={200}
              placeholder="Full name"
              aria-label="Name"
              className={inputCls + " w-36"}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Department</label>
            <input
              type="text"
              name="department"
              maxLength={200}
              placeholder="e.g. Camera"
              aria-label="Department"
              className={inputCls + " w-28"}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Position</label>
            <input
              type="text"
              name="position"
              maxLength={200}
              placeholder="e.g. DP"
              aria-label="Position"
              className={inputCls + " w-28"}
            />
          </div>
        </div>

        {/* Row 2: email + phone + day rate */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Email</label>
            <input
              type="email"
              name="email"
              maxLength={200}
              placeholder="optional"
              aria-label="Email"
              className={inputCls + " w-44"}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Phone</label>
            <input
              type="tel"
              name="phone"
              maxLength={50}
              placeholder="optional"
              aria-label="Phone"
              className={inputCls + " w-32"}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelCls}>Day Rate ($)</label>
            <input
              type="number"
              name="dayRate"
              step="any"
              min="0"
              placeholder="0.00"
              aria-label="Day rate"
              className={inputCls + " w-24 text-right"}
            />
          </div>
          <Button type="submit" variant="ember" size="xs">
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}
