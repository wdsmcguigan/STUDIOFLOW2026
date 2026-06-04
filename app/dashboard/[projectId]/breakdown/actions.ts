"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { start, getRun } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { breakdownWorkflow } from "@/workflows/breakdown";
import {
  createJob,
  setJobStatus,
  getJob,
  listScenesForBreakdown,
  createElement,
  createCharacter,
  createOrganization,
  createPerson,
  setCharacterCast,
  mergeCharacter,
  tagSceneElement,
  tagSceneCharacter,
} from "@/lib/breakdown/data";

const startBreakdownInput = z.object({
  projectId: z.string().uuid(),
  scriptId: z.string().uuid(),
});

export async function startBreakdownAction(formData: FormData) {
  const parsed = startBreakdownInput.safeParse({
    projectId: formData.get("projectId"),
    scriptId: formData.get("scriptId"),
  });
  if (!parsed.success) return;
  const { projectId, scriptId } = parsed.data;
  try {
    const supabase = await createClient(); // USER RLS context — proves ownership
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const scenes = await listScenesForBreakdown(supabase as never, scriptId); // RLS: only the user's scenes
    if (scenes.length === 0) return;
    const jobRow = await createJob(supabase as never, {
      projectId,
      type: "breakdown",
      params: { scriptId, sceneIds: scenes.map((s) => s.id) },
      total: scenes.length,
      createdBy: user.id,
    });
    const run = await start(breakdownWorkflow, [
      { jobId: jobRow.id, projectId, scenes },
    ]);
    await setJobStatus(supabase as never, {
      id: jobRow.id,
      status: "running",
      workflowRunId: run.runId,
    });
  } catch (err) {
    console.error("[startBreakdownAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const cancelInput = z.object({
  projectId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export async function cancelJobAction(formData: FormData) {
  const parsed = cancelInput.safeParse({
    projectId: formData.get("projectId"),
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) return;
  const { projectId, jobId } = parsed.data;
  try {
    const supabase = await createClient();
    const j = await getJob(supabase as never, jobId); // RLS: only if the user owns it
    await setJobStatus(supabase as never, { id: jobId, status: "cancelled" }); // cooperative cancel flag
    if (j?.workflow_run_id) {
      try {
        await getRun(j.workflow_run_id).cancel(); // best-effort native WDK cancel
      } catch {
        // best-effort — log swallowed; cooperative flag is the reliable path
      }
    }
  } catch (err) {
    console.error("[cancelJobAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

// ---------------------------------------------------------------------------
// Manual catalog actions
// ---------------------------------------------------------------------------

const createElementSchema = z.object({
  projectId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export async function createElementAction(formData: FormData) {
  const parsed = createElementSchema.safeParse({
    projectId: formData.get("projectId"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    console.error("[createElementAction]", parsed.error.flatten());
    return;
  }
  const { projectId, categoryId, name, description } = parsed.data;
  try {
    const supabase = await createClient();
    await createElement(supabase as never, {
      projectId,
      categoryId,
      name,
      description: description ?? null,
      vendorOrgId: null,
    });
  } catch (err) {
    console.error("[createElementAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const createCharacterSchema = z.object({
  projectId: z.string().uuid(),
  primaryName: z.string().trim().min(1).max(200),
  aliases: z.string().optional(), // comma-separated
  description: z.string().trim().max(2000).optional(),
});

export async function createCharacterAction(formData: FormData) {
  const parsed = createCharacterSchema.safeParse({
    projectId: formData.get("projectId"),
    primaryName: formData.get("primaryName"),
    aliases: formData.get("aliases") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    console.error("[createCharacterAction]", parsed.error.flatten());
    return;
  }
  const { projectId, primaryName, aliases, description } = parsed.data;
  const aliasList = aliases
    ? aliases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  try {
    const supabase = await createClient();
    await createCharacter(supabase as never, {
      projectId,
      primaryName,
      aliases: aliasList,
      description: description ?? null,
    });
  } catch (err) {
    console.error("[createCharacterAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const createOrganizationSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  type: z.enum([
    "production_company",
    "agency",
    "vendor",
    "payroll",
    "insurer",
    "other",
  ]),
  notes: z.string().trim().max(2000).optional(),
});

export async function createOrganizationAction(formData: FormData) {
  const parsed = createOrganizationSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    type: formData.get("type"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    console.error("[createOrganizationAction]", parsed.error.flatten());
    return;
  }
  const { projectId, name, type, notes } = parsed.data;
  try {
    const supabase = await createClient();
    await createOrganization(supabase as never, {
      projectId,
      name,
      type,
      notes: notes ?? null,
    });
  } catch (err) {
    console.error("[createOrganizationAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const createPersonSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().trim().max(50).optional(),
  orgId: z.string().uuid().optional(),
});

export async function createPersonAction(formData: FormData) {
  const parsed = createPersonSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    orgId: formData.get("orgId") || undefined,
  });
  if (!parsed.success) {
    console.error("[createPersonAction]", parsed.error.flatten());
    return;
  }
  const { projectId, name, contactEmail, contactPhone, orgId } = parsed.data;
  try {
    const supabase = await createClient();
    await createPerson(supabase as never, {
      projectId,
      name,
      contactEmail: contactEmail ?? null,
      contactPhone: contactPhone ?? null,
      orgId: orgId ?? null,
    });
  } catch (err) {
    console.error("[createPersonAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const castPersonSchema = z.object({
  projectId: z.string().uuid(),
  characterId: z.string().uuid(),
  personId: z.string().uuid().nullable(),
});

export async function castPersonAction(formData: FormData) {
  const rawPersonId = formData.get("personId");
  const parsed = castPersonSchema.safeParse({
    projectId: formData.get("projectId"),
    characterId: formData.get("characterId"),
    personId: rawPersonId && rawPersonId !== "" ? rawPersonId : null,
  });
  if (!parsed.success) {
    console.error("[castPersonAction]", parsed.error.flatten());
    return;
  }
  const { projectId, characterId, personId } = parsed.data;
  try {
    const supabase = await createClient();
    await setCharacterCast(supabase as never, { characterId, personId });
  } catch (err) {
    console.error("[castPersonAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

const mergeCharacterSchema = z.object({
  projectId: z.string().uuid(),
  survivorId: z.string().uuid(),
  absorbedId: z.string().uuid(),
});

export async function mergeCharacterAction(formData: FormData) {
  const parsed = mergeCharacterSchema.safeParse({
    projectId: formData.get("projectId"),
    survivorId: formData.get("survivorId"),
    absorbedId: formData.get("absorbedId"),
  });
  if (!parsed.success) {
    console.error("[mergeCharacterAction]", parsed.error.flatten());
    return;
  }
  const { projectId, survivorId, absorbedId } = parsed.data;
  if (survivorId === absorbedId) {
    console.error("[mergeCharacterAction] cannot merge a character into itself");
    return;
  }
  try {
    const supabase = await createClient();
    await mergeCharacter(supabase as never, { projectId, survivorId, absorbedId });
  } catch (err) {
    console.error("[mergeCharacterAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
}

// ---------------------------------------------------------------------------
// Scene tagging actions (provenance=manual, status=confirmed)
// ---------------------------------------------------------------------------

const tagSceneElementSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  elementId: z.string().uuid(),
  quote: z.string().trim().optional(),
  prefix: z.string().trim().optional(),
  suffix: z.string().trim().optional(),
});

export async function tagSceneElementAction(formData: FormData) {
  const parsed = tagSceneElementSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    elementId: formData.get("elementId"),
    quote: formData.get("quote") || undefined,
    prefix: formData.get("prefix") || undefined,
    suffix: formData.get("suffix") || undefined,
  });
  if (!parsed.success) {
    console.error("[tagSceneElementAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, elementId, quote, prefix, suffix } = parsed.data;
  const textAnchor = quote
    ? { quote, prefix: prefix ?? "", suffix: suffix ?? "", hintOffset: null }
    : null;
  try {
    const supabase = await createClient();
    await tagSceneElement(supabase as never, {
      projectId,
      sceneId,
      elementId,
      provenance: "manual",
      status: "confirmed",
      textAnchor,
      anchorState: "anchored",
    });
  } catch (err) {
    console.error("[tagSceneElementAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
  const scriptIdParam = formData.get("scriptId");
  if (scriptIdParam) {
    revalidatePath(
      `/dashboard/${projectId}/scripts/${scriptIdParam}/scenes/${sceneId}`,
    );
  }
}

const tagSceneCharacterSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  characterId: z.string().uuid(),
  presenceType: z.enum(["speaking", "silent_featured", "background", "voice_only"]),
  quote: z.string().trim().optional(),
  prefix: z.string().trim().optional(),
  suffix: z.string().trim().optional(),
});

export async function tagSceneCharacterAction(formData: FormData) {
  const parsed = tagSceneCharacterSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    characterId: formData.get("characterId"),
    presenceType: formData.get("presenceType"),
    quote: formData.get("quote") || undefined,
    prefix: formData.get("prefix") || undefined,
    suffix: formData.get("suffix") || undefined,
  });
  if (!parsed.success) {
    console.error("[tagSceneCharacterAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, characterId, presenceType, quote, prefix, suffix } =
    parsed.data;
  const textAnchor = quote
    ? { quote, prefix: prefix ?? "", suffix: suffix ?? "", hintOffset: null }
    : null;
  try {
    const supabase = await createClient();
    await tagSceneCharacter(supabase as never, {
      projectId,
      sceneId,
      characterId,
      presenceType,
      provenance: "manual",
      status: "confirmed",
      textAnchor,
      anchorState: "anchored",
    });
  } catch (err) {
    console.error("[tagSceneCharacterAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/breakdown`);
  const scriptIdParam = formData.get("scriptId");
  if (scriptIdParam) {
    revalidatePath(
      `/dashboard/${projectId}/scripts/${scriptIdParam}/scenes/${sceneId}`,
    );
  }
}
