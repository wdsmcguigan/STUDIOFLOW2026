/**
 * CallSheetDocument — @react-pdf/renderer PDF component for a call sheet.
 *
 * Accepts an AssembledCallSheet and renders a print-ready PDF structured as:
 *   1. Header band   — production info, day, date, call time, sun times, weather, hospital
 *   2. Scenes table  — scene # / INT-EXT / set / time-of-day / page eighths / synopsis
 *   3. Cast table    — name / character / call / makeup / wardrobe / on-set
 *   4. Crew sections — one department heading + member rows per CrewDepartmentBlock
 *
 * NOTE on colors: react-pdf cannot read CSS custom properties. The hex values
 * below are hard-coded constants that mirror the Tungsten & Sage tokens defined
 * in app/globals.css. This is the ONE place in the codebase where hardcoded
 * color hex values are intentional and allowed.
 * // Tungsten & Sage palette — react-pdf can't read CSS vars; values mirror app/globals.css
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { AssembledCallSheet, CastCallRow, CrewDepartmentBlock } from "@/lib/callsheet/schema";

// ---------------------------------------------------------------------------
// Tungsten & Sage palette — react-pdf can't read CSS vars; values mirror app/globals.css
// Using the Umber (dark) theme as brand default for the PDF header band,
// and Kraft (light) parchment tones for the body sections.
// ---------------------------------------------------------------------------
const C = {
  // Umber dark — header band background
  umberBg: "#14110c",
  umberS1: "#1a1610",
  umberS2: "#221c14",
  umberTx: "#f3ece1",
  umberTx2: "#9b8f7e", // approx rgba(243,236,225,.62) on dark bg
  // Brand amber
  brand: "#f4a93c",
  brandInk: "#1d1303",
  // Kraft light — body background
  kraftBg: "#efe7d8",
  kraftS1: "#f8f1e4",
  kraftS2: "#fcf7ee",
  kraftS3: "#eadfcc",
  kraftTx: "#2d2418",
  kraftTx2: "#6b5a45", // approx rgba(45,36,24,.62) on light bg
  kraftLine: "#d0c4b0", // approx rgba(64,46,24,.10) rendered solid
  // Status
  ok: "#5fb87a",
  warn: "#e8b14a",
  // White
  white: "#ffffff",
} as const;

// ---------------------------------------------------------------------------
// Shared typography sizes (pt)
// ---------------------------------------------------------------------------
const SZ = {
  xs: 6,
  sm: 7,
  base: 8,
  md: 9,
  lg: 11,
  xl: 14,
  xxl: 18,
} as const;

// ---------------------------------------------------------------------------
// StyleSheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Page
  page: {
    backgroundColor: C.kraftBg,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: SZ.base,
    color: C.kraftTx,
  },

  // ── Header band ──────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: C.umberBg,
    borderRadius: 4,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  productionName: {
    fontSize: SZ.xl,
    fontFamily: "Helvetica-Bold",
    color: C.umberTx,
    flex: 1,
  },
  revisionBadge: {
    fontSize: SZ.sm,
    fontFamily: "Helvetica-Bold",
    color: C.brandInk,
    backgroundColor: C.brand,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dayLine: {
    fontSize: SZ.md,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    marginBottom: 3,
  },
  headerMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  headerMetaItem: {
    fontSize: SZ.sm,
    color: C.umberTx2,
    marginRight: 14,
    marginBottom: 2,
  },
  headerMetaLabel: {
    fontFamily: "Helvetica-Bold",
    color: C.umberTx,
  },
  headerDivider: {
    borderBottomColor: "#3a3025",
    borderBottomWidth: 0.5,
    marginVertical: 6,
  },
  hospitalLine: {
    fontSize: SZ.xs,
    color: C.umberTx2,
    marginTop: 2,
  },
  notesLine: {
    fontSize: SZ.xs,
    color: C.umberTx2,
    marginTop: 3,
    fontStyle: "italic",
  },

  // ── Section wrapper ──────────────────────────────────────────────────────
  section: {
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: SZ.sm,
    fontFamily: "Helvetica-Bold",
    color: C.kraftTx2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomColor: C.kraftLine,
    borderBottomWidth: 0.5,
  },

  // ── Table shared ─────────────────────────────────────────────────────────
  tableRow: {
    flexDirection: "row",
    borderBottomColor: C.kraftLine,
    borderBottomWidth: 0.5,
    paddingVertical: 3,
    alignItems: "flex-start",
  },
  tableRowAlt: {
    backgroundColor: C.kraftS2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomColor: C.kraftLine,
    borderBottomWidth: 1,
    paddingVertical: 3,
    backgroundColor: C.kraftS3,
  },
  cellBase: {
    fontSize: SZ.sm,
    color: C.kraftTx,
    paddingHorizontal: 3,
  },
  cellHeader: {
    fontSize: SZ.xs,
    fontFamily: "Helvetica-Bold",
    color: C.kraftTx2,
    paddingHorizontal: 3,
    textTransform: "uppercase",
  },
  emptyText: {
    fontSize: SZ.sm,
    color: C.kraftTx2,
    fontStyle: "italic",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },

  // ── Scene table columns ───────────────────────────────────────────────────
  sceneNumCol: { width: "8%", fontFamily: "Courier" },
  sceneIntExtCol: { width: "8%" },
  sceneSetCol: { width: "26%" },
  sceneTodCol: { width: "9%" },
  sceneEighthsCol: { width: "9%", fontFamily: "Courier" },
  sceneSynopsisCol: { flex: 1 },

  // ── Cast table columns ────────────────────────────────────────────────────
  castNameCol: { width: "20%" },
  castCharCol: { width: "18%" },
  castCallCol: { width: "12%", fontFamily: "Courier" },
  castMakeupCol: { width: "12%", fontFamily: "Courier" },
  castWardrobeCol: { width: "12%", fontFamily: "Courier" },
  castOnSetCol: { width: "12%", fontFamily: "Courier" },
  castContactCol: { flex: 1 },

  // ── Crew table columns ────────────────────────────────────────────────────
  crewDeptBand: {
    backgroundColor: C.umberS2,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 6,
    marginBottom: 2,
  },
  crewDeptLabel: {
    fontSize: SZ.sm,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  crewNameCol: { width: "28%" },
  crewPositionCol: { width: "30%" },
  crewCallCol: { width: "14%", fontFamily: "Courier" },
  crewPhoneCol: { flex: 1 },
});

// ---------------------------------------------------------------------------
// Helper: format page eighths as "X/8" or "—"
// ---------------------------------------------------------------------------
function formatEighths(n: number | null): string {
  if (n == null) return "—";
  return `${n}/8`;
}

// ---------------------------------------------------------------------------
// Helper: null/undefined → "—"
// ---------------------------------------------------------------------------
function fmt(v: string | null | undefined): string {
  return v ?? "—";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeaderBand({ header }: { header: AssembledCallSheet["header"] }) {
  const dayLabel =
    header.dayNumber != null && header.dayCount != null
      ? `Day ${header.dayNumber} of ${header.dayCount}`
      : null;

  return (
    <View style={styles.headerBand}>
      {/* Top row: production name + revision badge */}
      <View style={styles.headerRow}>
        <Text style={styles.productionName}>{header.production}</Text>
        {header.revision > 0 && (
          <Text style={styles.revisionBadge}>Rev {header.revision}</Text>
        )}
      </View>

      {/* Day + date */}
      {(dayLabel || header.date) && (
        <Text style={styles.dayLine}>
          {[dayLabel, header.date].filter(Boolean).join(" — ")}
        </Text>
      )}

      {/* Divider */}
      <View style={styles.headerDivider} />

      {/* Meta row: call / sunrise / sunset / weather */}
      <View style={styles.headerMeta}>
        {header.generalCallTime && (
          <Text style={styles.headerMetaItem}>
            <Text style={styles.headerMetaLabel}>General Call: </Text>
            {header.generalCallTime}
          </Text>
        )}
        {header.sunrise && (
          <Text style={styles.headerMetaItem}>
            <Text style={styles.headerMetaLabel}>Sunrise: </Text>
            {header.sunrise}
          </Text>
        )}
        {header.sunset && (
          <Text style={styles.headerMetaItem}>
            <Text style={styles.headerMetaLabel}>Sunset: </Text>
            {header.sunset}
          </Text>
        )}
        {header.weather && (
          <Text style={styles.headerMetaItem}>
            <Text style={styles.headerMetaLabel}>Weather: </Text>
            {header.weather}
          </Text>
        )}
      </View>

      {/* Hospital */}
      {(header.hospitalName || header.hospitalAddress) && (
        <Text style={styles.hospitalLine}>
          <Text style={{ fontFamily: "Helvetica-Bold", color: C.umberTx }}>
            Nearest Hospital:{" "}
          </Text>
          {[header.hospitalName, header.hospitalAddress].filter(Boolean).join(" — ")}
        </Text>
      )}

      {/* Notes */}
      {header.notes && (
        <Text style={styles.notesLine}>Note: {header.notes}</Text>
      )}
    </View>
  );
}

function ScenesTable({ scenes }: { scenes: AssembledCallSheet["scenes"] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Scenes</Text>
      {/* Header row */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.cellHeader, styles.sceneNumCol]}>Sc#</Text>
        <Text style={[styles.cellHeader, styles.sceneIntExtCol]}>Int/Ext</Text>
        <Text style={[styles.cellHeader, styles.sceneSetCol]}>Set / Location</Text>
        <Text style={[styles.cellHeader, styles.sceneTodCol]}>ToD</Text>
        <Text style={[styles.cellHeader, styles.sceneEighthsCol]}>Pages</Text>
        <Text style={[styles.cellHeader, styles.sceneSynopsisCol]}>Synopsis</Text>
      </View>

      {scenes.length === 0 ? (
        <Text style={styles.emptyText}>No scenes scheduled.</Text>
      ) : (
        scenes.map((scene, i) => (
          <View
            key={i}
            style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
          >
            <Text style={[styles.cellBase, styles.sceneNumCol]}>
              {fmt(scene.sceneNumber)}
            </Text>
            <Text style={[styles.cellBase, styles.sceneIntExtCol]}>
              {fmt(scene.intExt)}
            </Text>
            <Text style={[styles.cellBase, styles.sceneSetCol]}>
              {fmt(scene.setOrLocation)}
            </Text>
            <Text style={[styles.cellBase, styles.sceneTodCol]}>
              {fmt(scene.timeOfDay)}
            </Text>
            <Text style={[styles.cellBase, styles.sceneEighthsCol]}>
              {formatEighths(scene.pageEighths)}
            </Text>
            <Text style={[styles.cellBase, styles.sceneSynopsisCol]}>
              {fmt(scene.synopsis)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function CastTable({ cast }: { cast: CastCallRow[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Cast</Text>
      {/* Header row */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.cellHeader, styles.castNameCol]}>Name</Text>
        <Text style={[styles.cellHeader, styles.castCharCol]}>Character</Text>
        <Text style={[styles.cellHeader, styles.castCallCol]}>Call</Text>
        <Text style={[styles.cellHeader, styles.castMakeupCol]}>Makeup</Text>
        <Text style={[styles.cellHeader, styles.castWardrobeCol]}>Wardrobe</Text>
        <Text style={[styles.cellHeader, styles.castOnSetCol]}>On Set</Text>
        <Text style={[styles.cellHeader, styles.castContactCol]}>Contact</Text>
      </View>

      {cast.length === 0 ? (
        <Text style={styles.emptyText}>No cast called.</Text>
      ) : (
        cast.map((row, i) => (
          <View
            key={row.personId}
            style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
          >
            <Text style={[styles.cellBase, styles.castNameCol]}>{row.name}</Text>
            <Text style={[styles.cellBase, styles.castCharCol]}>
              {fmt(row.characterName)}
            </Text>
            <Text style={[styles.cellBase, styles.castCallCol]}>
              {fmt(row.callTime)}
            </Text>
            <Text style={[styles.cellBase, styles.castMakeupCol]}>
              {fmt(row.makeup)}
            </Text>
            <Text style={[styles.cellBase, styles.castWardrobeCol]}>
              {fmt(row.wardrobe)}
            </Text>
            <Text style={[styles.cellBase, styles.castOnSetCol]}>
              {fmt(row.onSet)}
            </Text>
            <Text style={[styles.cellBase, styles.castContactCol]}>
              {row.contactPhone ?? row.contactEmail ?? "—"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function CrewSection({ block, startIndex }: { block: CrewDepartmentBlock; startIndex: number }) {
  return (
    <View>
      <View style={styles.crewDeptBand}>
        <Text style={styles.crewDeptLabel}>{block.department}</Text>
      </View>

      {/* Column headers */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.cellHeader, styles.crewNameCol]}>Name</Text>
        <Text style={[styles.cellHeader, styles.crewPositionCol]}>Position</Text>
        <Text style={[styles.cellHeader, styles.crewCallCol]}>Call</Text>
        <Text style={[styles.cellHeader, styles.crewPhoneCol]}>Contact</Text>
      </View>

      {block.members.length === 0 ? (
        <Text style={styles.emptyText}>No crew called.</Text>
      ) : (
        block.members.map((member, i) => (
          <View
            key={member.crewMemberId}
            style={
              (startIndex + i) % 2 === 1
                ? [styles.tableRow, styles.tableRowAlt]
                : styles.tableRow
            }
          >
            <Text style={[styles.cellBase, styles.crewNameCol]}>{member.name}</Text>
            <Text style={[styles.cellBase, styles.crewPositionCol]}>
              {member.position || "—"}
            </Text>
            <Text style={[styles.cellBase, styles.crewCallCol]}>
              {fmt(member.callTime)}
            </Text>
            <Text style={[styles.cellBase, styles.crewPhoneCol]}>
              {member.contactPhone ?? member.contactEmail ?? "—"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function CrewTable({ crewByDepartment }: { crewByDepartment: CrewDepartmentBlock[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Crew</Text>

      {crewByDepartment.length === 0 ? (
        <Text style={styles.emptyText}>No crew called.</Text>
      ) : (
        crewByDepartment.map((block, i) => (
          <CrewSection key={block.department} block={block} startIndex={i * 2} />
        ))
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main document component
// ---------------------------------------------------------------------------

export function CallSheetDocument({
  callSheet,
}: {
  callSheet: AssembledCallSheet;
}) {
  return (
    <Document
      title={`Call Sheet — ${callSheet.header.production} Day ${callSheet.header.dayNumber}`}
      author="StudioFlow"
      creator="StudioFlow"
    >
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <HeaderBand header={callSheet.header} />
        <ScenesTable scenes={callSheet.scenes} />
        <CastTable cast={callSheet.cast} />
        <CrewTable crewByDepartment={callSheet.crewByDepartment} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// renderCallSheetPdf — helper that keeps JSX in this .tsx file so route.ts
// (a .ts file) can call it without hosting JSX itself.
// ---------------------------------------------------------------------------

export async function renderCallSheetPdf(
  callSheet: AssembledCallSheet,
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(<CallSheetDocument callSheet={callSheet} />) as Promise<Buffer>;
}
