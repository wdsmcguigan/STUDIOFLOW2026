"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Strip as StripRow } from "@/lib/schedule/schema";
import { stripColor } from "./strip-palette";

/**
 * Resolved, display-ready scene info for a scene strip. Built server-side in
 * the page by walking strip.scene_segment_id → segment.scene_id → scene.
 * `null` everywhere is fine — the strip falls back to a neutral spine + label.
 */
export interface SceneLabel {
  sceneNumber: string | null;
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
  pageEighths: number | null;
}

interface StripProps {
  strip: StripRow;
  /** Present only for scene strips (resolved from the segment→scene map). */
  scene?: SceneLabel;
  /** projectId for the delete form. */
  projectId: string;
  deleteStripAction: (formData: FormData) => Promise<void>;
}

/** Render page-eighths (e.g. 11 → "1 3/8") in standard film notation. */
function formatEighths(eighths: number | null): string | null {
  if (eighths == null || eighths <= 0) return null;
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
}

/**
 * One sortable strip. Renders scene / day_break / banner distinctly.
 * Scene strips carry a left "spine" colored by the configurable palette
 * (INT/EXT × time-of-day → design token).
 */
export function Strip({ strip, scene, projectId, deleteStripAction }: StripProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: strip.id, data: { type: strip.type } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // --- Day break: a slim full-width rule between scene blocks --------------
  if (strip.type === "day_break") {
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="group flex cursor-grab items-center gap-2 rounded-md border border-dashed border-[var(--line-2)] bg-[var(--s1)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--tx-3)] active:cursor-grabbing"
      >
        <span aria-hidden className="flex-1 border-t border-dashed border-[var(--line-2)]" />
        Day break
        <span aria-hidden className="flex-1 border-t border-dashed border-[var(--line-2)]" />
        <DeleteButton stripId={strip.id} projectId={projectId} action={deleteStripAction} />
      </li>
    );
  }

  // --- Banner: an attention bar (e.g. "LUNCH", "COMPANY MOVE") -------------
  if (strip.type === "banner") {
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="group flex cursor-grab items-center gap-2 rounded-md border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-bold uppercase tracking-[1px] text-[var(--brand-on)] active:cursor-grabbing"
      >
        <span className="flex-1 truncate">{strip.banner_text ?? "Banner"}</span>
        <DeleteButton stripId={strip.id} projectId={projectId} action={deleteStripAction} />
      </li>
    );
  }

  // --- Scene strip --------------------------------------------------------
  const token = stripColor(scene?.intExt, scene?.timeOfDay);
  const eighthsLabel = formatEighths(scene?.pageEighths ?? null);

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title={token.label}
      className="group flex cursor-grab items-stretch overflow-hidden rounded-md border border-[var(--line)] bg-[var(--s2)] text-sm text-[var(--tx)] shadow-[0_1px_2px_var(--line)] active:cursor-grabbing"
    >
      {/* Color spine — derived from the configurable palette */}
      <span
        aria-hidden
        className="w-1.5 shrink-0"
        style={{ backgroundColor: token.cssVar }}
      />
      <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
        <span className="w-9 shrink-0 font-mono text-xs font-semibold text-[var(--tx-2)]">
          {scene?.sceneNumber ?? "—"}
        </span>
        <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
          {scene?.intExt ?? ""}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {scene?.locationSlug ?? <span className="text-[var(--tx-3)]">Untitled scene</span>}
        </span>
        {scene?.timeOfDay ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            {scene.timeOfDay}
          </span>
        ) : null}
        {eighthsLabel ? (
          <span className="shrink-0 font-mono text-xs text-[var(--tx-2)]">{eighthsLabel}</span>
        ) : null}
        <DeleteButton stripId={strip.id} projectId={projectId} action={deleteStripAction} />
      </div>
    </li>
  );
}

/**
 * Inline delete control. Rendered as a real form so it works without JS and
 * doesn't fight the dnd-kit listeners — pointer-down stops propagation so a
 * click on the X never starts a drag.
 */
function DeleteButton({
  stripId,
  projectId,
  action,
}: {
  stripId: string;
  projectId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form
      action={action}
      onPointerDown={(e) => e.stopPropagation()}
      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="id" value={stripId} />
      <button
        type="submit"
        aria-label="Delete strip"
        className="flex size-5 items-center justify-center rounded text-[var(--tx-3)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
