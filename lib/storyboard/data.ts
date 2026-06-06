// Convention: parse-on-read. Every read returns Zod-validated domain types (the one typed contract);
// writes parse their input at the server boundary. Follows lib/budget/data.ts style.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import {
  projectVisualSettings,
  visualReference,
  shot,
  shotFrame,
  imageGeneration,
  updateVisualSettingsInput,
  createVisualReferenceInput,
  lockReferenceInput,
  setReferenceStatusInput,
  createShotInput,
  updateShotInput,
  reorderShotsInput,
  setShotStatusInput,
  deleteShotInput,
  createShotFrameInput,
  selectFrameInput,
  setFrameStatusInput,
  deleteFrameInput,
  recordImageGenerationInput,
  type ProjectVisualSettings,
  type VisualReference,
  type Shot,
  type ShotFrame,
  type ImageGeneration,
  type GenerationTotals,
  type RenderInputs,
  type RenderRef,
  type ShotFrameResolved,
  type ShotWithFrames,
  type SceneBoard,
} from "@/lib/storyboard/schema";
import { getSceneHeader, listSceneCharacters } from "@/lib/breakdown/data";

type DbClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// project_visual_settings — get-or-create (idempotent, race-safe via 23505)
// project_visual_settings has a UNIQUE constraint on project_id (isOneToOne: true
// in DB types). Concurrent inserts will fail with 23505; we re-read the winner
// exactly as getOrCreateDefaultBudget does in lib/budget/data.ts.
// ---------------------------------------------------------------------------

/**
 * Return the project_visual_settings row for a project, or null if none exists yet.
 *
 * Pure read — never writes. Safe to call during server render (even for unauthenticated
 * or non-owner requests; RLS returns null rather than throwing).
 * Use this on render paths; use getOrCreateVisualSettings inside actions/workflows
 * that run under an authenticated owner session.
 */
export async function getVisualSettings(
  client: DbClient,
  projectId: string,
): Promise<ProjectVisualSettings | null> {
  const { data, error } = await client
    .from("project_visual_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? projectVisualSettings.parse(data) : null;
}

/**
 * Return the project_visual_settings row for a project.
 * If none exists, inserts one with defaults (storyboard_sketch / 16:9) and returns it.
 * Idempotent — two concurrent calls return the same id.
 */
export async function getOrCreateVisualSettings(
  client: DbClient,
  projectId: string,
): Promise<ProjectVisualSettings> {
  const { data: existing, error: readErr } = await client
    .from("project_visual_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message, { cause: readErr });
  if (existing) return projectVisualSettings.parse(existing);

  const { data, error } = await client
    .from("project_visual_settings")
    .insert({ project_id: projectId })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      // Lost the create race — a concurrent caller inserted first.
      // Re-read the winner (the UNIQUE constraint guarantees exactly one row).
      const { data: winner, error: reErr } = await client
        .from("project_visual_settings")
        .select("*")
        .eq("project_id", projectId)
        .single();
      if (reErr) throw new Error(reErr.message, { cause: reErr });
      return projectVisualSettings.parse(winner);
    }
    throw new Error(error.message, { cause: error });
  }
  return projectVisualSettings.parse(data);
}

// ---------------------------------------------------------------------------
// updateVisualSettings — partial update; caller passes only changed fields
// ---------------------------------------------------------------------------

/**
 * Update the visual settings row for a project.
 * get-or-creates the row first (so the caller never has to think about init order).
 * Only provided fields are patched; all others remain unchanged.
 * Returns the updated row (parse-on-read).
 */
export async function updateVisualSettings(
  client: DbClient,
  input: unknown,
): Promise<ProjectVisualSettings> {
  const p = updateVisualSettingsInput.parse(input);

  // Ensure the row exists before we try to update it
  const existing = await getOrCreateVisualSettings(client, p.projectId);

  const patch: Database["public"]["Tables"]["project_visual_settings"]["Update"] = {};
  if (p.stylePreset !== undefined) patch.style_preset = p.stylePreset;
  if (p.aspectRatio !== undefined) patch.aspect_ratio = p.aspectRatio;
  if (p.customStylePrompt !== undefined) patch.custom_style_prompt = p.customStylePrompt;

  const { data, error } = await client
    .from("project_visual_settings")
    .update(patch)
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return projectVisualSettings.parse(data);
}

// ---------------------------------------------------------------------------
// visual_references — CRUD
// ---------------------------------------------------------------------------

/**
 * Insert a new visual reference row.
 * Validates input with Zod (parse-on-write) and returns the created row
 * (parse-on-read).
 */
export async function createVisualReference(
  client: DbClient,
  input: unknown,
): Promise<VisualReference> {
  const p = createVisualReferenceInput.parse(input);
  const { data, error } = await client
    .from("visual_references")
    .insert({
      project_id: p.projectId,
      subject_type: p.subjectType,
      character_id: p.characterId ?? null,
      location_id: p.locationId ?? null,
      source: p.source ?? "ai",
      status: p.status ?? "suggested",
      is_primary: p.isPrimary ?? false,
      image_path: p.imagePath ?? null,
      prompt_used: p.promptUsed ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return visualReference.parse(data);
}

/**
 * List all visual references for a project, ordered by created_at ascending.
 */
export async function listVisualReferences(
  client: DbClient,
  projectId: string,
): Promise<VisualReference[]> {
  const { data, error } = await client
    .from("visual_references")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => visualReference.parse(r));
}

// ---------------------------------------------------------------------------
// lockReference
//
// CRITICAL — avoids partial-unique collision (vr_one_primary_character /
// vr_one_primary_location):
//   1. Read the target row to determine subject type (character vs location).
//   2. Clear is_primary on the current primary for that subject, if any.
//   3. Set status='locked' + is_primary=true on the target.
//
// Step 2 must complete before step 3 so no two rows ever have is_primary=true
// for the same subject simultaneously, which would trip the unique index.
// ---------------------------------------------------------------------------

/**
 * Lock a visual reference and make it the primary for its subject.
 *
 * Safely clears any existing primary row for the same character or location
 * before setting the target, so the partial-unique constraints
 * vr_one_primary_character / vr_one_primary_location are never violated.
 */
export async function lockReference(
  client: DbClient,
  input: unknown,
): Promise<VisualReference> {
  const p = lockReferenceInput.parse(input);

  // 1. Read the target row to determine which subject FK to clear.
  const { data: target, error: targetErr } = await client
    .from("visual_references")
    .select("*")
    .eq("id", p.id)
    .single();
  if (targetErr) throw new Error(targetErr.message, { cause: targetErr });

  // 2. Clear is_primary on any existing primary for the same subject.
  //    We must do this BEFORE setting the target row's is_primary=true to
  //    avoid colliding with the partial-unique index.
  if (target.subject_type === "character" && target.character_id !== null) {
    const { error: clearErr } = await client
      .from("visual_references")
      .update({ is_primary: false })
      .eq("character_id", target.character_id)
      .eq("is_primary", true)
      .neq("id", p.id); // don't touch the target itself (it may already be primary)
    if (clearErr) throw new Error(clearErr.message, { cause: clearErr });
  } else if (target.subject_type === "location" && target.location_id !== null) {
    const { error: clearErr } = await client
      .from("visual_references")
      .update({ is_primary: false })
      .eq("location_id", target.location_id)
      .eq("is_primary", true)
      .neq("id", p.id);
    if (clearErr) throw new Error(clearErr.message, { cause: clearErr });
  }

  // 3. Set the target to locked + primary.
  const { data, error } = await client
    .from("visual_references")
    .update({ status: "locked", is_primary: true })
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return visualReference.parse(data);
}

// ---------------------------------------------------------------------------
// setReferenceStatus — arbitrary status change (does NOT touch is_primary)
// ---------------------------------------------------------------------------

/**
 * Update the status of a visual reference.
 * To promote to locked+primary, use lockReference (which handles the
 * partial-unique constraints). This function changes only the status column.
 */
export async function setReferenceStatus(
  client: DbClient,
  input: unknown,
): Promise<VisualReference> {
  const p = setReferenceStatusInput.parse(input);
  const { data, error } = await client
    .from("visual_references")
    .update({ status: p.status })
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return visualReference.parse(data);
}

// ---------------------------------------------------------------------------
// getLockedReferences — locked primary refs for a project, indexed by subject
// ---------------------------------------------------------------------------

/**
 * Return all locked primary visual_references for a project.
 *
 * Only rows where status = 'locked' AND is_primary = true are returned —
 * these are the refs the AI engine uses as canonical style anchors.
 *
 * Callers can index the result by character_id or location_id:
 *   const byCharacter = Object.fromEntries(
 *     locked.filter(r => r.character_id).map(r => [r.character_id!, r])
 *   );
 *
 * Ordered by subject_type then created_at so the result is stable.
 */
export async function getLockedReferences(
  client: DbClient,
  projectId: string,
): Promise<VisualReference[]> {
  const { data, error } = await client
    .from("visual_references")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "locked")
    .eq("is_primary", true)
    .order("subject_type")
    .order("created_at");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => visualReference.parse(r));
}

// ---------------------------------------------------------------------------
// shots — CRUD + reorder + status
// ---------------------------------------------------------------------------

/**
 * Insert a new shot for a scene.
 *
 * ordinal is auto-computed as (max existing ordinal for scene) + 1.
 * The first shot for a scene gets ordinal 0.
 * Single-user scale — no transaction required for ordinal computation.
 */
export async function createShot(client: DbClient, input: unknown): Promise<Shot> {
  const p = createShotInput.parse(input);

  // Compute next ordinal: select the highest existing ordinal for this scene, default -1
  const { data: last, error: lastErr } = await client
    .from("shots")
    .select("ordinal")
    .eq("scene_id", p.sceneId)
    .order("ordinal", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw new Error(lastErr.message, { cause: lastErr });
  const nextOrdinal = last !== null ? last.ordinal + 1 : 0;

  const { data, error } = await client
    .from("shots")
    .insert({
      project_id: p.projectId,
      scene_id: p.sceneId,
      ordinal: nextOrdinal,
      size: p.size ?? null,
      angle: p.angle ?? null,
      movement: p.movement ?? null,
      lens: p.lens ?? null,
      action: p.action ?? null,
      shot_number: p.shotNumber ?? null,
      provenance: p.provenance ?? "manual",
      status: p.status ?? "suggested",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shot.parse(data);
}

/**
 * Return a single shot by id, or null if it does not exist (or is not visible to the client).
 * Mirrors the getJob point-read style in lib/breakdown/data.ts.
 */
export async function getShot(client: DbClient, shotId: string): Promise<Shot | null> {
  const { data, error } = await client
    .from("shots")
    .select("*")
    .eq("id", shotId)
    .maybeSingle();
  if (error) throw new Error(error.message, { cause: error });
  return data ? shot.parse(data) : null;
}

/**
 * List all shots for a scene, ordered by ordinal ascending.
 */
export async function listShots(client: DbClient, sceneId: string): Promise<Shot[]> {
  const { data, error } = await client
    .from("shots")
    .select("*")
    .eq("scene_id", sceneId)
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => shot.parse(r));
}

/**
 * Update metadata fields on a shot.
 * Only provided fields are patched; all others remain unchanged.
 */
export async function updateShot(client: DbClient, input: unknown): Promise<Shot> {
  const p = updateShotInput.parse(input);

  const patch: Database["public"]["Tables"]["shots"]["Update"] = {};
  if (p.size !== undefined) patch.size = p.size;
  if (p.angle !== undefined) patch.angle = p.angle;
  if (p.movement !== undefined) patch.movement = p.movement;
  if (p.lens !== undefined) patch.lens = p.lens;
  if (p.action !== undefined) patch.action = p.action;
  if (p.shotNumber !== undefined) patch.shot_number = p.shotNumber;

  const { data, error } = await client
    .from("shots")
    .update(patch)
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shot.parse(data);
}

/**
 * Reorder shots within a scene.
 * Each shot's ordinal is set to its index position in orderedIds (0-based).
 * A simple sequential update loop — acceptable at single-user scale.
 */
export async function reorderShots(
  client: DbClient,
  input: unknown,
): Promise<void> {
  const p = reorderShotsInput.parse(input);

  for (let i = 0; i < p.orderedIds.length; i++) {
    const { error } = await client
      .from("shots")
      .update({ ordinal: i })
      .eq("id", p.orderedIds[i])
      .eq("scene_id", p.sceneId);
    if (error) throw new Error(error.message, { cause: error });
  }
}

/**
 * Update the status of a shot (e.g. suggested → approved → rejected).
 */
export async function setShotStatus(client: DbClient, input: unknown): Promise<Shot> {
  const p = setShotStatusInput.parse(input);
  const { data, error } = await client
    .from("shots")
    .update({ status: p.status })
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shot.parse(data);
}

/**
 * Delete a shot by id.
 * Cascades to shot_frames via FK (ON DELETE CASCADE in migration 0020).
 */
export async function deleteShot(client: DbClient, input: unknown): Promise<void> {
  const p = deleteShotInput.parse(input);
  const { error } = await client.from("shots").delete().eq("id", p.id);
  if (error) throw new Error(error.message, { cause: error });
}

// ---------------------------------------------------------------------------
// shot_frames — CRUD + selectFrame + status
// ---------------------------------------------------------------------------

/**
 * Insert a new frame for a shot.
 *
 * FIRST frame for a shot: is_selected=true, status='selected'.
 * Subsequent frames: is_selected=false, status='suggested'.
 *
 * ordinal is auto-computed: (count of existing frames for shot) → new frame gets
 * ordinal equal to the count (0-based, appended at end).
 */
export async function createShotFrame(
  client: DbClient,
  input: unknown,
): Promise<ShotFrame> {
  const p = createShotFrameInput.parse(input);

  // Count existing frames to determine ordinal and whether this is the first frame
  const { count, error: countErr } = await client
    .from("shot_frames")
    .select("*", { count: "exact", head: true })
    .eq("shot_id", p.shotId);
  if (countErr) throw new Error(countErr.message, { cause: countErr });

  const existingCount = count ?? 0;
  const isFirst = existingCount === 0;
  const ordinal = p.ordinal !== undefined ? p.ordinal : existingCount;

  const { data, error } = await client
    .from("shot_frames")
    .insert({
      project_id: p.projectId,
      shot_id: p.shotId,
      image_path: p.imagePath,
      source: p.source ?? "ai",
      prompt_used: p.promptUsed ?? null,
      ordinal,
      is_selected: isFirst,
      status: isFirst ? "selected" : "suggested",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shotFrame.parse(data);
}

/**
 * List all frames for a shot, ordered by ordinal ascending.
 */
export async function listShotFrames(
  client: DbClient,
  shotId: string,
): Promise<ShotFrame[]> {
  const { data, error } = await client
    .from("shot_frames")
    .select("*")
    .eq("shot_id", shotId)
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((r) => shotFrame.parse(r));
}

/**
 * Select a frame as the active frame for its shot.
 *
 * CRITICAL — avoids partial-unique collision (shot_frames_one_selected):
 *   1. Clear is_selected + set status='suggested' on the current selected frame.
 *   2. Set is_selected=true + status='selected' on the target frame.
 *
 * Step 1 must complete before step 2 so no two rows ever have is_selected=true
 * for the same shot simultaneously, mirroring the lockReference pattern.
 */
export async function selectFrame(
  client: DbClient,
  input: unknown,
): Promise<ShotFrame> {
  const p = selectFrameInput.parse(input);

  // 1. Clear the current selected frame (if any) — do NOT touch the target itself.
  const { error: clearErr } = await client
    .from("shot_frames")
    .update({ is_selected: false, status: "suggested" })
    .eq("shot_id", p.shotId)
    .eq("is_selected", true)
    .neq("id", p.frameId); // don't clear the target if it's already selected
  if (clearErr) throw new Error(clearErr.message, { cause: clearErr });

  // 2. Set the target frame as selected.
  const { data, error } = await client
    .from("shot_frames")
    .update({ is_selected: true, status: "selected" })
    .eq("id", p.frameId)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shotFrame.parse(data);
}

/**
 * Update the status of a shot frame (e.g. 'generating' → 'ready' → 'failed').
 * Does NOT modify is_selected; use selectFrame for that.
 */
export async function setFrameStatus(
  client: DbClient,
  input: unknown,
): Promise<ShotFrame> {
  const p = setFrameStatusInput.parse(input);
  const { data, error } = await client
    .from("shot_frames")
    .update({ status: p.status })
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return shotFrame.parse(data);
}

/**
 * Delete a shot frame by id.
 */
export async function deleteShotFrame(
  client: DbClient,
  input: unknown,
): Promise<void> {
  const p = deleteFrameInput.parse(input);
  const { error } = await client.from("shot_frames").delete().eq("id", p.id);
  if (error) throw new Error(error.message, { cause: error });
}

// ---------------------------------------------------------------------------
// image_generations — append-only ledger (no update/delete)
// ---------------------------------------------------------------------------

/**
 * Record an image generation event in the append-only ledger.
 *
 * Validates input with Zod (parse-on-write) and returns the created row
 * (parse-on-read). The ledger has NO update policy — records are immutable.
 *
 * @param client - Supabase client authenticated as the project owner
 * @param input  - Raw write input (validated against recordImageGenerationInput)
 * @returns      The newly created ImageGeneration row
 */
export async function recordImageGeneration(
  client: DbClient,
  input: unknown,
): Promise<ImageGeneration> {
  const p = recordImageGenerationInput.parse(input);
  const { data, error } = await client
    .from("image_generations")
    .insert({
      project_id: p.projectId,
      job_id: p.jobId ?? null,
      kind: p.kind,
      model: p.model,
      image_count: p.imageCount,
      est_cost: p.estCost,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message, { cause: error });
  return imageGeneration.parse(data);
}

/**
 * Return aggregated image generation totals for a project.
 *
 * Sums image_count and est_cost across all rows for the project.
 * Returns { imageCount: 0, estCost: 0 } when no records exist.
 *
 * @param client    - Supabase client authenticated as the project owner
 * @param projectId - UUID of the project
 * @returns         Aggregated { imageCount, estCost }
 */
export async function getGenerationTotals(
  client: DbClient,
  projectId: string,
): Promise<GenerationTotals> {
  const { data, error } = await client
    .from("image_generations")
    .select("image_count, est_cost")
    .eq("project_id", projectId);
  if (error) throw new Error(error.message, { cause: error });

  const rows = data ?? [];
  const imageCount = rows.reduce((sum, r) => sum + (r.image_count ?? 0), 0);
  // est_cost is a numeric column; Supabase returns it as a string in JS
  const estCost = rows.reduce((sum, r) => sum + Number(r.est_cost ?? 0), 0);
  return { imageCount, estCost };
}

// ---------------------------------------------------------------------------
// loadRenderInputs — the graph slice needed to render a scene's panels.
//
// REUSES breakdown reads (getSceneHeader, listSceneCharacters) — does NOT
// re-query breakdown tables ad hoc — and the locked-reference reader. Locked
// primary refs are matched to the characters PRESENT in the scene (by
// character_id) and to the scene's resolved location (by location_id).
// ---------------------------------------------------------------------------

const DEFAULT_REF_MEDIA_TYPE = "image/png";

/**
 * Assemble the render inputs for a scene: its meta, the project style, and the
 * locked primary references for the characters present + the scene's location.
 *
 * @param client    Supabase client (service-role in the workflow context).
 * @param sceneId   The scene to render.
 * @returns RenderInputs — sceneMeta/style for the prompt, refs for conditioning.
 * @throws if the scene does not exist.
 */
export async function loadRenderInputs(
  client: DbClient,
  sceneId: string,
): Promise<RenderInputs> {
  const header = await getSceneHeader(client, sceneId);
  if (!header) throw new Error(`scene not found: ${sceneId}`);
  const projectId = header.project_id;

  // Parallel: characters present + project style + locked refs.
  const [presence, settings, locked] = await Promise.all([
    listSceneCharacters(client, sceneId),
    getOrCreateVisualSettings(client, projectId),
    getLockedReferences(client, projectId),
  ]);

  // Index locked primary refs by subject id for O(1) matching.
  const refByCharacter = new Map(
    locked
      .filter((r) => r.character_id !== null && r.image_path !== null)
      .map((r) => [r.character_id as string, r]),
  );
  const refByLocation = new Map(
    locked
      .filter((r) => r.location_id !== null && r.image_path !== null)
      .map((r) => [r.location_id as string, r]),
  );

  // Character refs: one per present character that HAS a locked primary ref.
  const characterRefs: RenderRef[] = [];
  for (const c of presence) {
    const ref = refByCharacter.get(c.character_id);
    if (ref && ref.image_path) {
      characterRefs.push({
        label: c.name,
        path: ref.image_path,
        mediaType: DEFAULT_REF_MEDIA_TYPE,
      });
    }
  }

  // Location ref: the locked primary ref for the scene's resolved location.
  let locationRef: RenderRef | null = null;
  if (header.location_id) {
    const ref = refByLocation.get(header.location_id);
    if (ref && ref.image_path) {
      locationRef = {
        label: header.location_name ?? header.location_slug ?? "Location",
        path: ref.image_path,
        mediaType: DEFAULT_REF_MEDIA_TYPE,
      };
    }
  }

  return {
    projectId,
    sceneMeta: {
      intExt: header.int_ext,
      timeOfDay: header.time_of_day,
      locationName: header.location_name ?? header.location_slug,
      synopsis: header.synopsis,
    },
    style: {
      stylePreset: settings.style_preset,
      customStylePrompt: settings.custom_style_prompt,
      aspectRatio: settings.aspect_ratio,
    },
    characterRefs,
    locationRef,
  };
}

// ---------------------------------------------------------------------------
// getSceneBoard — ordered shots with signed-URL frames for one scene.
//
// SIGNING DESIGN: uses the PASSED client (not the service-role helper) so that
// Storage RLS lets the owner read their own objects without importing the
// server-only lib/storage/storyboards.ts. This keeps getSceneBoard testable
// in vitest with the harness anon clients and avoids a 'server-only' import
// breaking the existing non-mocked data.test.ts imports.
// ---------------------------------------------------------------------------

/**
 * Return the full storyboard for a scene: ordered shots, each with its frames
 * (signed URLs) and the signed URL of the selected frame (or null).
 *
 * Signing uses the passed `client` so Storage RLS lets the project owner read
 * their own objects. Do NOT import signStoryboardUrl here.
 *
 * @param client  Supabase client authenticated as the project member.
 * @param sceneId UUID of the scene to load.
 * @returns       SceneBoard — { sceneId, shots: ShotWithFrames[] }
 */
export async function getSceneBoard(
  client: DbClient,
  sceneId: string,
): Promise<SceneBoard> {
  const shots = await listShots(client, sceneId);

  const shotsWithFrames: ShotWithFrames[] = await Promise.all(
    shots.map(async (s): Promise<ShotWithFrames> => {
      const rawFrames = await listShotFrames(client, s.id);

      const frames: ShotFrameResolved[] = await Promise.all(
        rawFrames.map(async (f): Promise<ShotFrameResolved> => {
          const { data: signed } = await client.storage
            .from("storyboards")
            .createSignedUrl(f.image_path, 3600);
          return {
            id: f.id,
            signedUrl: signed?.signedUrl ?? "",
            isSelected: f.is_selected,
            status: f.status,
            ordinal: f.ordinal,
          };
        }),
      );

      const selectedFrame = frames.find((f) => f.isSelected);
      const selectedUrl = selectedFrame?.signedUrl ?? null;

      return {
        id: s.id,
        scene_id: s.scene_id,
        ordinal: s.ordinal,
        size: s.size,
        angle: s.angle,
        movement: s.movement,
        lens: s.lens,
        action: s.action,
        shot_number: s.shot_number,
        status: s.status,
        provenance: s.provenance,
        frames,
        selectedUrl,
      };
    }),
  );

  return { sceneId, shots: shotsWithFrames };
}

// ---------------------------------------------------------------------------
// listProjectScenes — the scene picker source for the storyboard board page.
//
// Storyboard is project-scoped (not script-scoped), so we list every active
// scene in the project with the display fields the picker needs. Ordered by
// (script_id, ordinal) so scenes group by script in script order.
// ---------------------------------------------------------------------------

/** A scene's minimal display shape for the storyboard scene picker. */
export interface SceneListItem {
  id: string;
  sceneNumber: string | null;
  intExt: string | null;
  locationSlug: string | null;
  timeOfDay: string | null;
  synopsis: string | null;
}

/**
 * List every active scene in a project for the storyboard scene picker.
 * Returns minimal display fields, ordered by script then ordinal.
 */
export async function listProjectScenes(
  client: DbClient,
  projectId: string,
): Promise<SceneListItem[]> {
  const { data, error } = await client
    .from("scenes")
    .select("id, scene_number, int_ext, location_slug, time_of_day, synopsis")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("script_id")
    .order("ordinal");
  if (error) throw new Error(error.message, { cause: error });
  return (data ?? []).map((s) => ({
    id: s.id,
    sceneNumber: s.scene_number,
    intExt: s.int_ext,
    locationSlug: s.location_slug,
    timeOfDay: s.time_of_day,
    synopsis: s.synopsis,
  }));
}
