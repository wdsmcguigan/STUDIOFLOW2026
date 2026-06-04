export interface RefItem {
  kind: "element" | "character";
  name: string;
}

export interface QualityScore {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  expectedCount: number;
  actualCount: number;
}

function key(i: RefItem): string {
  return `${i.kind}:${i.name.trim().toLowerCase()}`;
}

/**
 * Precision/recall/F1 of actual vs expected breakdown items,
 * matched on (kind, normalized name). Pure — no I/O, no side effects.
 *
 * Definitions:
 *   precision = tp / actualCount   (how many actual items were correct)
 *   recall    = tp / expectedCount (how many expected items were found)
 *   f1        = harmonic mean of precision and recall
 *
 * Edge cases: empty actual → precision 0; empty expected → recall 0;
 * both empty → all 0 (no NaN).
 */
export function scoreBreakdown(
  expected: RefItem[],
  actual: RefItem[],
): QualityScore {
  const exp = new Set(expected.map(key));
  const act = new Set(actual.map(key));

  let tp = 0;
  for (const k of act) {
    if (exp.has(k)) tp++;
  }

  const precision = act.size === 0 ? 0 : tp / act.size;
  const recall = exp.size === 0 ? 0 : tp / exp.size;
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    expectedCount: exp.size,
    actualCount: act.size,
  };
}
