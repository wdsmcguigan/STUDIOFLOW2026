import stringSimilarity from "string-similarity";
import type { TextAnchor } from "@/lib/breakdown/schema";

export type AnchorState = "anchored" | "needs_review" | "orphaned";
export interface RelocateResult {
  anchorState: AnchorState;
  anchor: TextAnchor;
  score: number;
}

/**
 * Fuzzy threshold: must be ≥ this to qualify as needs_review.
 *
 * Calibrated empirically against three canonical test cases:
 *   - exact match             → score 1.0 (anchored, bypasses threshold)
 *   - "chrome-plated revolver" vs "chrome revolver" → ~0.73 (needs_review ✓)
 *   - "The room is empty…"   → ~0.25 (orphaned ✓)
 *
 * A threshold of 0.6 leaves comfortable headroom on both sides.
 */
const FUZZY_THRESHOLD = 0.6;

/**
 * Extra characters to add to the quote-length window when scanning for the
 * best fuzzy match. The edited text may be slightly longer than the original
 * quote (e.g. "chrome-plated revolver" is 7 chars longer than "chrome
 * revolver"), so we try window sizes from quote.length up to
 * quote.length + WINDOW_EXTRA to find the highest-scoring substring.
 */
const WINDOW_EXTRA = 12;

/**
 * Re-locate a breakdown tag's quote against the new body text of a scene
 * after a script re-import. Pure function — no I/O, no side effects.
 *
 * Returns one of three states:
 *   "anchored"     – the exact quote string is present; hintOffset updated.
 *   "needs_review" – a fuzzy match scored ≥ FUZZY_THRESHOLD; human should
 *                    confirm the tag still applies; hintOffset points at the
 *                    best-matching position.
 *   "orphaned"     – no match above threshold; hintOffset set to null.
 *
 * The original anchor.quote is always preserved so the tag can be
 * re-evaluated against future revisions.
 */
export function relocateAnchor(
  anchor: TextAnchor,
  newText: string
): RelocateResult {
  const quote = anchor.quote;

  // 1) Exact match — fast path, no fuzzy overhead.
  const idx = newText.indexOf(quote);
  if (idx >= 0) {
    return {
      anchorState: "anchored",
      score: 1,
      anchor: { ...anchor, hintOffset: idx },
    };
  }

  // 2) Fuzzy scan: try window sizes from quote.length to quote.length +
  //    WINDOW_EXTRA so that slightly-longer edited phrases are captured.
  const baseWin = Math.max(quote.length, 1);
  let best = 0;
  let bestIdx = -1;

  for (let extra = 0; extra <= WINDOW_EXTRA; extra++) {
    const win = baseWin + extra;
    for (let i = 0; i + win <= newText.length; i++) {
      const score = stringSimilarity.compareTwoStrings(
        quote,
        newText.slice(i, i + win)
      );
      if (score > best) {
        best = score;
        bestIdx = i;
      }
    }
  }

  if (best >= FUZZY_THRESHOLD) {
    return {
      anchorState: "needs_review",
      score: best,
      anchor: { ...anchor, hintOffset: bestIdx },
    };
  }

  // 3) Orphaned — no usable match.
  return {
    anchorState: "orphaned",
    score: best,
    anchor: { ...anchor, hintOffset: null },
  };
}
