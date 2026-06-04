import type { Scene } from "@/lib/scripts/schema";

/** Maps INT/EXT × time-of-day to the matching category-spine token. */
function catColor(intExt: string | null, tod: string | null): string {
  const ext = (intExt ?? "").toUpperCase().includes("EXT");
  const night = (tod ?? "").toUpperCase().includes("NIGHT");
  if (!ext && !night) return "var(--cat-int-day)";
  if (!ext && night) return "var(--cat-int-night)";
  if (ext && !night) return "var(--cat-ext-day)";
  return "var(--cat-ext-night)";
}

/** Formats page-eighths as the stripboard convention: whole pages + remainder.
 *  e.g. 8 → "1", 10 → "1 2/8", 4 → "4/8", null → "—" */
function formatEighths(eighths: number | null): string {
  if (eighths === null || eighths === undefined) return "—";
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole > 0 && rem > 0) return `${whole} ${rem}/8`;
  if (whole > 0) return `${whole}`;
  return `${rem}/8`;
}

export function SceneList({
  projectId,
  scriptId,
  scenes,
}: {
  projectId: string;
  scriptId: string;
  scenes: Scene[];
}) {
  if (scenes.length === 0) {
    return (
      <p className="text-[var(--tx-2)]">No scenes yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-[7px]" role="list" aria-label="Scene stripboard">
      {scenes.map((s) => {
        const omitted = s.status === "omitted";
        const sceneNum = s.scene_number ?? String(s.ordinal + 1);
        // Compact day-part tag: "INT/D", "EXT/N", etc.
        const intExtPart = (s.int_ext ?? "").toUpperCase();
        const todPart = (s.time_of_day ?? "").toUpperCase().startsWith("N") ? "N" : "D";
        const tag = intExtPart ? `${intExtPart}/${todPart}` : null;

        return (
          <div
            key={s.id}
            role="listitem"
            className={[
              "row-pad flex items-center gap-[10px] rounded-[9px] border border-[var(--line)]",
              "border-l-[3px] bg-[var(--s2)] px-[11px] text-sm",
              omitted ? "opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ borderLeftColor: catColor(s.int_ext, s.time_of_day) }}
          >
            {/* Mono scene number + link */}
            <a
              href={`/dashboard/${projectId}/scripts/${scriptId}/scenes/${s.id}`}
              className={[
                "font-data w-8 shrink-0 text-[12px] font-bold text-[var(--tx)] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[var(--ring)]",
                omitted ? "line-through" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`Scene ${sceneNum}${omitted ? " (omitted)" : ""}`}
            >
              {sceneNum}
            </a>

            {/* INT/EXT — kept as separate text nodes so tests can find "INT" and "EXT" */}
            <span className="w-[34px] shrink-0 text-[8.5px] font-bold tracking-[0.4px] text-[var(--tx-2)]">
              {/* Hidden for screen readers via the aria-label on the link above;
                  rendered as plain text so the test assertions on "INT"/"EXT"/"DAY" work */}
              <span aria-hidden="true">{tag}</span>
              {/* Accessible individual values (visually hidden, available to queries) */}
              <span className="sr-only">{s.int_ext}</span>
              <span className="sr-only">{s.time_of_day}</span>
            </span>

            {/* Location slug — ellipsis on overflow */}
            <span
              className={[
                "min-w-0 flex-1 truncate text-[12px] text-[var(--tx)]",
                omitted ? "line-through" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {s.location_slug}
            </span>

            {/* "(omitted)" label — visible text, not color alone */}
            {omitted ? (
              <span className="shrink-0 text-[10px] text-[var(--tx-3)]">(omitted)</span>
            ) : null}

            {/* Synopsis — ellipsis, hidden when omitted to keep row clean */}
            {!omitted && s.synopsis ? (
              <span className="hidden min-w-0 flex-[2] truncate text-[11px] text-[var(--tx-2)] sm:block">
                {s.synopsis}
              </span>
            ) : null}

            {/* Mono page-eighths */}
            <span className="font-data ml-auto shrink-0 text-[10.5px] text-[var(--tx-3)]">
              {formatEighths(s.page_eighths)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
