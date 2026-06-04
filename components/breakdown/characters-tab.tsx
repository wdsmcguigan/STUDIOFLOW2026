"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Character, Person } from "@/lib/breakdown/schema";

interface CharactersTabProps {
  projectId: string;
  characters: Character[];
  people: Person[];
  createCharacterAction: (formData: FormData) => Promise<void>;
  mergeCharacterAction: (formData: FormData) => Promise<void>;
  castPersonAction: (formData: FormData) => Promise<void>;
}

/** Character list with create form, merge control, and cast assignment. */
export function CharactersTab({
  projectId,
  characters,
  people,
  createCharacterAction,
  mergeCharacterAction,
  castPersonAction,
}: CharactersTabProps) {
  const createFormRef = useRef<HTMLFormElement>(null);
  const mergeFormRef = useRef<HTMLFormElement>(null);

  async function handleCreate(formData: FormData) {
    await createCharacterAction(formData);
    createFormRef.current?.reset();
  }

  async function handleMerge(formData: FormData) {
    await mergeCharacterAction(formData);
    mergeFormRef.current?.reset();
  }

  return (
    <section aria-label="Characters" className="space-y-6">
      {/* Create character form */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--tx)]">
          New character
        </h3>
        <form ref={createFormRef} action={handleCreate} className="grid gap-3">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-1">
            <Label htmlFor="char-name">Primary name</Label>
            <Input
              id="char-name"
              name="primaryName"
              placeholder="e.g. MARY"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="char-aliases">
              Aliases{" "}
              <span className="text-[var(--tx-3)] font-normal">
                (comma-separated)
              </span>
            </Label>
            <Input
              id="char-aliases"
              name="aliases"
              placeholder="e.g. MARY ANN, MARI"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="char-desc">Description (optional)</Label>
            <Input
              id="char-desc"
              name="description"
              placeholder="Brief character notes"
              maxLength={2000}
            />
          </div>

          <Button type="submit" variant="ember" size="sm" className="w-fit">
            Add character
          </Button>
        </form>
      </div>

      {/* Character list */}
      {characters.length > 0 ? (
        <ul className="space-y-2" aria-label="Character list">
          {characters.map((c) => {
            const castPerson = people.find((p) => p.id === c.cast_person_id);
            return (
              <li
                key={c.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--tx)]">
                      {c.primary_name}
                    </p>
                    {c.aliases.length > 0 ? (
                      <p className="text-[11px] text-[var(--tx-3)] mt-0.5">
                        also:{" "}
                        {c.aliases.join(", ")}
                      </p>
                    ) : null}
                    {c.description ? (
                      <p className="text-[11px] text-[var(--tx-2)] mt-0.5">
                        {c.description}
                      </p>
                    ) : null}
                  </div>

                  {/* Cast assignment */}
                  <form action={castPersonAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="characterId" value={c.id} />
                    <select
                      name="personId"
                      aria-label={`Cast actor for ${c.primary_name}`}
                      defaultValue={c.cast_person_id ?? ""}
                      className="h-7 rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2 text-[11px] text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <option value="">Uncast</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      variant="outline"
                      size="xs"
                      aria-label={`Assign cast for ${c.primary_name}`}
                    >
                      Assign
                    </Button>
                  </form>
                </div>

                {castPerson ? (
                  <div className="mt-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      Cast: {castPerson.name}
                    </Badge>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[var(--tx-3)]">
          No characters yet. Add one above.
        </p>
      )}

      {/* Merge control — only show when 2+ characters exist */}
      {characters.length >= 2 ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
          <h3 className="mb-1 text-sm font-semibold text-[var(--tx)]">
            Merge characters
          </h3>
          <p className="mb-3 text-[11px] text-[var(--tx-3)]">
            The absorbed character is deleted; its scene links and aliases
            transfer to the survivor.
          </p>
          <form
            ref={mergeFormRef}
            action={handleMerge}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="projectId" value={projectId} />

            <div className="space-y-1">
              <Label htmlFor="merge-survivor">Keep (survivor)</Label>
              <select
                id="merge-survivor"
                name="survivorId"
                required
                className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Select…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.primary_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="merge-absorbed">Delete (absorbed)</Label>
              <select
                id="merge-absorbed"
                name="absorbedId"
                required
                className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Select…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.primary_name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="w-fit"
              aria-label="Merge selected characters"
            >
              Merge
            </Button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
