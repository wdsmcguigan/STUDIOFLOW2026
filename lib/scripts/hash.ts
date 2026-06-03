import { createHash } from "node:crypto";
import type { ParsedScene } from "@/lib/scripts/schema";

/** Build the content fingerprint of a scene from its *content* only —
 *  slugline + body. Scene number, ordinal, and anchors are excluded because
 *  they are positional/mutable, not content (used by reconciliation tier 2). */
export function contentHash(p: ParsedScene): string {
  const slug = [p.intExt ?? "", p.locationSlug ?? "", p.timeOfDay ?? ""]
    .join("|")
    .toUpperCase();
  const body = p.bodyText.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${slug} ${body}`).digest("hex");
}

export function textAnchors(p: ParsedScene): { start: number; end: number } {
  return { start: p.textAnchorStart, end: p.textAnchorEnd };
}
