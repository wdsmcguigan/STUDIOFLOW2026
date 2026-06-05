"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createShootDay,
  updateShootDay,
  getOrCreateDefaultSegment,
  createStrip,
  reorderStrips,
  splitSegment,
  deleteStrip,
  setCastOverride,
  createLocation,
  createSet,
  ensureSetForSlug,
} from "@/lib/schedule/data";

// ---------------------------------------------------------------------------
// 1. createShootDayAction
// ---------------------------------------------------------------------------

const createShootDaySchema = z.object({
  projectId: z.string().uuid(),
  dayType: z.string().optional(),
  unit: z.string().optional(),
  date: z.string().optional(),
  ordinal: z.coerce.number().int().optional(),
  name: z.string().trim().max(120).optional(),
});

export async function createShootDayAction(formData: FormData) {
  const parsed = createShootDaySchema.safeParse({
    projectId: formData.get("projectId"),
    dayType: formData.get("dayType") || undefined,
    unit: formData.get("unit") || undefined,
    date: formData.get("date") || undefined,
    ordinal: formData.get("ordinal") || undefined,
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    console.error("[createShootDayAction]", parsed.error.flatten());
    return;
  }
  const { projectId, dayType, unit, date, ordinal, name } = parsed.data;
  try {
    const supabase = await createClient();
    await createShootDay(supabase as never, {
      projectId,
      ...(dayType !== undefined && { dayType }),
      ...(unit !== undefined && { unit }),
      ...(date !== undefined && { date }),
      ...(ordinal !== undefined && { ordinal }),
      ...(name !== undefined && { name }),
    });
  } catch (err) {
    console.error("[createShootDayAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 2. setShootDayDateAction
// ---------------------------------------------------------------------------

const setShootDayDateSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  date: z.string(), // empty string → null; non-empty → date string
});

export async function setShootDayDateAction(formData: FormData) {
  const parsed = setShootDayDateSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
    date: formData.get("date") ?? "",
  });
  if (!parsed.success) {
    console.error("[setShootDayDateAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, date } = parsed.data;
  const resolvedDate = date === "" ? null : date;
  try {
    const supabase = await createClient();
    await updateShootDay(supabase as never, { id, date: resolvedDate });
  } catch (err) {
    console.error("[setShootDayDateAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 3. addSceneToDayAction
// ---------------------------------------------------------------------------

const addSceneToDaySchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  ordinal: z.coerce.number().int().optional(),
});

export async function addSceneToDayAction(formData: FormData) {
  const parsed = addSceneToDaySchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    shootDayId: formData.get("shootDayId"),
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[addSceneToDayAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, shootDayId, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    const seg = await getOrCreateDefaultSegment(supabase as never, { projectId, sceneId });
    await createStrip(supabase as never, {
      projectId,
      shootDayId,
      type: "scene",
      sceneSegmentId: seg.id,
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[addSceneToDayAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 4. reorderStripsAction
// ---------------------------------------------------------------------------

const reorderStripsSchema = z.object({
  projectId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()),
});

export async function reorderStripsAction(formData: FormData) {
  const rawIds = (formData.get("orderedIds") as string | null) ?? "";
  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const parsed = reorderStripsSchema.safeParse({
    projectId: formData.get("projectId"),
    orderedIds: ids,
  });
  if (!parsed.success) {
    console.error("[reorderStripsAction]", parsed.error.flatten());
    return;
  }
  const { projectId, orderedIds } = parsed.data;
  try {
    const supabase = await createClient();
    await reorderStrips(supabase as never, orderedIds);
  } catch (err) {
    console.error("[reorderStripsAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 5. splitSceneAction
// ---------------------------------------------------------------------------

const splitSceneSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  eighths: z.array(z.number().int().positive()).min(2),
});

export async function splitSceneAction(formData: FormData) {
  const rawEighths = (formData.get("eighths") as string | null) ?? "";
  const eighths = rawEighths
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  const parsed = splitSceneSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    eighths,
  });
  if (!parsed.success) {
    console.error("[splitSceneAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, eighths: validatedEighths } = parsed.data;
  try {
    const supabase = await createClient();
    await splitSegment(supabase as never, {
      projectId,
      sceneId,
      eighths: validatedEighths,
    });
  } catch (err) {
    console.error("[splitSceneAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 6. insertDayBreakAction
// ---------------------------------------------------------------------------

const insertDayBreakSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  ordinal: z.coerce.number().int().optional(),
});

export async function insertDayBreakAction(formData: FormData) {
  const parsed = insertDayBreakSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[insertDayBreakAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    await createStrip(supabase as never, {
      projectId,
      shootDayId,
      type: "day_break",
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[insertDayBreakAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 7. insertBannerAction
// ---------------------------------------------------------------------------

const insertBannerSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  bannerText: z.string().trim().min(1).max(500),
  ordinal: z.coerce.number().int().optional(),
});

export async function insertBannerAction(formData: FormData) {
  const parsed = insertBannerSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    bannerText: formData.get("bannerText"),
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[insertBannerAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId, bannerText, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    await createStrip(supabase as never, {
      projectId,
      shootDayId,
      type: "banner",
      bannerText,
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[insertBannerAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 8. deleteStripAction
// ---------------------------------------------------------------------------

const deleteStripSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function deleteStripAction(formData: FormData) {
  const parsed = deleteStripSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
  });
  if (!parsed.success) {
    console.error("[deleteStripAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id } = parsed.data;
  try {
    const supabase = await createClient();
    await deleteStrip(supabase as never, id);
  } catch (err) {
    console.error("[deleteStripAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 9. setCastOverrideAction
// ---------------------------------------------------------------------------

const setCastOverrideSchema = z.object({
  projectId: z.string().uuid(),
  personId: z.string().uuid(),
  date: z.string(),
  status: z.enum(["work", "hold", "start", "finish", "travel", "drop", "pickup", "idle"]),
  note: z.string().trim().max(500).optional(),
});

export async function setCastOverrideAction(formData: FormData) {
  const parsed = setCastOverrideSchema.safeParse({
    projectId: formData.get("projectId"),
    personId: formData.get("personId"),
    date: formData.get("date"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    console.error("[setCastOverrideAction]", parsed.error.flatten());
    return;
  }
  const { projectId, personId, date, status, note } = parsed.data;
  try {
    const supabase = await createClient();
    await setCastOverride(supabase as never, {
      projectId,
      personId,
      date,
      status,
      note: note ?? null,
    });
  } catch (err) {
    console.error("[setCastOverrideAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 10. createLocationAction
// ---------------------------------------------------------------------------

const createLocationSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  timezone: z.string().trim().max(64).optional(),
});

export async function createLocationAction(formData: FormData) {
  const parsed = createLocationSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    timezone: formData.get("timezone") || undefined,
  });
  if (!parsed.success) {
    console.error("[createLocationAction]", parsed.error.flatten());
    return;
  }
  const { projectId, name, address, timezone } = parsed.data;
  try {
    const supabase = await createClient();
    await createLocation(supabase as never, {
      projectId,
      name,
      address: address ?? null,
      timezone: timezone ?? null,
    });
  } catch (err) {
    console.error("[createLocationAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 11. createSetAction
// ---------------------------------------------------------------------------

const createSetSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  locationId: z.string().uuid().optional(),
});

export async function createSetAction(formData: FormData) {
  const parsed = createSetSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    locationId: formData.get("locationId") || undefined,
  });
  if (!parsed.success) {
    console.error("[createSetAction]", parsed.error.flatten());
    return;
  }
  const { projectId, name, locationId } = parsed.data;
  try {
    const supabase = await createClient();
    await createSet(supabase as never, {
      projectId,
      name,
      locationId: locationId ?? null,
    });
  } catch (err) {
    console.error("[createSetAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}

// ---------------------------------------------------------------------------
// 12. mapSlugToSetAction
// ---------------------------------------------------------------------------

const mapSlugToSetSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  slug: z.string().trim().min(1).max(200),
});

export async function mapSlugToSetAction(formData: FormData) {
  const parsed = mapSlugToSetSchema.safeParse({
    projectId: formData.get("projectId"),
    sceneId: formData.get("sceneId"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    console.error("[mapSlugToSetAction]", parsed.error.flatten());
    return;
  }
  const { projectId, sceneId, slug } = parsed.data;
  try {
    const supabase = await createClient();
    await ensureSetForSlug(supabase as never, { projectId, sceneId, slug });
  } catch (err) {
    console.error("[mapSlugToSetAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/schedule`);
}
