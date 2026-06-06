"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageOff } from "lucide-react";

import type { ShotWithFrames } from "@/lib/storyboard/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  renderShotAction,
  selectFrameAction,
  uploadFrameAction,
  updateShotAction,
  setShotStatusAction,
  deleteShotAction,
} from "@/app/dashboard/[projectId]/storyboard/actions";
import { SHOT_SIZES, SHOT_ANGLES, SHOT_MOVEMENTS } from "@/lib/storyboard/schema";

interface SortableShotCardProps {
  projectId: string;
  sceneId: string;
  shot: ShotWithFrames;
  panelNumber: number;
}

/**
 * Badge shape driven by the shot's workflow status (suggested/confirmed/rejected).
 * A secondary frame-state hint is appended so users can see both at a glance.
 */
function shotStatusBadge(shot: ShotWithFrames): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const frameHint = shot.selectedUrl
    ? " · framed"
    : shot.frames.length > 0
      ? " · variants"
      : "";
  switch (shot.status) {
    case "confirmed":
      return { label: `Confirmed${frameHint}`, variant: "default" };
    case "rejected":
      return { label: "Rejected", variant: "destructive" };
    default:
      // "suggested" or any unknown value
      if (shot.selectedUrl) return { label: "Selected", variant: "secondary" };
      if (shot.frames.length > 0)
        return { label: "Variants ready", variant: "secondary" };
      return { label: "Suggested", variant: "outline" };
  }
}

/**
 * SortableShotCard — one storyboard panel.
 *
 * Shows the selected frame (or an empty placeholder), a status badge, the
 * camera metadata, and the full control set: regenerate, variant picker,
 * upload own art, edit metadata, confirm/reject, delete. Drag handle uses
 * dnd-kit's useSortable listeners (keyboard + pointer reorder).
 */
export function SortableShotCard({
  projectId,
  sceneId,
  shot,
  panelNumber,
}: SortableShotCardProps) {
  const [editing, setEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const state = shotStatusBadge(shot);
  const camera = [shot.size, shot.angle, shot.movement, shot.lens]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--s2)]"
    >
      {/* Header row: panel number, drag handle, status */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded-md p-1 text-[var(--tx-3)] hover:bg-[var(--s3)] hover:text-[var(--tx)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={`Reorder panel ${panelNumber}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <span className="font-data text-[11px] font-semibold text-[var(--tx-2)]">
          Panel {panelNumber}
        </span>
        <Badge variant={state.variant} className="ml-auto text-[10px]">
          {state.label}
        </Badge>
      </div>

      {/* Frame preview */}
      <div className="relative aspect-video w-full bg-[var(--s3)]">
        {shot.selectedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot.selectedUrl}
            alt={shot.action ?? `Panel ${panelNumber}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--tx-3)]">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="text-[11px]">No panel rendered</span>
          </div>
        )}
      </div>

      {/* Variant strip — selectable frames */}
      {shot.frames.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-[var(--line)] px-3 py-2">
          {shot.frames.map((f) => (
            <form key={f.id} action={selectFrameAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="sceneId" value={sceneId} />
              <input type="hidden" name="shotId" value={shot.id} />
              <input type="hidden" name="frameId" value={f.id} />
              <button
                type="submit"
                className={`block size-12 shrink-0 overflow-hidden rounded-md ring-2 transition-[box-shadow] focus-visible:outline-none focus-visible:ring-[var(--ring)] ${
                  f.isSelected
                    ? "ring-[var(--brand)]"
                    : "ring-transparent hover:ring-[var(--line-2)]"
                }`}
                aria-label={f.isSelected ? "Selected variant" : "Use this variant"}
                aria-pressed={f.isSelected}
              >
                {f.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.signedUrl}
                    alt="Variant"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[var(--s1)] text-[9px] text-[var(--tx-3)]">
                    …
                  </span>
                )}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* Metadata + controls */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {editing ? (
          <form
            action={updateShotAction}
            className="space-y-2"
            onSubmit={() => setEditing(false)}
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="sceneId" value={sceneId} />
            <input type="hidden" name="id" value={shot.id} />
            <textarea
              name="action"
              defaultValue={shot.action ?? ""}
              rows={2}
              placeholder="Action / description"
              className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 py-1.5 text-[12px] text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Shot action"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <select
                name="size"
                defaultValue={shot.size ?? ""}
                aria-label="Shot size"
                className="h-7 rounded-md border border-[var(--line-2)] bg-[var(--s1)] px-1 text-[11px] text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Size</option>
                {SHOT_SIZES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                name="angle"
                defaultValue={shot.angle ?? ""}
                aria-label="Shot angle"
                className="h-7 rounded-md border border-[var(--line-2)] bg-[var(--s1)] px-1 text-[11px] text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Angle</option>
                {SHOT_ANGLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                name="movement"
                defaultValue={shot.movement ?? ""}
                aria-label="Shot movement"
                className="h-7 rounded-md border border-[var(--line-2)] bg-[var(--s1)] px-1 text-[11px] text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Move</option>
                {SHOT_MOVEMENTS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                name="lens"
                defaultValue={shot.lens ?? ""}
                placeholder="Lens (e.g. 35mm)"
                aria-label="Lens"
                className="h-7 rounded-md border border-[var(--line-2)] bg-[var(--s1)] px-2 text-[11px] text-[var(--tx)] placeholder:text-[var(--tx-3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
              <input
                name="shotNumber"
                defaultValue={shot.shot_number ?? ""}
                placeholder="Shot # (e.g. 1A)"
                aria-label="Shot number"
                className="h-7 rounded-md border border-[var(--line-2)] bg-[var(--s1)] px-2 text-[11px] text-[var(--tx)] placeholder:text-[var(--tx-3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>
            <div className="flex gap-1.5">
              <Button type="submit" variant="ember" size="xs">
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            {camera && (
              <p className="font-data text-[10px] uppercase tracking-wide text-[var(--tx-3)]">
                {camera}
              </p>
            )}
            <p className="text-[12px] leading-snug text-[var(--tx-2)]">
              {shot.action ?? "—"}
            </p>

            {/* Control buttons */}
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              <form action={renderShotAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sceneId" value={sceneId} />
                <input type="hidden" name="shotId" value={shot.id} />
                <Button type="submit" variant="secondary" size="xs">
                  {shot.selectedUrl ? "Regenerate" : "Generate"}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>

              {/* Upload own art */}
              <label className="inline-flex cursor-pointer items-center rounded-[min(var(--radius-md),10px)] px-2 py-1 text-xs text-[var(--tx-2)] hover:bg-[var(--s3)] hover:text-[var(--tx)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                Upload
                <UploadFrameInput projectId={projectId} shotId={shot.id} />
              </label>

              <form action={setShotStatusAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sceneId" value={sceneId} />
                <input type="hidden" name="id" value={shot.id} />
                <input type="hidden" name="status" value="confirmed" />
                <Button type="submit" variant="ghost" size="xs">
                  Confirm
                </Button>
              </form>

              <form action={setShotStatusAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sceneId" value={sceneId} />
                <input type="hidden" name="id" value={shot.id} />
                <input type="hidden" name="status" value="rejected" />
                <Button type="submit" variant="ghost" size="xs">
                  Reject
                </Button>
              </form>

              <form action={deleteShotAction} className="ml-auto">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sceneId" value={sceneId} />
                <input type="hidden" name="id" value={shot.id} />
                <Button type="submit" variant="destructive" size="xs">
                  Delete
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * File input that auto-submits its enclosing form on change (upload own art).
 * Kept inline so the <label> wraps both the visible text and the hidden input.
 */
function UploadFrameInput({
  projectId,
  shotId,
}: {
  projectId: string;
  shotId: string;
}) {
  return (
    <form action={uploadFrameAction} className="contents">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="shotId" value={shotId} />
      <input
        type="file"
        name="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload your own panel art"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}
