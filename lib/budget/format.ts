/**
 * Budget display formatting utilities.
 *
 * UI-only helpers — raw numeric values stay unformatted everywhere else.
 * These functions are safe to call on both server and client (no DOM deps).
 */

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
