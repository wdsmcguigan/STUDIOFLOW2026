import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { relocateAnchor } from "@/lib/breakdown/anchor";
import { textAnchor } from "@/lib/breakdown/schema";

type DbClient = SupabaseClient<Database>;

/** Re-locate every tag on a scene against the scene's NEW body text.
 *  Updates anchor_state + text_anchor; PRESERVES status. Decoupled from
 *  lib/scripts — invoked by the re-import action after reconcileAndApply. */
export async function reanchorSceneTags(client: DbClient, sceneId: string, newText: string): Promise<void> {
  for (const table of ["scene_elements", "scene_characters"] as const) {
    const { data, error } = await client.from(table).select("id, text_anchor").eq("scene_id", sceneId);
    if (error) throw new Error(error.message, { cause: error });
    for (const row of data ?? []) {
      if (!row.text_anchor) continue; // no anchor to relocate
      const anchor = textAnchor.parse(row.text_anchor);
      const r = relocateAnchor(anchor, newText);
      const { error: upErr } = await client.from(table)
        .update({ anchor_state: r.anchorState, text_anchor: r.anchor }) // status untouched
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message, { cause: upErr });
    }
  }
}
