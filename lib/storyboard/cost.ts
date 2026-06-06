// Pure cost-estimation utilities for AI image generation.
// No I/O, no Date.now(), no side effects — safe to call from any context.

/**
 * Per-image price estimates (USD) for supported generation models.
 * These are static estimates for cost-counter display; actual billing
 * depends on the provider's live pricing.
 *
 * gemini-2.5-flash-image: $0.039 per image (Google AI pricing, 2025-06)
 */
export const PRICE_PER_IMAGE: Record<string, number> = {
  "gemini-2.5-flash-image": 0.039,
};

/**
 * Fallback per-image price used when the model is not in PRICE_PER_IMAGE.
 * Conservative estimate that matches the known flash model price so the
 * counter is never wildly off for new or experimental model ids.
 */
export const DEFAULT_PRICE = 0.039;

/**
 * Estimate the cost (USD) for generating `n` images with a given model.
 *
 * @param model - The model id (e.g. "gemini-2.5-flash-image")
 * @param n     - Number of images to generate (must be ≥ 0)
 * @returns     Estimated cost in USD; 0 when n === 0.
 */
export function estimateCost(model: string, n: number): number {
  if (n === 0) return 0;
  const price = PRICE_PER_IMAGE[model] ?? DEFAULT_PRICE;
  return price * n;
}
