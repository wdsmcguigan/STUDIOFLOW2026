import { Fountain } from "fountain-js";
import { pageEighthsFromBody, deriveSynopsis } from "@/lib/scripts/derive";
import type { ParsedScene } from "@/lib/scripts/schema";

type Token = { type: string; text?: string; scene_number?: string };

const HEADING_RE =
  /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|EST\.?|I\/E)\s+(.*)$/i;

function normalizeIntExt(raw: string): string | null {
  const u = raw.toUpperCase().replace(/\./g, "");
  if (u === "INT/EXT" || u === "EXT/INT" || u === "I/E") return "INT/EXT";
  if (u === "INT") return "INT";
  if (u === "EXT" || u === "EST") return "EXT";
  return null;
}

/** Split "DINER - DAY" -> { locationSlug: "DINER", timeOfDay: "DAY" }. */
function splitLocationTime(rest: string): {
  locationSlug: string | null;
  timeOfDay: string | null;
} {
  const idx = rest.lastIndexOf(" - ");
  if (idx === -1) {
    return { locationSlug: rest.trim() || null, timeOfDay: null };
  }
  return {
    locationSlug: rest.slice(0, idx).trim() || null,
    timeOfDay: rest.slice(idx + 3).trim() || null,
  };
}

/** Parse a Fountain scene-heading line into its parts. */
function parseHeading(headingText: string): {
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
} {
  const m = headingText.trim().match(HEADING_RE);
  if (!m) return { intExt: null, locationSlug: null, timeOfDay: null };
  const intExt = normalizeIntExt(m[1]);
  const { locationSlug, timeOfDay } = splitLocationTime(m[2]);
  return { intExt, locationSlug, timeOfDay };
}

export function parseFountain(raw: string): ParsedScene[] {
  const { tokens } = new Fountain().parse(raw, true) as { tokens: Token[] };

  const scenes: ParsedScene[] = [];
  let current:
    | { heading: Token; synopsisLines: string[]; actionLines: string[]; bodyLines: string[] }
    | null = null;
  let ordinal = 0;
  let cursor = 0; // running char offset for text anchors

  const flush = () => {
    if (!current) return;
    const bodyText = current.bodyLines.join("\n").trim();
    const heading = (current.heading.text ?? "").trim();
    const { intExt, locationSlug, timeOfDay } = parseHeading(heading);
    const start = cursor;
    const end = cursor + heading.length + bodyText.length;
    scenes.push({
      sceneNumber: current.heading.scene_number ?? null,
      intExt,
      locationSlug,
      timeOfDay,
      bodyText,
      synopsis: deriveSynopsis({
        synopsisLines: current.synopsisLines,
        actionLines: current.actionLines,
      }),
      pageEighths: pageEighthsFromBody(bodyText),
      textAnchorStart: start,
      textAnchorEnd: end,
      ordinal: ordinal++,
    });
    cursor = end;
    current = null;
  };

  for (const t of tokens) {
    if (t.type === "scene_heading") {
      flush();
      current = { heading: t, synopsisLines: [], actionLines: [], bodyLines: [] };
      continue;
    }
    if (!current) continue; // tokens before the first heading (title page) are ignored
    const text = (t.text ?? "").trim();
    if (!text) continue;
    if (t.type === "synopsis") {
      current.synopsisLines.push(text);
      continue; // synopsis is pulled aside, not part of body
    }
    if (t.type === "action") current.actionLines.push(text);
    current.bodyLines.push(text);
  }
  flush();

  return scenes;
}
