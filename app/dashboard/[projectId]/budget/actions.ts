"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateDefaultBudget,
  seedDefaultChart,
  createAccount,
  updateAccount,
  createLine,
  updateLine,
  setLineQuantitySource,
  setLineRateGlobal,
  setLineFringes,
  createGlobal,
  updateGlobal,
  createFringe,
  addCostEntry,
  setContingency,
} from "@/lib/budget/data";
import type { QuantitySource } from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// 1. seedDefaultChartAction
// ---------------------------------------------------------------------------

const seedDefaultChartSchema = z.object({
  projectId: z.string().uuid(),
});

export async function seedDefaultChartAction(formData: FormData) {
  const parsed = seedDefaultChartSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    console.error("[seedDefaultChartAction]", parsed.error.flatten());
    return;
  }
  const { projectId } = parsed.data;
  try {
    const supabase = await createClient();
    const budget = await getOrCreateDefaultBudget(supabase as never, projectId);
    await seedDefaultChart(supabase as never, budget.id);
  } catch (err) {
    console.error("[seedDefaultChartAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 2. createAccountAction
// ---------------------------------------------------------------------------

const createAccountSchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(20),
  section: z.enum(["atl", "btl", "post", "other"]),
  parentAccountId: z.string().uuid().optional(),
  ordinal: z.coerce.number().int().optional(),
});

export async function createAccountAction(formData: FormData) {
  const parsed = createAccountSchema.safeParse({
    projectId: formData.get("projectId"),
    budgetId: formData.get("budgetId"),
    name: formData.get("name"),
    code: formData.get("code"),
    section: formData.get("section"),
    parentAccountId: formData.get("parentAccountId") || undefined,
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[createAccountAction]", parsed.error.flatten());
    return;
  }
  const { projectId, budgetId, name, code, section, parentAccountId, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    await createAccount(supabase as never, {
      budgetId,
      name,
      code,
      section,
      parentAccountId: parentAccountId ?? null,
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[createAccountAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 3. updateAccountAction
// ---------------------------------------------------------------------------

const updateAccountSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().min(1).max(20).optional(),
  section: z.enum(["atl", "btl", "post", "other"]).optional(),
  ordinal: z.coerce.number().int().optional(),
});

export async function updateAccountAction(formData: FormData) {
  const parsed = updateAccountSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    code: formData.get("code") || undefined,
    section: formData.get("section") || undefined,
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[updateAccountAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, name, code, section, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    await updateAccount(supabase as never, id, {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(section !== undefined && { section }),
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[updateAccountAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 4. createLineAction
// ---------------------------------------------------------------------------

const createLineSchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid(),
  accountId: z.string().uuid(),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().optional(),
  rate: z.coerce.number().optional(),
  unit: z.string().trim().max(50).optional(),
  rateGlobalId: z.string().uuid().optional(),
  ordinal: z.coerce.number().int().optional(),
});

export async function createLineAction(formData: FormData) {
  const parsed = createLineSchema.safeParse({
    projectId: formData.get("projectId"),
    budgetId: formData.get("budgetId"),
    accountId: formData.get("accountId"),
    description: formData.get("description"),
    quantity: formData.get("quantity") || undefined,
    rate: formData.get("rate") || undefined,
    unit: formData.get("unit") || undefined,
    rateGlobalId: formData.get("rateGlobalId") || undefined,
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[createLineAction]", parsed.error.flatten());
    return;
  }
  const { projectId, budgetId, accountId, description, quantity, rate, unit, rateGlobalId, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    await createLine(supabase as never, {
      budgetId,
      accountId,
      description,
      quantity: quantity ?? null,
      rate: rate ?? null,
      unit: unit ?? null,
      rateGlobalId: rateGlobalId ?? null,
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[createLineAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 5. updateLineAction
// ---------------------------------------------------------------------------

const updateLineSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(500).optional(),
  quantity: z.coerce.number().optional(),
  rate: z.coerce.number().optional(),
  unit: z.string().trim().max(50).optional(),
  ordinal: z.coerce.number().int().optional(),
});

export async function updateLineAction(formData: FormData) {
  const parsed = updateLineSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
    description: formData.get("description") || undefined,
    quantity: formData.get("quantity") || undefined,
    rate: formData.get("rate") || undefined,
    unit: formData.get("unit") || undefined,
    ordinal: formData.get("ordinal") || undefined,
  });
  if (!parsed.success) {
    console.error("[updateLineAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, description, quantity, rate, unit, ordinal } = parsed.data;
  try {
    const supabase = await createClient();
    await updateLine(supabase as never, id, {
      ...(description !== undefined && { description }),
      ...(quantity !== undefined && { quantity }),
      ...(rate !== undefined && { rate }),
      ...(unit !== undefined && { unit }),
      ...(ordinal !== undefined && { ordinal }),
    });
  } catch (err) {
    console.error("[updateLineAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 6. setLineQuantitySourceAction
// ---------------------------------------------------------------------------
// Parses the discriminated union from flat FormData fields.
// kind = "manual" | "" | null → pass null (revert to manual quantity column)
// kind = "element_count" | "shoot_day_count" | "dood_cast_days" → build params

const setLineQuantitySourceSchema = z.object({
  projectId: z.string().uuid(),
  lineId: z.string().uuid(),
  kind: z.string().optional(),
  // element_count params
  categoryId: z.string().uuid().optional(),
  department: z.string().optional(),
  // shoot_day_count params
  dayType: z.string().optional(),
  // dood_cast_days params
  personId: z.string().uuid().optional(),
});

export async function setLineQuantitySourceAction(formData: FormData) {
  const parsed = setLineQuantitySourceSchema.safeParse({
    projectId: formData.get("projectId"),
    lineId: formData.get("lineId"),
    kind: formData.get("kind") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    department: formData.get("department") || undefined,
    dayType: formData.get("dayType") || undefined,
    personId: formData.get("personId") || undefined,
  });
  if (!parsed.success) {
    console.error("[setLineQuantitySourceAction]", parsed.error.flatten());
    return;
  }
  const { projectId, lineId, kind, categoryId, department, dayType, personId } = parsed.data;

  // Resolve the QuantitySource union or null
  let quantitySourceValue: QuantitySource | null = null;
  if (kind && kind !== "manual") {
    if (kind === "element_count") {
      quantitySourceValue = {
        kind: "element_count",
        params: {
          ...(categoryId !== undefined && { categoryId }),
          ...(department !== undefined && { department }),
        },
      };
    } else if (kind === "shoot_day_count") {
      quantitySourceValue = {
        kind: "shoot_day_count",
        params: {
          ...(dayType !== undefined && { dayType }),
        },
      };
    } else if (kind === "dood_cast_days") {
      if (!personId) {
        console.error("[setLineQuantitySourceAction] dood_cast_days requires personId");
        return;
      }
      quantitySourceValue = {
        kind: "dood_cast_days",
        params: { personId },
      };
    } else {
      console.error("[setLineQuantitySourceAction] unknown kind:", kind);
      return;
    }
  }

  try {
    const supabase = await createClient();
    await setLineQuantitySource(supabase as never, lineId, quantitySourceValue);
  } catch (err) {
    console.error("[setLineQuantitySourceAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 7. setLineRateGlobalAction
// ---------------------------------------------------------------------------

const setLineRateGlobalSchema = z.object({
  projectId: z.string().uuid(),
  lineId: z.string().uuid(),
  rateGlobalId: z.string().uuid().optional(),
});

export async function setLineRateGlobalAction(formData: FormData) {
  const parsed = setLineRateGlobalSchema.safeParse({
    projectId: formData.get("projectId"),
    lineId: formData.get("lineId"),
    rateGlobalId: formData.get("rateGlobalId") || undefined,
  });
  if (!parsed.success) {
    console.error("[setLineRateGlobalAction]", parsed.error.flatten());
    return;
  }
  const { projectId, lineId, rateGlobalId } = parsed.data;
  try {
    const supabase = await createClient();
    await setLineRateGlobal(supabase as never, lineId, rateGlobalId ?? null);
  } catch (err) {
    console.error("[setLineRateGlobalAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 8. setLineFringesAction
// ---------------------------------------------------------------------------

const setLineFringesSchema = z.object({
  projectId: z.string().uuid(),
  lineId: z.string().uuid(),
  fringeIds: z.array(z.string().uuid()),
});

export async function setLineFringesAction(formData: FormData) {
  const rawFringeIds = formData.getAll("fringeIds") as string[];
  const parsed = setLineFringesSchema.safeParse({
    projectId: formData.get("projectId"),
    lineId: formData.get("lineId"),
    fringeIds: rawFringeIds.filter(Boolean),
  });
  if (!parsed.success) {
    console.error("[setLineFringesAction]", parsed.error.flatten());
    return;
  }
  const { projectId, lineId, fringeIds } = parsed.data;
  try {
    const supabase = await createClient();
    await setLineFringes(supabase as never, lineId, fringeIds);
  } catch (err) {
    console.error("[setLineFringesAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 9. createGlobalAction
// ---------------------------------------------------------------------------

const createGlobalSchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["rate", "percent"]),
  value: z.coerce.number(),
});

export async function createGlobalAction(formData: FormData) {
  const parsed = createGlobalSchema.safeParse({
    projectId: formData.get("projectId"),
    budgetId: formData.get("budgetId"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    value: formData.get("value"),
  });
  if (!parsed.success) {
    console.error("[createGlobalAction]", parsed.error.flatten());
    return;
  }
  const { projectId, budgetId, name, kind } = parsed.data;
  // percent-kind globals stored as decimal (15% → 0.15), consistent with fringes
  const value = kind === "percent" ? parsed.data.value / 100 : parsed.data.value;
  try {
    const supabase = await createClient();
    await createGlobal(supabase as never, { budgetId, name, kind, value });
  } catch (err) {
    console.error("[createGlobalAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 10. updateGlobalAction
// ---------------------------------------------------------------------------

const updateGlobalSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  kind: z.enum(["rate", "percent"]).optional(),
  value: z.coerce.number().optional(),
});

export async function updateGlobalAction(formData: FormData) {
  const parsed = updateGlobalSchema.safeParse({
    projectId: formData.get("projectId"),
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    kind: formData.get("kind") || undefined,
    value: formData.get("value") || undefined,
  });
  if (!parsed.success) {
    console.error("[updateGlobalAction]", parsed.error.flatten());
    return;
  }
  const { projectId, id, name, kind } = parsed.data;
  // percent-kind globals stored as decimal (15% → 0.15), consistent with fringes
  const rawValue = parsed.data.value;
  const value =
    rawValue !== undefined && (kind ?? undefined) === "percent"
      ? rawValue / 100
      : rawValue;
  try {
    const supabase = await createClient();
    await updateGlobal(supabase as never, id, {
      ...(name !== undefined && { name }),
      ...(kind !== undefined && { kind }),
      ...(value !== undefined && { value }),
    });
  } catch (err) {
    console.error("[updateGlobalAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 11. createFringeAction
// ---------------------------------------------------------------------------
// UI sends human percent (0–100); stored as decimal (0.15 = 15%).
// Conversion happens here so the form can use a plain number input labeled "%".

const createFringeSchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  // UI sends human percent (0–100); converted to decimal before writing
  percent: z.coerce.number().min(0).max(1000),
});

export async function createFringeAction(formData: FormData) {
  const parsed = createFringeSchema.safeParse({
    projectId: formData.get("projectId"),
    budgetId: formData.get("budgetId"),
    name: formData.get("name"),
    percent: formData.get("percent"),
  });
  if (!parsed.success) {
    console.error("[createFringeAction]", parsed.error.flatten());
    return;
  }
  const { projectId, budgetId, name, percent } = parsed.data;
  // UI sends human percent (0–100); stored as decimal
  const percentDecimal = percent / 100;
  try {
    const supabase = await createClient();
    await createFringe(supabase as never, { budgetId, name, percent: percentDecimal });
  } catch (err) {
    console.error("[createFringeAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 12. setContingencyAction
// ---------------------------------------------------------------------------
// UI sends human percent (0–100); stored as decimal (0.10 = 10%).
// setContingency data-layer contract (decimal, min(0).max(1)) is unchanged.

const setContingencySchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid(),
  // UI sends human percent (0–100); converted to decimal before writing
  percent: z.coerce.number().min(0).max(100),
  basis: z.enum(["btl", "total", "none"]),
});

export async function setContingencyAction(formData: FormData) {
  const parsed = setContingencySchema.safeParse({
    projectId: formData.get("projectId"),
    budgetId: formData.get("budgetId"),
    percent: formData.get("percent"),
    basis: formData.get("basis"),
  });
  if (!parsed.success) {
    console.error("[setContingencyAction]", parsed.error.flatten());
    return;
  }
  const { projectId, budgetId, percent, basis } = parsed.data;
  // UI sends human percent (0–100); stored as decimal
  const percentDecimal = percent / 100;
  try {
    const supabase = await createClient();
    await setContingency(supabase as never, budgetId, { percent: percentDecimal, basis });
  } catch (err) {
    console.error("[setContingencyAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}

// ---------------------------------------------------------------------------
// 13. addCostEntryAction
// ---------------------------------------------------------------------------

const addCostEntrySchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid(),
  accountId: z.string().uuid(),
  lineId: z.string().uuid().optional(),
  amount: z.coerce.number().refine((v) => v !== 0, "amount must be non-zero"),
  entryDate: z.string(),
  note: z.string().trim().max(500).optional(),
});

export async function addCostEntryAction(formData: FormData) {
  const parsed = addCostEntrySchema.safeParse({
    projectId: formData.get("projectId"),
    budgetId: formData.get("budgetId"),
    accountId: formData.get("accountId"),
    lineId: formData.get("lineId") || undefined,
    amount: formData.get("amount"),
    entryDate: formData.get("entryDate"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    console.error("[addCostEntryAction]", parsed.error.flatten());
    return;
  }
  const { projectId, budgetId, accountId, lineId, amount, entryDate, note } = parsed.data;
  try {
    const supabase = await createClient();
    await addCostEntry(supabase as never, {
      budgetId,
      accountId,
      lineId: lineId ?? null,
      amount,
      entryDate,
      note: note ?? null,
    });
  } catch (err) {
    console.error("[addCostEntryAction]", err);
    return;
  }
  revalidatePath(`/dashboard/${projectId}/budget`);
}
