import type { RefItem } from "@/lib/breakdown/ai/quality";

/**
 * Hand-written reference scene used for AI breakdown quality measurement.
 *
 * This text was written specifically so every expected item below has a clear,
 * unambiguous mention in the prose — making the ground truth defensible.
 *
 * To update the ground truth: edit REFERENCE_EXPECTED, then re-run the live
 * measurement test (see docs/superpowers/notes/phase-2-ai-quality.md).
 */
export const REFERENCE_SCENE_TEXT = `INT. DINER - NIGHT

MARY (40s, tired) slides into a cracked vinyl booth. She sets a CHROME REVOLVER on the formica table next to a half-empty COFFEE CUP. A NEON SIGN buzzes outside. BOB, the cook, watches from the counter, wiping his hands on a stained APRON.`;

/**
 * Hand-curated ground-truth breakdown items for the reference scene above.
 * These are the items a skilled script supervisor would tag — the measuring
 * stick for AI precision/recall.
 */
export const REFERENCE_EXPECTED: RefItem[] = [
  { kind: "character", name: "MARY" },
  { kind: "character", name: "BOB" },
  { kind: "element", name: "chrome revolver" },
  { kind: "element", name: "coffee cup" },
  { kind: "element", name: "neon sign" },
  { kind: "element", name: "apron" },
  { kind: "element", name: "vinyl booth" },
];
