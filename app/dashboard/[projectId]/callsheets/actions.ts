"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCrewMember,
  updateCrewMember,
  deleteCrewMember,
  setCrewDeptCall,
  setCrewDayCall,
  removeCrewDayCall,
  setCastDayCall,
  upsertCallSheetHeader,
  bumpRevision,
} from "@/lib/callsheet/data";

// ---------------------------------------------------------------------------
// 1. createCrewMemberAction
// ---------------------------------------------------------------------------

const createCrewMemberSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  department: z.string().trim().max(200).default(""),
  position: z.string().trim().max(200).default(""),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  dayRate: z.coerce.number().optional(),
  personId: z.string().uuid().optional(),
  ordinal: z.coerce.number().int().optional(),
});

export async function createCrewMemberAction(formData: FormData) {
  const parsed = createCrewMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    department: formData.get("department") || undefined,
    position: formData.get("position") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    dayRate: formData.get("dayRate") || undefined,
    personId: formData.get("personId") || undefined,
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[createCrewMemberAction]", parsed.error.flatten());
    return;
  }
  const { projectId, name, department, position, email, phone, dayRate, personId, ordinal } =
    parsed.data;
  try {
    const supabase = await createClient();
    await createCrewMember(supabase as never, {
      projectId,
      name,
      department,
      position,
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(dayRate !== undefined && { dayRate }),
      ...(personId !== undefined && { personId }),
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[createCrewMemberAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 2. updateCrewMemberAction
// ---------------------------------------------------------------------------

const updateCrewMemberSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  department: z.string().trim().max(200).optional(),
  position: z.string().trim().max(200).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  dayRate: z.coerce.number().optional(),
  personId: z.string().uuid().optional(),
  ordinal: z.coerce.number().int().optional(),
});

export async function updateCrewMemberAction(formData: FormData) {
  const parsed = updateCrewMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    department: formData.get("department") || undefined,
    position: formData.get("position") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    dayRate: formData.get("dayRate") || undefined,
    personId: formData.get("personId") || undefined,
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[updateCrewMemberAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, name, department, position, email, phone, dayRate, personId, ordinal } =
    parsed.data;
  try {
    const supabase = await createClient();
    await updateCrewMember(supabase as never, {
      id,
      ...(name !== undefined && { name }),
      ...(department !== undefined && { department }),
      ...(position !== undefined && { position }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(dayRate !== undefined && { dayRate }),
      ...(personId !== undefined && { personId }),
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[updateCrewMemberAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 3. deleteCrewMemberAction
// ---------------------------------------------------------------------------

const deleteCrewMemberSchema = z.object({
  projectId: z.string().uuid(),
  crewMemberId: z.string().uuid(),
});

export async function deleteCrewMemberAction(formData: FormData) {
  const parsed = deleteCrewMemberSchema.safeParse({
    projectId: formData.get("projectId"),
    crewMemberId: formData.get("crewMemberId"),
  });
  if (!parsed.success) {
    console.error("[deleteCrewMemberAction]", parsed.error.flatten());
    return;
  }
  const { projectId, crewMemberId } = parsed.data;
  try {
    const supabase = await createClient();
    await deleteCrewMember(supabase as never, crewMemberId);
  } catch (err) {
    console.error("[deleteCrewMemberAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 4. setCrewDeptCallAction
// ---------------------------------------------------------------------------

const setCrewDeptCallSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  department: z.string().trim().min(1).max(200),
  callTime: z.string().trim().min(1),
});

export async function setCrewDeptCallAction(formData: FormData) {
  const parsed = setCrewDeptCallSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    department: formData.get("department"),
    callTime: formData.get("callTime"),
  });
  if (!parsed.success) {
    console.error("[setCrewDeptCallAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId, department, callTime } = parsed.data;
  try {
    const supabase = await createClient();
    await setCrewDeptCall(supabase as never, { shootDayId, department, callTime });
  } catch (err) {
    console.error("[setCrewDeptCallAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 5. setCrewDayCallAction
// ---------------------------------------------------------------------------
// Empty string callTime → null (clears the individual override; cascade falls
// back to dept or general call). Use: parse formData.get("callTime") || null.

const setCrewDayCallSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  crewMemberId: z.string().uuid(),
  // null = clear the individual override
  callTime: z.string().nullable(),
});

export async function setCrewDayCallAction(formData: FormData) {
  const parsed = setCrewDayCallSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    crewMemberId: formData.get("crewMemberId"),
    callTime: formData.get("callTime") || null,
  });
  if (!parsed.success) {
    console.error("[setCrewDayCallAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId, crewMemberId, callTime } = parsed.data;
  try {
    const supabase = await createClient();
    await setCrewDayCall(supabase as never, { shootDayId, crewMemberId, callTime });
  } catch (err) {
    console.error("[setCrewDayCallAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 6. removeCrewDayCallAction
// ---------------------------------------------------------------------------

const removeCrewDayCallSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  crewMemberId: z.string().uuid(),
});

export async function removeCrewDayCallAction(formData: FormData) {
  const parsed = removeCrewDayCallSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    crewMemberId: formData.get("crewMemberId"),
  });
  if (!parsed.success) {
    console.error("[removeCrewDayCallAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId, crewMemberId } = parsed.data;
  try {
    const supabase = await createClient();
    await removeCrewDayCall(supabase as never, { shootDayId, crewMemberId });
  } catch (err) {
    console.error("[removeCrewDayCallAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 7. setCastDayCallAction
// ---------------------------------------------------------------------------

const setCastDayCallSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  personId: z.string().uuid(),
  callTime: z.string().nullable().optional(),
  makeupTime: z.string().nullable().optional(),
  wardrobeTime: z.string().nullable().optional(),
  onSetTime: z.string().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function setCastDayCallAction(formData: FormData) {
  const parsed = setCastDayCallSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    personId: formData.get("personId"),
    // empty string → null: an absent time means "cascade to general", and the
    // editor submits the full form, so a blank field clears the override.
    callTime: formData.get("callTime") || null,
    makeupTime: formData.get("makeupTime") || null,
    wardrobeTime: formData.get("wardrobeTime") || null,
    onSetTime: formData.get("onSetTime") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    console.error("[setCastDayCallAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId, personId, callTime, makeupTime, wardrobeTime, onSetTime, notes } =
    parsed.data;
  try {
    const supabase = await createClient();
    await setCastDayCall(supabase as never, {
      shootDayId,
      personId,
      ...(callTime !== undefined && { callTime }),
      ...(makeupTime !== undefined && { makeupTime }),
      ...(wardrobeTime !== undefined && { wardrobeTime }),
      ...(onSetTime !== undefined && { onSetTime }),
      ...(notes !== undefined && { notes }),
    });
  } catch (err) {
    console.error("[setCastDayCallAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 8. upsertCallSheetHeaderAction
// ---------------------------------------------------------------------------

const upsertCallSheetHeaderSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
  generalCallTime: z.string().nullable().optional(),
  weatherNote: z.string().trim().max(500).nullable().optional(),
  hospitalName: z.string().trim().max(200).nullable().optional(),
  hospitalAddress: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export async function upsertCallSheetHeaderAction(formData: FormData) {
  const parsed = upsertCallSheetHeaderSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
    // empty string → null: the header editor submits the full form, so a blank
    // field clears that header value (null), not a stored empty string.
    generalCallTime: formData.get("generalCallTime") || null,
    weatherNote: formData.get("weatherNote") || null,
    hospitalName: formData.get("hospitalName") || null,
    hospitalAddress: formData.get("hospitalAddress") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    console.error("[upsertCallSheetHeaderAction]", parsed.error.flatten());
    return;
  }
  const {
    projectId,
    shootDayId,
    generalCallTime,
    weatherNote,
    hospitalName,
    hospitalAddress,
    notes,
  } = parsed.data;
  try {
    const supabase = await createClient();
    await upsertCallSheetHeader(supabase as never, {
      shootDayId,
      ...(generalCallTime !== undefined && { generalCallTime }),
      ...(weatherNote !== undefined && { weatherNote }),
      ...(hospitalName !== undefined && { hospitalName }),
      ...(hospitalAddress !== undefined && { hospitalAddress }),
      ...(notes !== undefined && { notes }),
    });
  } catch (err) {
    console.error("[upsertCallSheetHeaderAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}

// ---------------------------------------------------------------------------
// 9. bumpRevisionAction
// ---------------------------------------------------------------------------

const bumpRevisionSchema = z.object({
  projectId: z.string().uuid(),
  shootDayId: z.string().uuid(),
});

export async function bumpRevisionAction(formData: FormData) {
  const parsed = bumpRevisionSchema.safeParse({
    projectId: formData.get("projectId"),
    shootDayId: formData.get("shootDayId"),
  });
  if (!parsed.success) {
    console.error("[bumpRevisionAction]", parsed.error.flatten());
    return;
  }
  const { projectId, shootDayId } = parsed.data;
  try {
    const supabase = await createClient();
    await bumpRevision(supabase as never, shootDayId);
  } catch (err) {
    console.error("[bumpRevisionAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/callsheets`);
}
