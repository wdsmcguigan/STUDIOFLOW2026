"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type {
  SceneElement,
  SceneCharacter,
  Element,
  ElementCategory,
  Character,
} from "@/lib/breakdown/schema";

interface SceneBreakdownProps {
  projectId: string;
  scriptId: string;
  sceneId: string;
  /** Current tags on this scene (all statuses) */
  tags: {
    elements: SceneElement[];
    characters: SceneCharacter[];
  };
  /** Catalog data for the "tag as…" forms */
  elements: Element[];
  categories: ElementCategory[];
  characters: Character[];
  /** Server actions — bound by the page before passing down */
  tagSceneElementAction: (formData: FormData) => Promise<void>;
  tagSceneCharacterAction: (formData: FormData) => Promise<void>;
}

const PRESENCE_TYPE_LABELS: Record<string, string> = {
  speaking: "Speaking",
  silent_featured: "Silent/featured",
  background: "Background",
  voice_only: "Voice only",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  suggested: "secondary",
  rejected: "destructive",
};

/** Breakdown section shown on the scene detail page. */
export function SceneBreakdown({
  projectId,
  scriptId,
  sceneId,
  tags,
  elements,
  categories,
  characters,
  tagSceneElementAction,
  tagSceneCharacterAction,
}: SceneBreakdownProps) {
  const elFormRef = useRef<HTMLFormElement>(null);
  const charFormRef = useRef<HTMLFormElement>(null);

  // Build lookup maps
  const elementById = new Map(elements.map((e) => [e.id, e]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const characterById = new Map(characters.map((c) => [c.id, c]));

  async function handleTagElement(formData: FormData) {
    await tagSceneElementAction(formData);
    elFormRef.current?.reset();
  }

  async function handleTagCharacter(formData: FormData) {
    await tagSceneCharacterAction(formData);
    charFormRef.current?.reset();
  }

  return (
    <section aria-label="Scene breakdown" className="space-y-5">
      <h2 className="font-display text-base font-semibold text-[var(--tx)]">
        Breakdown
      </h2>

      {/* Current tags */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Element tags */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            Elements ({tags.elements.length})
          </h3>
          {tags.elements.length > 0 ? (
            <ul className="space-y-1" aria-label="Tagged elements">
              {tags.elements.map((t) => {
                const el = elementById.get(t.element_id);
                const cat = el ? categoryById.get(el.category_id) : undefined;
                return (
                  <li key={t.id} className="flex items-center gap-1.5">
                    <Badge
                      variant={STATUS_VARIANT[t.status] ?? "outline"}
                      className="text-[10px]"
                    >
                      {t.status}
                    </Badge>
                    <span className="text-[11px] text-[var(--tx-3)]">
                      {cat?.name}
                    </span>
                    <span className="text-sm text-[var(--tx)]">
                      {el?.name ?? t.element_id}
                    </span>
                    {t.text_anchor?.quote ? (
                      <span
                        className="font-data hidden text-[10px] text-[var(--tx-3)] sm:block"
                        title="Anchored quote"
                      >
                        &ldquo;{t.text_anchor.quote}&rdquo;
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-[var(--tx-3)]">None tagged.</p>
          )}
        </div>

        {/* Character tags */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            Characters ({tags.characters.length})
          </h3>
          {tags.characters.length > 0 ? (
            <ul className="space-y-1" aria-label="Tagged characters">
              {tags.characters.map((t) => {
                const ch = characterById.get(t.character_id);
                return (
                  <li key={t.id} className="flex items-center gap-1.5">
                    <Badge
                      variant={STATUS_VARIANT[t.status] ?? "outline"}
                      className="text-[10px]"
                    >
                      {t.status}
                    </Badge>
                    <span className="text-sm text-[var(--tx)]">
                      {ch?.primary_name ?? t.character_id}
                    </span>
                    <span className="text-[10px] text-[var(--tx-3)]">
                      {PRESENCE_TYPE_LABELS[t.presence_type] ?? t.presence_type}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-[var(--tx-3)]">None tagged.</p>
          )}
        </div>
      </div>

      {/* Tag as... forms */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tag element */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--tx)]">
            Tag element
          </h3>
          <form
            ref={elFormRef}
            action={handleTagElement}
            className="space-y-3"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="scriptId" value={scriptId} />
            <input type="hidden" name="sceneId" value={sceneId} />

            <div className="space-y-1">
              <Label htmlFor="tag-el-element">Element</Label>
              <select
                id="tag-el-element"
                name="elementId"
                required
                className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Pick element…</option>
                {categories.map((cat) => {
                  const catEls = elements.filter((e) => e.category_id === cat.id);
                  if (catEls.length === 0) return null;
                  return (
                    <optgroup key={cat.id} label={cat.name}>
                      {catEls.map((el) => (
                        <option key={el.id} value={el.id}>
                          {el.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* v1 quote input — full text-selection capture is a fast-follow */}
            <div className="space-y-1">
              <Label htmlFor="tag-el-quote">
                Quote{" "}
                <span className="text-[var(--tx-3)] font-normal">
                  (optional — paste the excerpt)
                </span>
              </Label>
              <Input
                id="tag-el-quote"
                name="quote"
                placeholder="The exact text from the scene…"
              />
            </div>

            <Button type="submit" variant="ember" size="sm">
              Tag element
            </Button>
          </form>
        </div>

        {/* Tag character */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--tx)]">
            Tag character
          </h3>
          <form
            ref={charFormRef}
            action={handleTagCharacter}
            className="space-y-3"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="scriptId" value={scriptId} />
            <input type="hidden" name="sceneId" value={sceneId} />

            <div className="space-y-1">
              <Label htmlFor="tag-char-character">Character</Label>
              <select
                id="tag-char-character"
                name="characterId"
                required
                className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">Pick character…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.primary_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tag-char-presence">Presence type</Label>
              <select
                id="tag-char-presence"
                name="presenceType"
                required
                defaultValue="speaking"
                className="h-8 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s1)] px-2.5 text-sm text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {Object.entries(PRESENCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* v1 quote input */}
            <div className="space-y-1">
              <Label htmlFor="tag-char-quote">
                Quote{" "}
                <span className="text-[var(--tx-3)] font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="tag-char-quote"
                name="quote"
                placeholder="The exact text from the scene…"
              />
            </div>

            <Button type="submit" variant="ember" size="sm">
              Tag character
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
