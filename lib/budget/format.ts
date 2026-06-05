/**
 * Budget display formatting utilities.
 *
 * UI-only helpers — raw numeric values stay unformatted everywhere else.
 * These functions are safe to call on both server and client (no DOM deps).
 */

import type { Section } from "@/lib/budget/schema";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a number as a US dollar amount (no cents).
 * e.g. 12345.67 → "$12,346"
 */
export function formatCurrency(value: number): string {
  return USD.format(value);
}

/**
 * Human-readable display names for the four budget sections.
 * Typed against the Section enum so a schema change surfaces as a compile error.
 */
export const SECTION_LABELS: Record<Section, string> = {
  atl: "Above the Line",
  btl: "Below the Line",
  post: "Post-Production",
  other: "Other",
};
