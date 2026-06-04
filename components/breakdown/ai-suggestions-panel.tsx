"use client";

import { setTagStatusAction } from "@/app/dashboard/[projectId]/breakdown/actions";
import type { SceneElement, SceneCharacter } from "@/lib/breakdown/schema";

interface AiSuggestionsPanelProps {
  projectId: string;
  scriptId: string;
  sceneId: string;
  /** Only the suggested (auto, status=suggested) element tags */
  suggestedElements: SceneElement[];
  /** Only the suggested (auto, status=suggested) character tags */
  suggestedCharacters: SceneCharacter[];
  /** Display names resolved by the parent */
  elementNames: Record<string, string>;
  characterNames: Record<string, string>;
}

/**
 * Client component — renders AI-suggested tags with per-item Accept/Reject and
 * bulk "Accept all" action. Uses the sage→amethyst AI surface tokens.
 *
 * Note: AI-proposed alias merges (aliasOf) are a fast-follow — requires
 * persisting the aliasOf hint; manual merge is available now.
 */
export function AiSuggestionsPanel({
  projectId,
  scriptId,
  sceneId,
  suggestedElements,
  suggestedCharacters,
  elementNames,
  characterNames,
}: AiSuggestionsPanelProps) {
  const totalSuggestions = suggestedElements.length + suggestedCharacters.length;

  if (totalSuggestions === 0) return null;

  return (
    <section
      aria-label="AI suggestions"
      className="ai-surface rounded-xl p-4 space-y-4"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-[var(--ai-ink)]">
          AI suggestions ({totalSuggestions})
        </h3>

        {/* Bulk accept all */}
        <div className="flex gap-2">
          <BulkAcceptForm
            projectId={projectId}
            scriptId={scriptId}
            sceneId={sceneId}
            suggestedElements={suggestedElements}
            suggestedCharacters={suggestedCharacters}
          />
        </div>
      </div>

      {/* Element suggestions */}
      {suggestedElements.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            Elements
          </p>
          <ul className="space-y-2" aria-label="Suggested elements">
            {suggestedElements.map((t) => (
              <SuggestionRow
                key={t.id}
                tag={t}
                kind="element"
                name={elementNames[t.element_id] ?? t.element_id}
                projectId={projectId}
                scriptId={scriptId}
                sceneId={sceneId}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Character suggestions */}
      {suggestedCharacters.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--tx-3)]">
            Characters
          </p>
          <ul className="space-y-2" aria-label="Suggested characters">
            {suggestedCharacters.map((t) => (
              <SuggestionRow
                key={t.id}
                tag={t}
                kind="character"
                name={characterNames[t.character_id] ?? t.character_id}
                projectId={projectId}
                scriptId={scriptId}
                sceneId={sceneId}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SuggestionRowProps {
  tag: SceneElement | SceneCharacter;
  kind: "element" | "character";
  name: string;
  projectId: string;
  scriptId: string;
  sceneId: string;
}

function SuggestionRow({
  tag,
  kind,
  name,
  projectId,
  scriptId,
  sceneId,
}: SuggestionRowProps) {
  const confidence = tag.confidence ?? null;
  const pct = confidence !== null ? Math.round(confidence * 100) : null;

  return (
    <li className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--tx)]">{name}</span>

        {tag.text_anchor?.quote ? (
          <p className="mt-0.5 truncate text-[10px] italic text-[var(--tx-3)]">
            &ldquo;{tag.text_anchor.quote}&rdquo;
          </p>
        ) : null}

        {pct !== null ? (
          <div className="mt-1 flex items-center gap-2">
            <div
              className="h-1 w-16 overflow-hidden rounded-full bg-[var(--line)]"
              role="meter"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`AI confidence: ${pct}%`}
            >
              <div
                className="h-full rounded-full bg-[var(--ai-ink)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-data text-[10px] text-[var(--tx-3)]">
              {pct}%
            </span>
          </div>
        ) : null}
      </div>

      {/* Per-item accept / reject */}
      <div className="flex shrink-0 gap-1.5">
        <form action={setTagStatusAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="status" value="confirmed" />
          <input type="hidden" name="scriptId" value={scriptId} />
          <input type="hidden" name="sceneId" value={sceneId} />
          <button
            type="submit"
            className="rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--ai-ink)] ring-1 ring-[var(--ai-ink)] transition-colors hover:bg-[var(--ai-ink)] hover:text-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={`Accept suggestion: ${name}`}
          >
            Accept
          </button>
        </form>

        <form action={setTagStatusAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="status" value="rejected" />
          <input type="hidden" name="scriptId" value={scriptId} />
          <input type="hidden" name="sceneId" value={sceneId} />
          <button
            type="submit"
            className="rounded-md px-2 py-0.5 text-[11px] text-[var(--tx-3)] ring-1 ring-[var(--line-2)] transition-colors hover:bg-[var(--s3)] hover:text-[var(--tx)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={`Reject suggestion: ${name}`}
          >
            Reject
          </button>
        </form>
      </div>
    </li>
  );
}

interface BulkAcceptFormProps {
  projectId: string;
  scriptId: string;
  sceneId: string;
  suggestedElements: SceneElement[];
  suggestedCharacters: SceneCharacter[];
}

/**
 * "Accept all" submits a hidden form for each suggested tag in sequence.
 * Threshold support (accept ≥ N%) is a fast-follow; ship accept-all now.
 */
function BulkAcceptForm({
  projectId,
  scriptId,
  sceneId,
  suggestedElements,
  suggestedCharacters,
}: BulkAcceptFormProps) {
  const allTags: Array<{ id: string; kind: "element" | "character" }> = [
    ...suggestedElements.map((t) => ({ id: t.id, kind: "element" as const })),
    ...suggestedCharacters.map((t) => ({ id: t.id, kind: "character" as const })),
  ];

  async function handleAcceptAll() {
    for (const tag of allTags) {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("kind", tag.kind);
      fd.set("id", tag.id);
      fd.set("status", "confirmed");
      fd.set("scriptId", scriptId);
      fd.set("sceneId", sceneId);
      await setTagStatusAction(fd);
    }
  }

  if (allTags.length === 0) return null;

  return (
    <button
      type="button"
      onClick={handleAcceptAll}
      className="rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--ai-ink)] ring-1 ring-[var(--ai-ink)] transition-colors hover:bg-[var(--ai-ink)] hover:text-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      aria-label="Accept all AI suggestions"
    >
      Accept all
    </button>
  );
}
