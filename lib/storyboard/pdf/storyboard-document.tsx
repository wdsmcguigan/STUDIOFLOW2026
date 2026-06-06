/**
 * StoryboardDocument — @react-pdf/renderer PDF component for a scene storyboard.
 *
 * Accepts a SceneBoard and a human-readable scene label, then renders a
 * print-ready PDF structured as:
 *   1. Title band — the scene label + shot count
 *   2. Panel grid — one panel per shot, 3 columns × N rows:
 *      - image when selectedUrl is set (data URI or https signed URL)
 *      - placeholder box ("no panel yet") when selectedUrl is null
 *      - caption: shot ordinal, size/angle, and action text
 *
 * NOTE on colors: react-pdf cannot read CSS custom properties. The hex values
 * below are hard-coded constants that mirror the Tungsten & Sage tokens defined
 * in app/globals.css. This is the ONE place in the codebase where hard-coded
 * color hex values are intentional and allowed.
 *
 * Umber dark palette (app/globals.css .dark):
 *   --bg #14110c  --s1 #1a1610  --s2 #221c14  --s3 #2c2418
 *   --tx #f3ece1  --tx-2 rgba(243,236,225,.62)  --brand #f4a93c  --brand-ink #1d1303
 *
 * Kraft light palette (app/globals.css :root):
 *   --bg #efe7d8  --s1 #f8f1e4  --s2 #fcf7ee  --s3 #eadfcc
 *   --tx #2d2418  --tx-2 rgba(45,36,24,.62)  --brand #bf6a2e
 *
 * The PDF uses the Umber dark theme for the title band and Kraft light for
 * the body grid — matching the call sheet document's rendering convention.
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { SceneBoard, ShotWithFrames } from "@/lib/storyboard/schema";

// ---------------------------------------------------------------------------
// Tungsten & Sage palette — react-pdf can't read CSS vars; values mirror app/globals.css
// Using the Umber (dark) theme for the title band; Kraft (light) for body panels.
// ---------------------------------------------------------------------------
const C = {
  // Umber dark — title band background
  umberBg: "#14110c",
  umberS1: "#1a1610",
  umberS2: "#221c14",
  umberTx: "#f3ece1",
  umberTx2: "#9b8f7e", // approx rgba(243,236,225,.62) on dark bg — matches call-sheet-document.tsx
  // Brand amber — Umber variant (on dark)
  brand: "#f4a93c",
  brandInk: "#1d1303",
  // Kraft light — panel grid background
  kraftBg: "#efe7d8",
  kraftS1: "#f8f1e4",
  kraftS2: "#fcf7ee",
  kraftS3: "#eadfcc",
  kraftTx: "#2d2418",
  kraftTx2: "#6b5a45", // approx rgba(45,36,24,.62) on light bg — matches call-sheet-document.tsx
  kraftLine: "#d0c4b0", // approx rgba(64,46,24,.10) rendered solid
  // Placeholder panel fill
  placeholder: "#e2d8c8",
  // White
  white: "#ffffff",
} as const;

// ---------------------------------------------------------------------------
// Typography sizes (pt)
// ---------------------------------------------------------------------------
const SZ = {
  xs: 6,
  sm: 7,
  base: 8,
  md: 9,
  lg: 11,
  xl: 14,
} as const;

// ---------------------------------------------------------------------------
// Panel grid layout constants
// Landscape Letter (792 × 612 pt) with 24 pt horizontal / 24 pt vertical margins.
// 3 columns, 2 pt gutter.
// ---------------------------------------------------------------------------
const COLS = 3;
const PAGE_W = 792;
const MARGIN_H = 24;
const MARGIN_V = 24;
const GUTTER = 6;

// Title band height + vertical padding inside the band
const TITLE_BAND_H = 36;
const USABLE_W = PAGE_W - MARGIN_H * 2;
const PANEL_W = (USABLE_W - GUTTER * (COLS - 1)) / COLS;
// Panel aspect: we target 16:9 image region + caption strip
const IMAGE_H = Math.round(PANEL_W * (9 / 16));
const CAPTION_H = 30;

// ---------------------------------------------------------------------------
// StyleSheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    backgroundColor: C.kraftBg,
    paddingTop: MARGIN_V,
    paddingBottom: MARGIN_V,
    paddingHorizontal: MARGIN_H,
    fontFamily: "Helvetica",
    fontSize: SZ.base,
    color: C.kraftTx,
  },

  // ── Title band ──────────────────────────────────────────────────────────
  titleBand: {
    backgroundColor: C.umberBg,
    borderRadius: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: TITLE_BAND_H,
  },
  titleText: {
    fontSize: SZ.xl,
    fontFamily: "Helvetica-Bold",
    color: C.umberTx,
    flex: 1,
  },
  shotCount: {
    fontSize: SZ.sm,
    color: C.umberTx2,
    fontFamily: "Courier",
  },

  // ── Panel grid ────────────────────────────────────────────────────────
  panelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // ── Individual panel ─────────────────────────────────────────────────
  panel: {
    width: PANEL_W,
    marginRight: GUTTER,
    marginBottom: GUTTER,
    backgroundColor: C.kraftS1,
    borderRadius: 3,
    overflow: "hidden",
    borderColor: C.kraftLine,
    borderWidth: 0.5,
  },
  // Remove right gutter from every 3rd panel (last column) to avoid overflow
  panelLastCol: {
    marginRight: 0,
  },

  // ── Panel image region ───────────────────────────────────────────────
  imageContainer: {
    width: PANEL_W,
    height: IMAGE_H,
    backgroundColor: C.kraftS3,
    overflow: "hidden",
  },
  panelImage: {
    width: PANEL_W,
    height: IMAGE_H,
    objectFit: "contain",
  },
  placeholderBox: {
    width: PANEL_W,
    height: IMAGE_H,
    backgroundColor: C.placeholder,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: SZ.sm,
    color: C.kraftTx2,
    fontStyle: "italic",
  },

  // ── Panel caption strip ──────────────────────────────────────────────
  caption: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    height: CAPTION_H,
    backgroundColor: C.kraftS2,
    borderTopColor: C.kraftLine,
    borderTopWidth: 0.5,
  },
  captionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  shotOrdinal: {
    fontSize: SZ.sm,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
  },
  cameraInfo: {
    fontSize: SZ.xs,
    color: C.kraftTx2,
    fontFamily: "Courier",
  },
  actionText: {
    fontSize: SZ.xs,
    color: C.kraftTx,
    lineHeight: 1.3,
  },

  // ── Empty state ──────────────────────────────────────────────────────
  emptyState: {
    marginTop: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: SZ.md,
    color: C.kraftTx2,
    fontStyle: "italic",
  },
});

// ---------------------------------------------------------------------------
// Helper: format shot ordinal as "Shot 1", "Shot 2", etc.
// ---------------------------------------------------------------------------
function formatOrdinal(n: number): string {
  return `Shot ${n + 1}`;
}

// ---------------------------------------------------------------------------
// Helper: format camera info — "MCU / eye" or "—" if both null
// ---------------------------------------------------------------------------
function formatCamera(shot: ShotWithFrames): string {
  const parts: string[] = [];
  if (shot.size) parts.push(shot.size);
  if (shot.angle) parts.push(shot.angle);
  if (shot.movement && shot.movement !== "static") parts.push(shot.movement);
  if (shot.lens) parts.push(shot.lens);
  return parts.length > 0 ? parts.join(" / ") : "—";
}

// ---------------------------------------------------------------------------
// Helper: truncate action text for caption
// ---------------------------------------------------------------------------
function truncateAction(action: string | null, maxChars = 80): string {
  if (!action) return "—";
  return action.length > maxChars ? action.slice(0, maxChars - 1) + "…" : action;
}

// ---------------------------------------------------------------------------
// ShotPanel — one storyboard panel
// ---------------------------------------------------------------------------
function ShotPanel({
  shot,
  colIndex,
}: {
  shot: ShotWithFrames;
  colIndex: number;
}) {
  const isLastCol = (colIndex % COLS) === COLS - 1;
  const panelStyle = isLastCol
    ? [styles.panel, styles.panelLastCol]
    : styles.panel;

  return (
    <View style={panelStyle}>
      {/* Image region */}
      <View style={styles.imageContainer}>
        {shot.selectedUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={shot.selectedUrl} style={styles.panelImage} />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>no panel yet</Text>
          </View>
        )}
      </View>

      {/* Caption strip */}
      <View style={styles.caption}>
        <View style={styles.captionTop}>
          <Text style={styles.shotOrdinal}>{formatOrdinal(shot.ordinal)}</Text>
          <Text style={styles.cameraInfo}>{formatCamera(shot)}</Text>
        </View>
        <Text style={styles.actionText}>{truncateAction(shot.action)}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// StoryboardDocument — the main exported document component
// ---------------------------------------------------------------------------

export function StoryboardDocument({
  board,
  sceneLabel,
}: {
  board: SceneBoard;
  sceneLabel: string;
}) {
  const shots = board.shots;
  const shotCount = shots.length;

  return (
    <Document
      title={`Storyboard — ${sceneLabel}`}
      author="StudioFlow"
      creator="StudioFlow"
    >
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Title band */}
        <View style={styles.titleBand}>
          <Text style={styles.titleText}>{sceneLabel}</Text>
          <Text style={styles.shotCount}>
            {shotCount === 0
              ? "no shots"
              : shotCount === 1
              ? "1 shot"
              : `${shotCount} shots`}
          </Text>
        </View>

        {/* Panel grid — or empty state */}
        {shotCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No shots for this scene yet.</Text>
          </View>
        ) : (
          <View style={styles.panelGrid}>
            {shots.map((shot, i) => (
              <ShotPanel key={shot.id} shot={shot} colIndex={i} />
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// renderStoryboardPdf — helper that keeps JSX in this .tsx file so route.ts
// (a .ts file) can call it without hosting JSX itself.
// Mirrors renderCallSheetPdf in lib/callsheet/pdf/call-sheet-document.tsx.
// ---------------------------------------------------------------------------

export async function renderStoryboardPdf(
  board: SceneBoard,
  sceneLabel: string,
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(
    <StoryboardDocument board={board} sceneLabel={sceneLabel} />,
  ) as Promise<Buffer>;
}
