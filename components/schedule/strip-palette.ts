// Strip color palette — INT/EXT × time-of-day → a design-token color.
//
// WHY a config object (not a hardcoded White/Yellow/Blue/Green mapping):
// the classic four-color stripboard convention is studio-specific, not a
// standard, so we ship a sensible DEFAULT that resolves to the locked
// "Tungsten & Sage" category tokens (--cat-int-day / --cat-int-night /
// --cat-ext-day / --cat-ext-night). Because it's a plain exported object
// keyed by a normalized (intExt, timeOfDay) bucket, a later settings surface
// can swap the values per-project without touching component code.
//
// No hex is hardcoded here: every entry references a CSS variable defined in
// the design system, so strips stay on-theme in both Umber (dark) and Kraft
// (light) modes automatically.

/** Coarse INT/EXT bucket. `null` = unknown/unspecified. */
export type IntExtBucket = "int" | "ext" | "intext" | null;

/** Coarse time-of-day bucket. `null` = unknown/unspecified. */
export type TimeBucket = "day" | "night" | null;

/** A palette entry: the CSS var that drives the strip's accent color. */
export interface StripColorToken {
  /** CSS var() reference for the strip's accent/spine color. */
  cssVar: string;
  /** Human label for a11y / tooltips. */
  label: string;
}

/**
 * The default, overridable palette. Keys are `${intExt}:${time}` buckets.
 * Values point at design-system category tokens — never raw hex.
 */
export const DEFAULT_STRIP_PALETTE: Record<string, StripColorToken> = {
  "int:day": { cssVar: "var(--cat-int-day)", label: "Interior · Day" },
  "int:night": { cssVar: "var(--cat-int-night)", label: "Interior · Night" },
  "ext:day": { cssVar: "var(--cat-ext-day)", label: "Exterior · Day" },
  "ext:night": { cssVar: "var(--cat-ext-night)", label: "Exterior · Night" },
  // INT/EXT scenes lean on the interior tokens (the company is on a set first).
  "intext:day": { cssVar: "var(--cat-int-day)", label: "Int/Ext · Day" },
  "intext:night": { cssVar: "var(--cat-int-night)", label: "Int/Ext · Night" },
};

/** Neutral fallback when INT/EXT or time-of-day can't be resolved. */
export const NEUTRAL_STRIP_TOKEN: StripColorToken = {
  cssVar: "var(--tx-3)",
  label: "Uncategorized",
};

/** Normalize a free-text int_ext value (DB column is loose text) to a bucket. */
export function normalizeIntExt(raw: string | null | undefined): IntExtBucket {
  if (!raw) return null;
  const v = raw.toUpperCase().replace(/[.\s]/g, "");
  if (v.startsWith("INT/EXT") || v.startsWith("EXT/INT") || v === "I/E" || v === "E/I") {
    return "intext";
  }
  if (v.startsWith("INT")) return "int";
  if (v.startsWith("EXT")) return "ext";
  return null;
}

/** Normalize a free-text time_of_day value to a day/night bucket. */
export function normalizeTime(raw: string | null | undefined): TimeBucket {
  if (!raw) return null;
  const v = raw.toUpperCase();
  // Night-ish first (DUSK/EVENING read as night for color purposes).
  if (/(NIGHT|DUSK|EVENING|MIDNIGHT)/.test(v)) return "night";
  if (/(DAY|DAWN|MORNING|NOON|AFTERNOON|CONTINUOUS|LATER)/.test(v)) return "day";
  return null;
}

/**
 * Resolve the strip color token for a scene's INT/EXT × time-of-day.
 * Pass an alternative palette to override the default mapping.
 */
export function stripColor(
  intExt: string | null | undefined,
  timeOfDay: string | null | undefined,
  palette: Record<string, StripColorToken> = DEFAULT_STRIP_PALETTE,
): StripColorToken {
  const i = normalizeIntExt(intExt);
  const t = normalizeTime(timeOfDay);
  if (i === null || t === null) return NEUTRAL_STRIP_TOKEN;
  return palette[`${i}:${t}`] ?? NEUTRAL_STRIP_TOKEN;
}
