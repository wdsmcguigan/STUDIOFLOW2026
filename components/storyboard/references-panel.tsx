"use client";

import { Lock, Sparkle } from "lucide-react";
import type { Character } from "@/lib/breakdown/schema";
import type { Location } from "@/lib/schedule/schema";
import type { VisualReference } from "@/lib/storyboard/schema";
import { AIDot } from "@/components/ui/ai-surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateReferenceAction,
  lockReferenceAction,
  setReferenceStatusAction,
} from "@/app/dashboard/[projectId]/storyboard/actions";

interface ReferencesPanelProps {
  projectId: string;
  characters: Character[];
  locations: Location[];
  references: VisualReference[];
  /** Pre-signed URLs keyed by visual_reference id (path → signed URL). Signed in page.tsx. */
  signedUrls: Record<string, string>;
}

/**
 * References panel — characters & locations, each with their locked primary ref
 * (if any) plus AI-generated variants that can be locked or rejected.
 *
 * This is an AI surface (sage→amethyst accent via the .ai-surface class + AIDot)
 * because reference images are AI-generated, non-destructive suggestions a human
 * confirms (locks) before they flow into render conditioning.
 */
export function ReferencesPanel({
  projectId,
  characters,
  locations,
  references,
  signedUrls,
}: ReferencesPanelProps) {
  // Index references by subject id (rejected refs are hidden from the picker).
  const visible = references.filter((r) => r.status !== "rejected");
  const byCharacter = new Map<string, VisualReference[]>();
  const byLocation = new Map<string, VisualReference[]>();
  for (const r of visible) {
    if (r.character_id) {
      const arr = byCharacter.get(r.character_id) ?? [];
      arr.push(r);
      byCharacter.set(r.character_id, arr);
    } else if (r.location_id) {
      const arr = byLocation.get(r.location_id) ?? [];
      arr.push(r);
      byLocation.set(r.location_id, arr);
    }
  }

  return (
    <section className="ai-surface space-y-4 rounded-xl p-4">
      <header className="flex items-center gap-1.5">
        <AIDot />
        <h2 className="text-sm font-semibold text-[var(--ai-ink)]">
          Visual references
        </h2>
      </header>
      <p className="text-[11px] leading-snug text-[var(--tx-3)]">
        Lock a reference per character & location to keep panels consistent.
      </p>

      {/* Characters */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.5px] text-[var(--tx-3)]">
          Characters
        </h3>
        {characters.length === 0 ? (
          <p className="text-[11px] text-[var(--tx-3)]">No characters yet.</p>
        ) : (
          characters.map((c) => (
            <SubjectRow
              key={c.id}
              projectId={projectId}
              subjectType="character"
              subjectId={c.id}
              subjectName={c.primary_name}
              refs={byCharacter.get(c.id) ?? []}
              signedUrls={signedUrls}
            />
          ))
        )}
      </div>

      {/* Locations */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.5px] text-[var(--tx-3)]">
          Locations
        </h3>
        {locations.length === 0 ? (
          <p className="text-[11px] text-[var(--tx-3)]">No locations yet.</p>
        ) : (
          locations.map((l) => (
            <SubjectRow
              key={l.id}
              projectId={projectId}
              subjectType="location"
              subjectId={l.id}
              subjectName={l.name}
              refs={byLocation.get(l.id) ?? []}
              signedUrls={signedUrls}
            />
          ))
        )}
      </div>
    </section>
  );
}

/** One subject (character or location) with its references + generate control. */
function SubjectRow({
  projectId,
  subjectType,
  subjectId,
  subjectName,
  refs,
  signedUrls,
}: {
  projectId: string;
  subjectType: "character" | "location";
  subjectId: string;
  subjectName: string;
  refs: VisualReference[];
  signedUrls: Record<string, string>;
}) {
  const locked = refs.find((r) => r.is_primary && r.status === "locked");
  const variants = refs.filter((r) => r.id !== locked?.id);

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--s1)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-[var(--tx)]">
          {subjectName}
        </span>
        {locked ? (
          <Badge variant="default" className="gap-1 text-[9px]">
            <Lock className="size-3" aria-hidden="true" />
            Locked
          </Badge>
        ) : (
          <form action={generateReferenceAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="subjectType" value={subjectType} />
            <input type="hidden" name="subjectId" value={subjectId} />
            <input type="hidden" name="subjectName" value={subjectName} />
            <Button type="submit" variant="secondary" size="xs">
              <Sparkle className="size-3" aria-hidden="true" />
              Generate
            </Button>
          </form>
        )}
      </div>

      {/* Locked primary thumbnail */}
      {locked && (
        <div className="mt-2">
          {locked.image_path && signedUrls[locked.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrls[locked.id]}
              alt={`Locked reference for ${subjectName}`}
              className="h-20 w-full rounded-md object-cover"
            />
          ) : (
            <p className="font-data text-[9px] text-[var(--tx-3)]">
              Primary reference locked.
            </p>
          )}
        </div>
      )}

      {/* Variants: thumbnail + lock / reject */}
      {variants.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {variants.map((r) => (
            <li
              key={r.id}
              className="overflow-hidden rounded-md bg-[var(--s2)]"
            >
              {r.image_path && signedUrls[r.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrls[r.id]}
                  alt="Reference variant"
                  className="h-16 w-full object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <span className="font-data text-[10px] text-[var(--tx-3)]">
                  {r.status === "locked" ? "Locked variant" : "Suggested"}
                </span>
                <div className="flex gap-1">
                  <form action={lockReferenceAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="xs">
                      Lock
                    </Button>
                  </form>
                  <form action={setReferenceStatusAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <Button type="submit" variant="ghost" size="xs">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
