import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import type { AiBreakdownOutput } from "@/lib/breakdown/schema";
import {
  findOrCreateElement,
  findOrCreateCharacter,
  resolveCategoryId,
  tagSceneElement,
  tagSceneCharacter,
  listSceneTags,
} from "@/lib/breakdown/data";

type DbClient = SupabaseClient<Database>;

/**
 * Map engine output → suggested scene tags.
 *
 * Idempotent: find-or-create dedupes the catalog by normalized name;
 * tagging upserts on (scene_id, element|character_id).
 *
 * Confirm-safe: reads existing tags BEFORE applying and skips any
 * (scene, element|character) pair already confirmed or rejected —
 * so an AI re-run never demotes a human decision.
 */
export async function applyBreakdownSuggestions(
  client: DbClient,
  args: { projectId: string; sceneId: string; output: AiBreakdownOutput },
): Promise<void> {
  // Read existing tags first; build the skip-set of already-decided pairs.
  const existing = await listSceneTags(client, args.sceneId);
  const lockedElementIds = new Set(
    existing.elements
      .filter((e) => e.status === "confirmed" || e.status === "rejected")
      .map((e) => e.element_id),
  );
  const lockedCharacterIds = new Set(
    existing.characters
      .filter((c) => c.status === "confirmed" || c.status === "rejected")
      .map((c) => c.character_id),
  );

  for (const item of args.output.items) {
    if (item.kind === "element") {
      const categoryId = await resolveCategoryId(client, args.projectId, item.category);
      if (!categoryId) continue;
      // find-or-create BEFORE the locked-set check so we resolve the stable id
      const el = await findOrCreateElement(client, {
        projectId: args.projectId,
        categoryId,
        name: item.name,
        description: item.description,
      });
      if (lockedElementIds.has(el.id)) continue; // never demote a human decision
      await tagSceneElement(client, {
        projectId: args.projectId,
        sceneId: args.sceneId,
        elementId: el.id,
        provenance: "auto",
        status: "suggested",
        confidence: item.confidence,
        textAnchor: {
          quote: item.quote,
          prefix: item.prefix,
          suffix: item.suffix,
          hintOffset: null,
        },
        anchorState: "anchored",
        quantity: null,
        notes: null,
      });
    } else {
      // kind === "character"
      const ch = await findOrCreateCharacter(client, {
        projectId: args.projectId,
        name: item.name,
        description: item.description,
      });
      if (lockedCharacterIds.has(ch.id)) continue; // never demote a human decision
      await tagSceneCharacter(client, {
        projectId: args.projectId,
        sceneId: args.sceneId,
        characterId: ch.id,
        presenceType: item.presenceType,
        provenance: "auto",
        status: "suggested",
        confidence: item.confidence,
        textAnchor: {
          quote: item.quote,
          prefix: item.prefix,
          suffix: item.suffix,
          hintOffset: null,
        },
        anchorState: "anchored",
        notes: null,
      });
    }
  }
}
