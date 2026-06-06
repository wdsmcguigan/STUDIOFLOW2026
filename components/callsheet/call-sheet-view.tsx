import type { AssembledCallSheet, CallSheetScene, CastCallRow, CrewDepartmentBlock } from "@/lib/callsheet/schema";

/**
 * CallSheetView — read-only render of an AssembledCallSheet.
 *
 * Renders:
 *   1. Header block — production info, day X of Y, date, general call,
 *      sun times, weather, hospital, revision, notes.
 *   2. Scenes table — ordered strip list with scene number, int/ext, set,
 *      time of day, synopsis, and page eighths.
 *   3. Cast table — name, character, call, makeup, wardrobe, on-set.
 *   4. Crew by department — dept heading + name / position / call time.
 *
 * Server component (read-only; editing is Task 14).
 * Design: tokens only — no hardcoded hex. Uses var(--tx), var(--tx-2),
 * var(--tx-3), var(--line), var(--line-2), var(--s2), bg-card, bg-muted, etc.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format page eighths as a fraction string, e.g. 4 → "4/8", 8 → "1 pg". */
function formatEighths(eighths: number): string {
  if (eighths >= 8 && eighths % 8 === 0) {
    return `${eighths / 8} pg`;
  }
  const pages = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (pages === 0) return `${rem}/8`;
  return `${pages} ${rem}/8`;
}

/** A horizontal divider with a centred label — reused for section headings. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span
        aria-hidden
        className="h-px flex-1 bg-[var(--line)]"
      />
      <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.8px] text-[var(--tx-3)]">
        {children}
      </span>
      <span
        aria-hidden
        className="h-px flex-1 bg-[var(--line)]"
      />
    </div>
  );
}

/** A two-column header label + value pair. */
function HeaderField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[var(--tx)]">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header block
// ---------------------------------------------------------------------------

function CallSheetHeader({ header }: { header: AssembledCallSheet["header"] }) {
  const {
    production,
    dayNumber,
    dayCount,
    date,
    generalCallTime,
    sunrise,
    sunset,
    weather,
    hospitalName,
    hospitalAddress,
    notes,
    revision,
  } = header;

  const sunText =
    sunrise && sunset
      ? `${sunrise} – ${sunset}`
      : sunrise ?? sunset ?? null;

  const hospitalText = [hospitalName, hospitalAddress]
    .filter(Boolean)
    .join(" · ") || null;

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      {/* Top banner */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] bg-[var(--s2)] px-5 py-3">
        <div className="space-y-0.5">
          <h2 className="font-display text-base font-extrabold tracking-[-0.2px] text-[var(--tx)]">
            {production}
          </h2>
          <p className="text-xs text-[var(--tx-3)]">
            Day {dayNumber} of {dayCount}
            {date ? ` · ${date}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {revision > 0 && (
            <span className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.5px] text-[var(--brand-on)]">
              Rev {revision}
            </span>
          )}
          {generalCallTime && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
                General Call
              </p>
              <p className="font-mono text-xl font-extrabold tracking-tight text-[var(--tx)]">
                {generalCallTime}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-3 md:grid-cols-4">
        <HeaderField label="Sun" value={sunText} />
        <HeaderField label="Weather" value={weather} />
        <HeaderField label="Nearest Hospital" value={hospitalText} />
        {notes && (
          <div className="col-span-full flex flex-col gap-0.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Notes
            </dt>
            <dd className="text-sm text-[var(--tx)]">{notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenes table
// ---------------------------------------------------------------------------

function ScenesTable({ scenes }: { scenes: CallSheetScene[] }) {
  if (scenes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-4 py-6 text-center text-sm text-[var(--tx-3)]">
        No scenes scheduled for this day.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--s2)]">
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              #
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              IE
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Set / Location
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              D/N
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Synopsis
            </th>
            <th className="px-4 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Pages
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {scenes.map((scene, idx) => (
            <tr key={idx} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2.5 font-mono text-sm font-semibold text-[var(--tx)]">
                {scene.sceneNumber ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-xs uppercase tracking-[0.3px] text-[var(--tx-2)]">
                {scene.intExt ?? ""}
              </td>
              <td className="px-4 py-2.5 text-sm text-[var(--tx)]">
                {scene.setOrLocation ?? <span className="text-[var(--tx-3)]">Unknown</span>}
              </td>
              <td className="px-4 py-2.5 text-xs text-[var(--tx-2)]">
                {scene.timeOfDay ?? ""}
              </td>
              <td className="px-4 py-2.5 text-xs text-[var(--tx-3)] max-w-[220px] truncate">
                {scene.synopsis ?? ""}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-[var(--tx-3)]">
                {scene.pageEighths != null ? formatEighths(scene.pageEighths) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cast table
// ---------------------------------------------------------------------------

function CastTable({ cast }: { cast: CastCallRow[] }) {
  if (cast.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-4 py-6 text-center text-sm text-[var(--tx-3)]">
        No cast on call for this day.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--s2)]">
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Name
            </th>
            <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Character
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Call
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              M/U
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              Ward.
            </th>
            <th className="px-4 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-[0.5px] text-[var(--tx-3)]">
              On Set
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {cast.map((row) => (
            <tr key={row.personId} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2.5 font-medium text-[var(--tx)]">
                {row.name}
              </td>
              <td className="px-4 py-2.5 text-sm text-[var(--tx-2)]">
                {row.characterName ?? <span className="text-[var(--tx-3)]">—</span>}
              </td>
              <TimeCell value={row.callTime} />
              <TimeCell value={row.makeup} />
              <TimeCell value={row.wardrobe} />
              <TimeCell value={row.onSet} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimeCell({ value }: { value: string | null }) {
  return (
    <td className="px-4 py-2.5 text-center font-mono text-sm">
      {value ? (
        <span className="font-semibold text-[var(--tx)]">{value}</span>
      ) : (
        <span className="text-[var(--tx-3)]">—</span>
      )}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Crew by department
// ---------------------------------------------------------------------------

function CrewSection({ crewByDepartment }: { crewByDepartment: CrewDepartmentBlock[] }) {
  if (crewByDepartment.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line-2)] px-4 py-6 text-center text-sm text-[var(--tx-3)]">
        No crew members added yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {crewByDepartment.map((dept) => (
        <div key={dept.department} className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          {/* Dept heading */}
          <div className="border-b border-[var(--line)] bg-[var(--s2)] px-4 py-2.5">
            <h4 className="font-display text-xs font-extrabold uppercase tracking-[0.6px] text-[var(--tx)]">
              {dept.department}
            </h4>
          </div>

          {dept.members.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--tx-3)]">
              No crew in this department.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--line)]">
                {dept.members.map((member) => (
                  <tr key={member.crewMemberId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[var(--tx)] w-1/3">
                      {member.name}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--tx-3)] w-1/3">
                      {member.position}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {member.callTime ? (
                        <span className="font-semibold text-[var(--tx)]">{member.callTime}</span>
                      ) : (
                        <span className="text-[var(--tx-3)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CallSheetView — main export
// ---------------------------------------------------------------------------

interface CallSheetViewProps {
  callSheet: AssembledCallSheet;
}

export function CallSheetView({ callSheet }: CallSheetViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <CallSheetHeader header={callSheet.header} />

      {/* 2. Scenes */}
      <section aria-labelledby="cs-scenes-heading" className="space-y-2">
        <SectionHeading>
          <span id="cs-scenes-heading">Scenes</span>
        </SectionHeading>
        <ScenesTable scenes={callSheet.scenes} />
      </section>

      {/* 3. Cast */}
      <section aria-labelledby="cs-cast-heading" className="space-y-2">
        <SectionHeading>
          <span id="cs-cast-heading">Cast</span>
        </SectionHeading>
        <CastTable cast={callSheet.cast} />
      </section>

      {/* 4. Crew */}
      <section aria-labelledby="cs-crew-heading" className="space-y-2">
        <SectionHeading>
          <span id="cs-crew-heading">Crew</span>
        </SectionHeading>
        <CrewSection crewByDepartment={callSheet.crewByDepartment} />
      </section>
    </div>
  );
}
