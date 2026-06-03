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
