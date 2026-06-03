// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input. (Resolves Phase 0 carry-forward #3.)

import { createClient } from "@/lib/supabase/server";
import {
  createScriptInput,
  script,
  scriptVersion,
  scene,
  type CreateScriptInput,
  type Script,
  type ScriptVersion,
  type Scene,
  type ParsedScene,
} from "@/lib/scripts/schema";
import { contentHash } from "@/lib/scripts/hash";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { parseFountain } from "@/lib/scripts/fountain";
import { reconcile, fuzzyMatcher, type ExistingScene } from "@/lib/scripts/reconcile";
import type { SceneDiff } from "@/lib/scripts/schema";

export async function createScript(input: CreateScriptInput): Promise<Script> {
  const parsed = createScriptInput.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scripts")
    .insert({ project_id: parsed.projectId, title: parsed.title })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return script.parse(data);
}

export async function listScripts(projectId: string): Promise<Script[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message, { cause: error });
  return data.map((row) => script.parse(row));
}

export async function getScript(scriptId: string): Promise<Script | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", scriptId)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? script.parse(data) : null;
}

export async function listScenes(scriptId: string): Promise<Scene[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("script_id", scriptId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(error.message, { cause: error });
  return data.map((row) => scene.parse(row));
}

export async function getScene(sceneId: string): Promise<Scene | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? scene.parse(data) : null;
}

export async function getLatestVersion(scriptId: string): Promise<ScriptVersion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("script_versions")
    .select("*")
    .eq("script_id", scriptId)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? scriptVersion.parse(data) : null;
}

/** First import: create the version snapshot + all scenes as new + their sources. */
export async function applyFirstImport(args: {
  projectId: string;
  scriptId: string;
  label: string;
  rawSource: string;
  parsed: ParsedScene[];
}): Promise<{ versionId: string; sceneIds: string[] }> {
  const { projectId, scriptId, label, rawSource, parsed } = args;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data: version, error: versionError } = await supabase
    .from("script_versions")
    .insert({
      script_id: scriptId,
      label,
      source_format: "fountain",
      raw_source: rawSource,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });

  const sceneRows = parsed.map((p) => ({
    project_id: projectId,
    script_id: scriptId,
    ordinal: p.ordinal,
    scene_number: p.sceneNumber,
    int_ext: p.intExt,
    location_slug: p.locationSlug,
    time_of_day: p.timeOfDay,
    synopsis: p.synopsis,
    page_eighths: p.pageEighths,
    status: "active" as const,
  }));
  const { data: scenes, error: scenesError } = await supabase
    .from("scenes")
    .insert(sceneRows)
    .select("id, ordinal");
  if (scenesError) throw new Error(scenesError.message, { cause: scenesError });

  const byOrdinal = new Map(scenes.map((s) => [s.ordinal, s.id]));
  const sourceRows = parsed.map((p) => ({
    scene_id: byOrdinal.get(p.ordinal)!,
    script_version_id: version.id,
    content_hash: contentHash(p),
    text_anchor_start: p.textAnchorStart,
    text_anchor_end: p.textAnchorEnd,
  }));
  const { error: sourcesError } = await supabase.from("scene_sources").insert(sourceRows);
  if (sourcesError) throw new Error(sourcesError.message, { cause: sourcesError });

  return {
    versionId: version.id,
    sceneIds: parsed.map((p) => byOrdinal.get(p.ordinal)!),
  };
}

type DbClient = SupabaseClient<Database>;

/** Assemble the matcher's ExistingScene view: active scenes + their latest content_hash. */
export async function loadExistingScenes(
  client: DbClient,
  scriptId: string,
): Promise<ExistingScene[]> {
  const { data, error } = await client
    .from("scenes")
    .select(
      "id, scene_number, number_locked, int_ext, location_slug, time_of_day, ordinal, scene_sources(content_hash, script_version_id)",
    )
    .eq("script_id", scriptId)
    .eq("status", "active")
    .order("ordinal", { ascending: true });
  if (error) throw new Error(error.message, { cause: error });

  // Pick each scene's most-recent source hash deterministically. A scene that
  // survived multiple imports has several scene_sources; PostgREST gives no
  // ordering guarantee on the embedded rows, so "last in array" is unstable and
  // would make tier-2 classification (and stage-vs-apply determinism) flaky.
  // Resolve recency via the owning version's imported_at.
  const { data: versions, error: versionsError } = await client
    .from("script_versions")
    .select("id, imported_at")
    .eq("script_id", scriptId);
  if (versionsError) throw new Error(versionsError.message, { cause: versionsError });
  const importedAt = new Map((versions ?? []).map((v) => [v.id, v.imported_at]));

  return (data ?? []).map((row) => {
    const sources = (row.scene_sources ?? []) as Array<{
      content_hash: string;
      script_version_id: string;
    }>;
    const latest = sources
      .slice()
      .sort((a, b) =>
        (importedAt.get(b.script_version_id) ?? "").localeCompare(
          importedAt.get(a.script_version_id) ?? "",
        ),
      )[0];
    const contentHashValue = latest?.content_hash ?? "";
    return {
      sceneId: row.id,
      sceneNumber: row.scene_number,
      numberLocked: row.number_locked,
      contentHash: contentHashValue,
      intExt: row.int_ext,
      locationSlug: row.location_slug,
      timeOfDay: row.time_of_day,
      bodyText: "", // body is reconstructed from raw_source only when needed; hash drives tier 2
      ordinal: row.ordinal,
    };
  });
}

/** STAGE (re-import step 1): create the immutable version snapshot (storing
 *  raw_source) and compute the structured diff against the live scenes —
 *  WITHOUT mutating any `scenes`/`scene_sources`. The `script_versions` row IS
 *  the stage; apply happens later at confirm via `reconcileAndApply`. Returns
 *  the new versionId, the diff, and the in-app prose-per-scene map for review. */
export async function stageReimport(
  client: DbClient,
  args: { projectId: string; scriptId: string; rawSource: string; parsed: ParsedScene[] },
): Promise<{ versionId: string; diff: SceneDiff[]; inAppByScene: Record<string, string> }> {
  const { projectId, scriptId, rawSource, parsed } = args;
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Immutable snapshot of the imported draft. No scene mutation here.
  const { data: version, error: versionError } = await client
    .from("script_versions")
    .insert({
      script_id: scriptId,
      label: `v${Date.now()}`,
      source_format: "fountain",
      raw_source: rawSource,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });
  const versionId = version.id as string;

  // Compute (but do not apply) the diff via the shared read-only helper, which
  // re-parses from the just-stored raw_source so stage and apply are identical.
  // `parsed` is accepted for caller symmetry but recomputed inside for determinism.
  void parsed;
  const { diff, inAppByScene } = await computeStagedDiff(client, {
    projectId,
    scriptId,
    scriptVersionId: versionId,
  });
  return { versionId, diff, inAppByScene };
}

/** READ-ONLY: recompute the diff for an already-staged version (no version
 *  creation, no scene mutation). Used by `stageReimport` and by the review page
 *  to render the gate. Re-parses the stored raw_source and reconciles; the diff
 *  is deterministic so it equals what apply will do. `markConflicts` (Task 14)
 *  upgrades matched scenes also edited in-app and populates `inAppByScene`;
 *  until Task 14 lands this is the plain reconcile output with an empty map. */
export async function computeStagedDiff(
  client: DbClient,
  args: { projectId: string; scriptId: string; scriptVersionId: string },
): Promise<{ diff: SceneDiff[]; inAppByScene: Record<string, string> }> {
  const { projectId, scriptId, scriptVersionId } = args;
  const { data: version, error: versionError } = await client
    .from("script_versions")
    .select("raw_source")
    .eq("id", scriptVersionId)
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });

  const parsed = parseFountain(version.raw_source);
  const existing = await loadExistingScenes(client, scriptId);
  const diff = reconcile(existing, parsed, fuzzyMatcher);
  void projectId; // projectId is used by markConflicts/inAppByScene in Task 14.

  return { diff, inAppByScene: {} };
}

/** APPLY (re-import step 2, invoked at confirm): given a previously-staged
 *  version id, re-read its stored raw_source, re-reconcile deterministically,
 *  and apply non-destructively:
 *  - matched scenes keep their UUID (update slug/body-derived fields, add a new scene_source);
 *  - removed scenes are set status='omitted' (never deleted);
 *  - new scenes are inserted as active. Returns the resolved diff + matched ids.
 *  Recomputing the diff here is sound because parse + reconcile are pure. */
export async function reconcileAndApply(
  client: DbClient,
  args: { projectId: string; scriptId: string; scriptVersionId: string },
): Promise<{ versionId: string; diff: SceneDiff[]; matchedSceneIds: string[] }> {
  const { projectId, scriptId, scriptVersionId } = args;
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Re-read the staged version's stored source and re-parse/-reconcile.
  const { data: version, error: versionError } = await client
    .from("script_versions")
    .select("id, script_id, raw_source")
    .eq("id", scriptVersionId)
    .single();
  if (versionError) throw new Error(versionError.message, { cause: versionError });
  // Integrity: the staged version must belong to the script we're applying to,
  // so a (legitimately owned) version from another script can't be cross-applied.
  if (version.script_id !== scriptId) {
    throw new Error("Staged version does not belong to this script");
  }
  const versionId = version.id as string;

  // Idempotency gate: a freshly STAGED version has zero scene_sources (stage
  // writes none). If any already reference it, this version was applied — refuse
  // to re-run so confirm is not double-applied (which would duplicate new scenes
  // and collide on the scene_sources composite PK).
  const { count: appliedCount, error: appliedError } = await client
    .from("scene_sources")
    .select("scene_id", { count: "exact", head: true })
    .eq("script_version_id", scriptVersionId);
  if (appliedError) throw new Error(appliedError.message, { cause: appliedError });
  if ((appliedCount ?? 0) > 0) {
    throw new Error("This staged version has already been applied");
  }

  const parsed = parseFountain(version.raw_source);

  const existing = await loadExistingScenes(client, scriptId);
  const diff = reconcile(existing, parsed, fuzzyMatcher);

  const matchedSceneIds: string[] = [];

  // Apply each diff entry against the staged version.
  for (const entry of diff) {
    if ((entry.classification === "unchanged" || entry.classification === "modified") && entry.sceneId && entry.parsed) {
      matchedSceneIds.push(entry.sceneId);
      const p = entry.parsed;
      const { error: upErr } = await client
        .from("scenes")
        .update({
          ordinal: p.ordinal,
          int_ext: p.intExt,
          location_slug: p.locationSlug,
          time_of_day: p.timeOfDay,
          synopsis: p.synopsis,
          page_eighths: p.pageEighths,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.sceneId);
      if (upErr) throw new Error(upErr.message, { cause: upErr });
      const { error: srcErr } = await client.from("scene_sources").insert({
        scene_id: entry.sceneId,
        script_version_id: versionId,
        content_hash: contentHash(p),
        text_anchor_start: p.textAnchorStart,
        text_anchor_end: p.textAnchorEnd,
      });
      if (srcErr) throw new Error(srcErr.message, { cause: srcErr });
    } else if (entry.classification === "new" && entry.parsed) {
      const p = entry.parsed;
      const { data: created, error: insErr } = await client
        .from("scenes")
        .insert({
          project_id: projectId,
          script_id: scriptId,
          ordinal: p.ordinal,
          scene_number: p.sceneNumber,
          int_ext: p.intExt,
          location_slug: p.locationSlug,
          time_of_day: p.timeOfDay,
          synopsis: p.synopsis,
          page_eighths: p.pageEighths,
          status: "active",
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message, { cause: insErr });
      const { error: srcErr } = await client.from("scene_sources").insert({
        scene_id: created.id,
        script_version_id: versionId,
        content_hash: contentHash(p),
        text_anchor_start: p.textAnchorStart,
        text_anchor_end: p.textAnchorEnd,
      });
      if (srcErr) throw new Error(srcErr.message, { cause: srcErr });
    } else if (entry.classification === "removed" && entry.sceneId) {
      const { error: omitErr } = await client
        .from("scenes")
        .update({ status: "omitted", updated_at: new Date().toISOString() })
        .eq("id", entry.sceneId);
      if (omitErr) throw new Error(omitErr.message, { cause: omitErr });
    }
  }

  return { versionId, diff, matchedSceneIds };
}

/** Production wrapper for the APPLY step (confirm): apply a previously-staged
 *  version using the SSR cookie client. */
export async function applyReconciledImport(args: {
  projectId: string;
  scriptId: string;
  scriptVersionId: string;
}): Promise<{ versionId: string; diff: SceneDiff[]; matchedSceneIds: string[] }> {
  const supabase = await createClient();
  return reconcileAndApply(supabase as unknown as DbClient, args);
}
