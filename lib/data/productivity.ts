import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildTrailingMonths, roundToTwo } from "@/lib/data/monitoring";
import type {
  MonitoringDepartment,
  ProductivityRecordItem,
  ProductivitySummaryResponse,
} from "@/types/monitoring";

const reportMonthRegex = /^\d{4}-\d{2}-01$/;

export const createProductivityRecordSchema = z.object({
  report_month: z.string().regex(reportMonthRegex),
  department_id: z.string().uuid(),
  procedures_performed: z.number().int().min(0),
  staff_on_duty_count: z.number().int().positive(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const updateProductivityRecordSchema = createProductivityRecordSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateProductivityRecordInput = z.infer<typeof createProductivityRecordSchema>;
export type UpdateProductivityRecordInput = z.infer<typeof updateProductivityRecordSchema>;

const productivitySelect = [
  "id",
  "report_month",
  "department_id",
  "procedures_performed",
  "staff_on_duty_count",
  "notes",
  "recorded_by",
  "updated_by",
  "created_at",
  "updated_at",
  "departments!department_id(name, code)",
].join(", ");

function calculateProductivityRatio(proceduresPerformed: number, staffOnDutyCount: number) {
  if (staffOnDutyCount <= 0) {
    return 0;
  }

  return roundToTwo(proceduresPerformed / staffOnDutyCount);
}

function normalizeProductivityRow(row: Record<string, unknown>): ProductivityRecordItem {
  const departments = row.departments as { name?: string; code?: string } | null;

  return {
    id: row.id as string,
    report_month: row.report_month as string,
    department_id: row.department_id as string,
    procedures_performed: Number(row.procedures_performed ?? 0),
    staff_on_duty_count: Number(row.staff_on_duty_count ?? 0),
    notes: (row.notes as string | null) ?? null,
    recorded_by: row.recorded_by as string,
    updated_by: row.updated_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    departments: departments
      ? {
          name: departments.name ?? "Unknown Department",
          code: departments.code ?? "",
        }
      : null,
  };
}

export async function listProductivityRecords(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    report_month?: string | null;
  },
) {
  let query = supabase
    .from("department_productivity_monthly")
    .select(productivitySelect, { count: "exact" })
    .order("report_month", { ascending: false })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.report_month) {
    query = query.eq("report_month", params.report_month);
  }

  return await query;
}

export async function createProductivityRecord(
  supabase: SupabaseClient,
  payload: CreateProductivityRecordInput,
  userId: string,
) {
  return await supabase
    .from("department_productivity_monthly")
    .insert({
      report_month: payload.report_month,
      department_id: payload.department_id,
      procedures_performed: payload.procedures_performed,
      staff_on_duty_count: payload.staff_on_duty_count,
      notes: payload.notes ?? null,
      recorded_by: userId,
      updated_by: userId,
    })
    .select(productivitySelect)
    .single();
}

export async function getProductivityRecordById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("department_productivity_monthly")
    .select(productivitySelect)
    .eq("id", id)
    .single();
}

export async function updateProductivityRecordById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateProductivityRecordInput,
  userId: string,
) {
  return await supabase
    .from("department_productivity_monthly")
    .update({
      ...(payload.report_month !== undefined ? { report_month: payload.report_month } : {}),
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.procedures_performed !== undefined
        ? { procedures_performed: payload.procedures_performed }
        : {}),
      ...(payload.staff_on_duty_count !== undefined
        ? { staff_on_duty_count: payload.staff_on_duty_count }
        : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      updated_by: userId,
    })
    .eq("id", id)
    .select(productivitySelect)
    .single();
}

export async function deleteProductivityRecordById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("department_productivity_monthly")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function buildProductivitySummary(
  supabase: SupabaseClient,
  params: {
    month: string;
    reportMonth: string;
    prevReportMonth: string;
    departmentId?: string | null;
    availableDepartments: MonitoringDepartment[];
  },
): Promise<Omit<ProductivitySummaryResponse, "filters" | "role_scope">> {
  const trailingMonths = buildTrailingMonths(params.month, 6);
  const trailingReportMonths = trailingMonths.map((item) => item.report_month);

  let currentQuery = supabase
    .from("department_productivity_monthly")
    .select(productivitySelect)
    .eq("report_month", params.reportMonth);

  let previousQuery = supabase
    .from("department_productivity_monthly")
    .select(productivitySelect)
    .eq("report_month", params.prevReportMonth);

  let trendQuery = supabase
    .from("department_productivity_monthly")
    .select(productivitySelect)
    .in("report_month", trailingReportMonths);

  if (params.departmentId) {
    currentQuery = currentQuery.eq("department_id", params.departmentId);
    previousQuery = previousQuery.eq("department_id", params.departmentId);
    trendQuery = trendQuery.eq("department_id", params.departmentId);
  }

  const [currentResult, previousResult, trendResult] = await Promise.all([
    currentQuery,
    previousQuery,
    trendQuery,
  ]);

  const error = currentResult.error ?? previousResult.error ?? trendResult.error;
  if (error) {
    throw error;
  }

  const currentRows = ((currentResult.data ?? []) as unknown as Record<string, unknown>[]).map(
    normalizeProductivityRow,
  );
  const previousRows = ((previousResult.data ?? []) as unknown as Record<string, unknown>[]).map(
    normalizeProductivityRow,
  );
  const trendRows = ((trendResult.data ?? []) as unknown as Record<string, unknown>[]).map(
    normalizeProductivityRow,
  );

  const totals = currentRows.reduce(
    (accumulator, row) => {
      accumulator.procedures_performed += row.procedures_performed;
      accumulator.staff_on_duty_count += row.staff_on_duty_count;
      return accumulator;
    },
    { procedures_performed: 0, staff_on_duty_count: 0 },
  );

  const previousTotals = previousRows.reduce(
    (accumulator, row) => {
      accumulator.procedures_performed += row.procedures_performed;
      accumulator.staff_on_duty_count += row.staff_on_duty_count;
      return accumulator;
    },
    { procedures_performed: 0, staff_on_duty_count: 0 },
  );

  const departmentRanking = currentRows
    .map((row) => ({
      department_id: row.department_id,
      department_name:
        row.departments?.name
        ?? params.availableDepartments.find((department) => department.id === row.department_id)?.name
        ?? "Unknown Department",
      procedures_performed: row.procedures_performed,
      staff_on_duty_count: row.staff_on_duty_count,
      productivity_ratio: calculateProductivityRatio(
        row.procedures_performed,
        row.staff_on_duty_count,
      ),
    }))
    .sort((left, right) => right.productivity_ratio - left.productivity_ratio);

  const trend = trailingMonths.map((monthItem) => {
    const monthlyRows = trendRows.filter((row) => row.report_month === monthItem.report_month);
    const proceduresPerformed = monthlyRows.reduce(
      (sum, row) => sum + row.procedures_performed,
      0,
    );
    const staffOnDutyCount = monthlyRows.reduce(
      (sum, row) => sum + row.staff_on_duty_count,
      0,
    );

    return {
      month: monthItem.month,
      procedures_performed: proceduresPerformed,
      staff_on_duty_count: staffOnDutyCount,
      productivity_ratio: calculateProductivityRatio(
        proceduresPerformed,
        staffOnDutyCount,
      ),
    };
  });

  return {
    totals: {
      procedures_performed: totals.procedures_performed,
      staff_on_duty_count: totals.staff_on_duty_count,
      productivity_ratio: calculateProductivityRatio(
        totals.procedures_performed,
        totals.staff_on_duty_count,
      ),
    },
    previous_totals: {
      procedures_performed: previousTotals.procedures_performed,
      staff_on_duty_count: previousTotals.staff_on_duty_count,
      productivity_ratio: calculateProductivityRatio(
        previousTotals.procedures_performed,
        previousTotals.staff_on_duty_count,
      ),
    },
    department_ranking: departmentRanking,
    trend,
  };
}
