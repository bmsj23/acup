import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EquipmentStatus } from "@/lib/constants/equipment";
import { EQUIPMENT_STATUSES } from "@/lib/constants/equipment";
import {
  buildTrailingMonths,
  percentageFromRatio,
  roundToTwo,
} from "@/lib/data/monitoring";
import type {
  EquipmentAssetItem,
  EquipmentAssetSnapshot,
  EquipmentDepartmentSummary,
  EquipmentRecordItem,
  EquipmentSummaryResponse,
} from "@/types/monitoring";

const reportMonthRegex = /^\d{4}-\d{2}-01$/;

export const createEquipmentAssetSchema = z.object({
  department_id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  category: z.string().trim().min(1).max(255),
  is_active: z.boolean().optional(),
});

export const updateEquipmentAssetSchema = createEquipmentAssetSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const equipmentRecordBaseSchema = z.object({
  report_month: z.string().regex(reportMonthRegex),
  equipment_asset_id: z.string().uuid(),
  available_hours: z.number().min(0),
  actual_usage_hours: z.number().min(0),
  status: z.enum(EQUIPMENT_STATUSES),
  notes: z.string().trim().max(5000).nullable().optional(),
});

function validateEquipmentRecordHours(
  value: {
    available_hours?: number;
    actual_usage_hours?: number;
  },
  ctx: z.RefinementCtx,
) {
  if (
    value.available_hours !== undefined
    && value.actual_usage_hours !== undefined
    && value.actual_usage_hours > value.available_hours
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "actual_usage_hours cannot exceed available_hours",
      path: ["actual_usage_hours"],
    });
  }
}

export const createEquipmentRecordSchema = equipmentRecordBaseSchema.superRefine(
  validateEquipmentRecordHours,
);

export const updateEquipmentRecordSchema = equipmentRecordBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .superRefine(validateEquipmentRecordHours);

export type CreateEquipmentAssetInput = z.infer<typeof createEquipmentAssetSchema>;
export type UpdateEquipmentAssetInput = z.infer<typeof updateEquipmentAssetSchema>;
export type CreateEquipmentRecordInput = z.infer<typeof createEquipmentRecordSchema>;
export type UpdateEquipmentRecordInput = z.infer<typeof updateEquipmentRecordSchema>;

const equipmentAssetSelect =
  "id, department_id, name, category, is_active, created_at, departments!department_id(name, code)";

const equipmentRecordSelect = [
  "id",
  "report_month",
  "equipment_asset_id",
  "available_hours",
  "actual_usage_hours",
  "status",
  "notes",
  "recorded_by",
  "updated_by",
  "created_at",
  "updated_at",
  "equipment_assets!equipment_asset_id(id, department_id, name, category, is_active, created_at, departments!department_id(name, code))",
].join(", ");

function createStatusBreakdown(): Record<EquipmentStatus, number> {
  return {
    active: 0,
    idle: 0,
    maintenance: 0,
  };
}

function normalizeAssetRow(row: Record<string, unknown>): EquipmentAssetItem {
  const departments = row.departments as { name?: string; code?: string } | null;

  return {
    id: row.id as string,
    department_id: row.department_id as string,
    name: row.name as string,
    category: row.category as string,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    departments: departments
      ? {
          name: departments.name ?? "Unknown Department",
          code: departments.code ?? "",
        }
      : null,
  };
}

function normalizeRecordRow(row: Record<string, unknown>): EquipmentRecordItem {
  const equipmentAssets = row.equipment_assets as Record<string, unknown> | null;

  return {
    id: row.id as string,
    report_month: row.report_month as string,
    equipment_asset_id: row.equipment_asset_id as string,
    available_hours: Number(row.available_hours ?? 0),
    actual_usage_hours: Number(row.actual_usage_hours ?? 0),
    status: row.status as EquipmentStatus,
    notes: (row.notes as string | null) ?? null,
    recorded_by: row.recorded_by as string,
    updated_by: row.updated_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    equipment_assets: equipmentAssets ? normalizeAssetRow(equipmentAssets) : null,
  };
}

export async function listEquipmentAssets(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    is_active?: boolean | null;
  },
) {
  let query = supabase
    .from("equipment_assets")
    .select(equipmentAssetSelect, { count: "exact" })
    .order("name", { ascending: true })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.is_active !== null && params.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  return await query;
}

export async function createEquipmentAsset(
  supabase: SupabaseClient,
  payload: CreateEquipmentAssetInput,
) {
  return await supabase
    .from("equipment_assets")
    .insert({
      department_id: payload.department_id,
      name: payload.name,
      category: payload.category,
      is_active: payload.is_active ?? true,
    })
    .select(equipmentAssetSelect)
    .single();
}

export async function getEquipmentAssetById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("equipment_assets")
    .select(equipmentAssetSelect)
    .eq("id", id)
    .single();
}

export async function updateEquipmentAssetById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateEquipmentAssetInput,
) {
  return await supabase
    .from("equipment_assets")
    .update({
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
    })
    .eq("id", id)
    .select(equipmentAssetSelect)
    .single();
}

export async function deleteEquipmentAssetById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("equipment_assets")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function listEquipmentRecords(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    equipment_asset_id?: string | null;
    equipment_asset_ids?: string[] | null;
    report_month?: string | null;
  },
) {
  let query = supabase
    .from("equipment_utilization_monthly")
    .select(equipmentRecordSelect, { count: "exact" })
    .order("report_month", { ascending: false })
    .range(params.from, params.to);

  if (params.equipment_asset_id) {
    query = query.eq("equipment_asset_id", params.equipment_asset_id);
  }

  if (params.equipment_asset_ids && params.equipment_asset_ids.length > 0) {
    query = query.in("equipment_asset_id", params.equipment_asset_ids);
  }

  if (params.report_month) {
    query = query.eq("report_month", params.report_month);
  }

  return await query;
}

export async function createEquipmentRecord(
  supabase: SupabaseClient,
  payload: CreateEquipmentRecordInput,
  userId: string,
) {
  return await supabase
    .from("equipment_utilization_monthly")
    .insert({
      report_month: payload.report_month,
      equipment_asset_id: payload.equipment_asset_id,
      available_hours: payload.available_hours,
      actual_usage_hours: payload.actual_usage_hours,
      status: payload.status,
      notes: payload.notes ?? null,
      recorded_by: userId,
      updated_by: userId,
    })
    .select(equipmentRecordSelect)
    .single();
}

export async function getEquipmentRecordById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("equipment_utilization_monthly")
    .select(equipmentRecordSelect)
    .eq("id", id)
    .single();
}

export async function updateEquipmentRecordById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateEquipmentRecordInput,
  userId: string,
) {
  return await supabase
    .from("equipment_utilization_monthly")
    .update({
      ...(payload.report_month !== undefined ? { report_month: payload.report_month } : {}),
      ...(payload.equipment_asset_id !== undefined
        ? { equipment_asset_id: payload.equipment_asset_id }
        : {}),
      ...(payload.available_hours !== undefined ? { available_hours: payload.available_hours } : {}),
      ...(payload.actual_usage_hours !== undefined
        ? { actual_usage_hours: payload.actual_usage_hours }
        : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      updated_by: userId,
    })
    .eq("id", id)
    .select(equipmentRecordSelect)
    .single();
}

export async function deleteEquipmentRecordById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("equipment_utilization_monthly")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function buildEquipmentSummary(
  supabase: SupabaseClient,
  params: {
    month: string;
    reportMonth: string;
    prevReportMonth: string;
    departmentId?: string | null;
  },
): Promise<Omit<EquipmentSummaryResponse, "filters" | "role_scope">> {
  const trailingMonths = buildTrailingMonths(params.month, 6);
  const trailingReportMonths = trailingMonths.map((item) => item.report_month);

  const [assetsResult, currentRecordsResult, previousRecordsResult, trendRecordsResult] =
    await Promise.all([
      supabase
        .from("equipment_assets")
        .select(equipmentAssetSelect)
        .order("name", { ascending: true }),
      supabase
        .from("equipment_utilization_monthly")
        .select(equipmentRecordSelect)
        .eq("report_month", params.reportMonth),
      supabase
        .from("equipment_utilization_monthly")
        .select(equipmentRecordSelect)
        .eq("report_month", params.prevReportMonth),
      supabase
        .from("equipment_utilization_monthly")
        .select(equipmentRecordSelect)
        .in("report_month", trailingReportMonths),
    ]);

  const error =
    assetsResult.error
    ?? currentRecordsResult.error
    ?? previousRecordsResult.error
    ?? trendRecordsResult.error;

  if (error) {
    throw error;
  }

  const rawAssets = (assetsResult.data ?? []) as Record<string, unknown>[];
  const allAssets = rawAssets.map(normalizeAssetRow);
  const filteredAssets = params.departmentId
    ? allAssets.filter((asset) => asset.department_id === params.departmentId)
    : allAssets;

  const assetMap = new Map(filteredAssets.map((asset) => [asset.id, asset]));

  const normalizeFilteredRecords = (rows: Record<string, unknown>[] | null) =>
    (rows ?? [])
      .map(normalizeRecordRow)
      .filter((row) => assetMap.has(row.equipment_asset_id));

  const currentRecords = normalizeFilteredRecords(
    currentRecordsResult.data as Record<string, unknown>[] | null,
  );
  const previousRecords = normalizeFilteredRecords(
    previousRecordsResult.data as Record<string, unknown>[] | null,
  );
  const trendRecords = normalizeFilteredRecords(
    trendRecordsResult.data as Record<string, unknown>[] | null,
  );

  const currentRecordMap = new Map(currentRecords.map((record) => [record.equipment_asset_id, record]));

  const assetRows: EquipmentAssetSnapshot[] = filteredAssets
    .map((asset) => {
      const record = currentRecordMap.get(asset.id);
      const departmentName = asset.departments?.name ?? "Unknown Department";

      return {
        equipment_asset_id: asset.id,
        equipment_name: asset.name,
        category: asset.category,
        department_id: asset.department_id,
        department_name: departmentName,
        is_active: asset.is_active,
        has_record: Boolean(record),
        available_hours: record?.available_hours ?? 0,
        actual_usage_hours: record?.actual_usage_hours ?? 0,
        utilization_pct: record
          ? percentageFromRatio(record.actual_usage_hours, record.available_hours)
          : 0,
        status: record?.status ?? null,
        notes: record?.notes ?? null,
        updated_at: record?.updated_at ?? null,
      };
    })
    .sort((left, right) =>
      left.department_name.localeCompare(right.department_name)
      || left.equipment_name.localeCompare(right.equipment_name),
    );

  const totals = assetRows.reduce(
    (accumulator, row) => {
      accumulator.asset_count += 1;
      accumulator.reported_asset_count += row.has_record ? 1 : 0;
      accumulator.available_hours += row.available_hours;
      accumulator.actual_usage_hours += row.actual_usage_hours;

      if (row.status) {
        accumulator.status_breakdown[row.status] += 1;
      }

      return accumulator;
    },
    {
      asset_count: 0,
      reported_asset_count: 0,
      available_hours: 0,
      actual_usage_hours: 0,
      status_breakdown: createStatusBreakdown(),
    },
  );

  const previousTotals = previousRecords.reduce(
    (accumulator, record) => {
      accumulator.available_hours += record.available_hours;
      accumulator.actual_usage_hours += record.actual_usage_hours;
      return accumulator;
    },
    { available_hours: 0, actual_usage_hours: 0 },
  );

  const departmentAccumulator = new Map<string, EquipmentDepartmentSummary>();

  for (const row of assetRows) {
    const current =
      departmentAccumulator.get(row.department_id)
      ?? {
        department_id: row.department_id,
        department_name: row.department_name,
        asset_count: 0,
        reported_asset_count: 0,
        available_hours: 0,
        actual_usage_hours: 0,
        utilization_pct: 0,
        status_breakdown: createStatusBreakdown(),
      };

    current.asset_count += 1;
    current.reported_asset_count += row.has_record ? 1 : 0;
    current.available_hours += row.available_hours;
    current.actual_usage_hours += row.actual_usage_hours;

    if (row.status) {
      current.status_breakdown[row.status] += 1;
    }

    current.utilization_pct = percentageFromRatio(
      current.actual_usage_hours,
      current.available_hours,
    );

    departmentAccumulator.set(row.department_id, current);
  }

  const trend = trailingMonths.map((monthItem) => {
    const monthlyRecords = trendRecords.filter((record) => record.report_month === monthItem.report_month);
    const availableHours = monthlyRecords.reduce(
      (sum, record) => sum + record.available_hours,
      0,
    );
    const actualUsageHours = monthlyRecords.reduce(
      (sum, record) => sum + record.actual_usage_hours,
      0,
    );

    return {
      month: monthItem.month,
      available_hours: roundToTwo(availableHours),
      actual_usage_hours: roundToTwo(actualUsageHours),
      utilization_pct: percentageFromRatio(actualUsageHours, availableHours),
    };
  });

  return {
    totals: {
      asset_count: totals.asset_count,
      reported_asset_count: totals.reported_asset_count,
      available_hours: roundToTwo(totals.available_hours),
      actual_usage_hours: roundToTwo(totals.actual_usage_hours),
      utilization_pct: percentageFromRatio(
        totals.actual_usage_hours,
        totals.available_hours,
      ),
      status_breakdown: totals.status_breakdown,
    },
    previous_totals: {
      available_hours: roundToTwo(previousTotals.available_hours),
      actual_usage_hours: roundToTwo(previousTotals.actual_usage_hours),
      utilization_pct: percentageFromRatio(
        previousTotals.actual_usage_hours,
        previousTotals.available_hours,
      ),
    },
    asset_rows: assetRows,
    department_summary: Array.from(departmentAccumulator.values()).sort(
      (left, right) => right.utilization_pct - left.utilization_pct,
    ),
    trend,
  };
}
