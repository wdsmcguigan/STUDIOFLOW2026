import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * AIDot — small sage→amethyst gradient dot that marks any AI-associated element.
 *
 * Rules (spec §3.3):
 * - Gradient is ONLY for trim / dot / thin spine — never fills a solid shape.
 * - No sparkle icon; AI is marked by the dot + label/placement, not hue alone.
 * - aria-hidden: decorative; the surrounding label carries the accessible meaning.
 */
export function AIDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-[7px] flex-none rounded-full", className)}
      style={{ background: "var(--ai-grad)", boxShadow: "0 0 4px var(--ai-glow-halo)" }}
    />
  );
}

/**
 * AIChip — inline pill for labelling AI-generated content or actions.
 *
 * Uses frosted glass (--ai-glass) + gradient border-box + composite glow-sm.
 * The gradient appears only as the 1px border trim; the fill is the neutral glass.
 */
export function AIChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold",
        className
      )}
      style={{
        color: "var(--ai-ink)",
        background: "var(--ai-glass) padding-box, var(--ai-grad) border-box",
        border: "1px solid transparent",
        backdropFilter: "blur(8px) saturate(130%)",
        WebkitBackdropFilter: "blur(8px) saturate(130%)",
        boxShadow: "var(--ai-shadow-sm)",
      }}
    >
      <AIDot />
      {children}
    </span>
  );
}

/**
 * AISurface — frosted-glass container for AI suggestion content.
 *
 * Recipe (spec §3.3):
 * - Fill: neutral frosted glass (--ai-glass + backdrop-filter blur/saturate)
 * - Border: gradient (--ai-grad) via border-box — the gradient is ONLY trim
 * - Glow: composite inner sheen + faint amethyst halo (--ai-shadow)
 * - Dot marker: rendered by the consumer via <AIDot /> inside children
 * - No sparkle icon; no gradient fill on the solid shape
 *
 * Reduced-transparency fallback is handled by the .ai-surface utility in globals.css.
 */
export function AISurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Uses the .ai-surface utility class from globals.css which encodes the full recipe:
  // background: --ai-glass padding-box, --ai-grad border-box; border transparent; blur; --ai-shadow.
  // The reduced-transparency @media override in globals.css falls back to --s2 + no backdrop-filter.
  return (
    <div className={cn("ai-surface rounded-xl p-3", className)} style={{ color: "var(--tx)" }}>
      {children}
    </div>
  );
}

/**
 * AIDock — floating AI suggestion strip (the always-visible AI assistant tray).
 *
 * Layout: [gradient dot] [content flex-1] [optional dismiss] [optional action]
 * The action inside an AI surface may use amber (action = amber; gradient = AI only).
 * Caller is responsible for labelling "AI" via children text, not dot hue alone (a11y).
 */
export function AIDock({
  children,
  action,
  onDismiss,
}: {
  children: React.ReactNode;
  /** Amber CTA (e.g. an ember Button) — action inside AI surface may still be amber. */
  action?: React.ReactNode;
  /** Dismiss control (icon button, etc.). */
  onDismiss?: React.ReactNode;
}) {
  return (
    <div
      className="ai-surface flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ color: "var(--tx)" }}
    >
      <AIDot className="size-2.5" />
      <div className="flex-1 text-[11.5px] leading-snug">{children}</div>
      {onDismiss}
      {action}
    </div>
  );
}
