// Page-eighths heuristic: a standard screenplay page is ~55 lines of content and
// is 8/8ths. We approximate a scene's eighths from its rendered line count.
// Fountain carries no pagination, so this is a stored approximation (per spec).
const LINES_PER_PAGE = 55;

export function pageEighthsFromBody(body: string): number {
  const trimmed = body.trim();
  if (trimmed.length === 0) return 0;
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0).length;
  const eighths = Math.ceil((lines / LINES_PER_PAGE) * 8);
  return Math.max(1, eighths);
}

export function deriveSynopsis(input: {
  synopsisLines: string[];
  actionLines: string[];
}): string {
  if (input.synopsisLines.length > 0) {
    return input.synopsisLines.map((l) => l.trim()).join(" ");
  }
  if (input.actionLines.length > 0) {
    return input.actionLines[0].trim();
  }
  return "";
}
