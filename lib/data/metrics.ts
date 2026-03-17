import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { MetricCategory, MetricPeriodType } from "@/lib/constants/metrics";
import {
  createMetricSchema,
  updateMetricSchema,
} from "@/lib/data/metrics-action-helpers";

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;

const sharedMetricSelectFields = [
  "department_id",
  "subdepartment_id",
  "revenue_total",
  "self_pay_count",
  "hmo_count",
  "guarantee_letter_count",
  "pharmacy_revenue_inpatient",
  "pharmacy_revenue_opd",
  "monthly_input_count",
  "census_total",
  "census_opd",
  "census_er",
  "census_walk_in",
  "census_inpatient",
  "equipment_utilization_pct",
  "medication_error_count",
  "notes",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  "departments!department_id(name, code, is_revenue, is_census, supports_turnaround_time)",
  "department_subdepartments!subdepartment_id(name, code)",
].join(", ");

const dailyMetricSelect = ["id", "metric_date", sharedMetricSelectFields].join(", ");
const monthlyMetricSelect = ["id", "report_month", "category", sharedMetricSelectFields].join(", ");

const metricInsertDefaults = {
  revenue_total: 0,
  self_pay_count: 0,
  hmo_count: 0,
  guarantee_letter_count: 0,
  pharmacy_revenue_inpatient: null,
  pharmacy_revenue_opd: null,
  monthly_input_count: 0,
  census_total: 0,
  census_opd: 0,
  census_er: 0,
  census_walk_in: null,
  census_inpatient: null,
  equipment_utilization_pct: 0,
  medication_error_count: null,
  notes: null,
} as const;

type MetricPayloadInput = CreateMetricInput | UpdateMetricInput;

type DailyMetricRow = Record<string, unknown> & {
  id: string;
  metric_date: string;
};

type MonthlyMetricRow = Record<string, unknown> & {
  id: string;
  report_month: string;
  category: MetricCategory;
};

function asDailyMetricRow(row: unknown): DailyMetricRow {
  return row as unknown as DailyMetricRow;
}

function asDailyMetricRows(rows: unknown): DailyMetricRow[] {
  return rows as unknown as DailyMetricRow[];
}

function asMonthlyMetricRow(row: unknown): MonthlyMetricRow {
  return row as unknown as MonthlyMetricRow;
}

function asMonthlyMetricRows(rows: unknown): MonthlyMetricRow[] {
  return rows as unknown as MonthlyMetricRow[];
}

function buildMetricCategoryFields(params: {
  category: MetricCategory;
  input: MetricPayloadInput;
  includeDefaults: boolean;
  supportsEquipment: boolean;
}) {
  const { category, input, includeDefaults, supportsEquipment } = params;

  if (category === "revenue") {
    const revenue = input.revenue;

    return {
      ...(includeDefaults ? metricInsertDefaults : {}),
      ...(revenue?.revenue_total !== undefined
        ? { revenue_total: revenue.revenue_total }
        : includeDefaults
          ? { revenue_total: 0 }
          : {}),
      ...(revenue?.self_pay_count !== undefined
        ? { self_pay_count: revenue.self_pay_count }
        : includeDefaults
          ? { self_pay_count: 0 }
          : {}),
      ...(revenue?.hmo_count !== undefined
        ? { hmo_count: revenue.hmo_count }
        : includeDefaults
          ? { hmo_count: 0 }
          : {}),
      ...(revenue?.guarantee_letter_count !== undefined
        ? { guarantee_letter_count: revenue.guarantee_letter_count }
        : includeDefaults
          ? { guarantee_letter_count: 0 }
          : {}),
      ...(revenue?.pharmacy_revenue_inpatient !== undefined
        ? { pharmacy_revenue_inpatient: revenue.pharmacy_revenue_inpatient }
        : includeDefaults
          ? { pharmacy_revenue_inpatient: null }
          : {}),
      ...(revenue?.pharmacy_revenue_opd !== undefined
        ? { pharmacy_revenue_opd: revenue.pharmacy_revenue_opd }
        : includeDefaults
          ? { pharmacy_revenue_opd: null }
          : {}),
    };
  }

  if (category === "census") {
    const census = input.census;

    return {
      ...(includeDefaults ? metricInsertDefaults : {}),
      ...(census?.census_total !== undefined
        ? { census_total: census.census_total }
        : includeDefaults
          ? { census_total: 0 }
          : {}),
      ...(census?.census_opd !== undefined
        ? { census_opd: census.census_opd }
        : includeDefaults
          ? { census_opd: 0 }
          : {}),
      ...(census?.census_er !== undefined
        ? { census_er: census.census_er }
        : includeDefaults
          ? { census_er: 0 }
          : {}),
      ...(census?.census_walk_in !== undefined
        ? { census_walk_in: census.census_walk_in }
        : includeDefaults
          ? { census_walk_in: null }
          : {}),
      ...(census?.census_inpatient !== undefined
        ? { census_inpatient: census.census_inpatient }
        : includeDefaults
          ? { census_inpatient: null }
          : {}),
    };
  }

  const operations = input.operations;

  return {
    ...(includeDefaults ? metricInsertDefaults : {}),
    ...(operations?.monthly_input_count !== undefined
      ? { monthly_input_count: operations.monthly_input_count }
      : includeDefaults
        ? { monthly_input_count: 0 }
        : {}),
    ...(supportsEquipment
      ? operations?.equipment_utilization_pct !== undefined
        ? { equipment_utilization_pct: operations.equipment_utilization_pct }
        : includeDefaults
          ? { equipment_utilization_pct: 0 }
          : {}
      : includeDefaults
        ? { equipment_utilization_pct: 0 }
        : {}),
    ...(operations?.medication_error_count !== undefined
      ? { medication_error_count: operations.medication_error_count }
      : includeDefaults
        ? { medication_error_count: null }
        : {}),
    ...(operations?.notes !== undefined
      ? { notes: operations.notes }
      : includeDefaults
        ? { notes: null }
        : {}),
  };
}

function normalizeBaseMetricFields(row: Record<string, unknown>) {
  return {
    department_id: row.department_id as string,
    subdepartment_id: (row.subdepartment_id as string | null) ?? null,
    revenue_total: Number(row.revenue_total ?? 0),
    self_pay_count: Number(row.self_pay_count ?? 0),
    hmo_count: Number(row.hmo_count ?? 0),
    guarantee_letter_count: Number(row.guarantee_letter_count ?? 0),
    pharmacy_revenue_inpatient: (row.pharmacy_revenue_inpatient as number | null) ?? null,
    pharmacy_revenue_opd: (row.pharmacy_revenue_opd as number | null) ?? null,
    monthly_input_count: Number(row.monthly_input_count ?? 0),
    census_total: Number(row.census_total ?? 0),
    census_opd: Number(row.census_opd ?? 0),
    census_er: Number(row.census_er ?? 0),
    census_walk_in: (row.census_walk_in as number | null) ?? null,
    census_inpatient: (row.census_inpatient as number | null) ?? null,
    equipment_utilization_pct: Number(row.equipment_utilization_pct ?? 0),
    medication_error_count: (row.medication_error_count as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    updated_by: row.updated_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    departments: (row.departments as Record<string, unknown> | null) ?? null,
    department_subdepartments:
      (row.department_subdepartments as Record<string, unknown> | null) ?? null,
  };
}

function normalizeDailyMetricRow(row: DailyMetricRow) {
  return {
    id: row.id,
    period_type: "daily" as const,
    category: null,
    metric_date: row.metric_date,
    report_month: null,
    ...normalizeBaseMetricFields(row),
  };
}

function normalizeMonthlyMetricRow(row: MonthlyMetricRow) {
  return {
    id: row.id,
    period_type: "monthly" as const,
    category: row.category,
    metric_date: null,
    report_month: row.report_month,
    ...normalizeBaseMetricFields(row),
  };
}

async function listDailyMetrics(
  supabase: SupabaseClient,
  params: {
    from?: number;
    to?: number;
    department_id?: string | null;
    subdepartment_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  },
) {
  let query = supabase
    .from("department_metrics_daily")
    .select(dailyMetricSelect, { count: "exact" })
    .order("metric_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (typeof params.from === "number" && typeof params.to === "number") {
    query = query.range(params.from, params.to);
  }

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.subdepartment_id) {
    query = query.eq("subdepartment_id", params.subdepartment_id);
  }

  if (params.start_date) {
    query = query.gte("metric_date", params.start_date);
  }

  if (params.end_date) {
    query = query.lte("metric_date", params.end_date);
  }

  const result = await query;

  if (result.error || !result.data) {
    return result;
  }

  return {
    data: asDailyMetricRows(result.data).map(normalizeDailyMetricRow),
    error: null,
    count: result.count,
  };
}

async function listMonthlyMetrics(
  supabase: SupabaseClient,
  params: {
    from?: number;
    to?: number;
    department_id?: string | null;
    subdepartment_id?: string | null;
    report_month?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    category?: MetricCategory | null;
  },
) {
  let query = supabase
    .from("department_metrics_monthly")
    .select(monthlyMetricSelect, { count: "exact" })
    .order("report_month", { ascending: false })
    .order("updated_at", { ascending: false });

  if (typeof params.from === "number" && typeof params.to === "number") {
    query = query.range(params.from, params.to);
  }

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.subdepartment_id) {
    query = query.eq("subdepartment_id", params.subdepartment_id);
  }

  if (params.report_month) {
    query = query.eq("report_month", params.report_month);
  } else {
    if (params.start_date) {
      query = query.gte("report_month", `${params.start_date.slice(0, 7)}-01`);
    }

    if (params.end_date) {
      query = query.lte("report_month", `${params.end_date.slice(0, 7)}-01`);
    }
  }

  if (params.category) {
    query = query.eq("category", params.category);
  }

  const result = await query;

  if (result.error || !result.data) {
    return result;
  }

  return {
    data: asMonthlyMetricRows(result.data).map(normalizeMonthlyMetricRow),
    error: null,
    count: result.count,
  };
}

export async function listMetrics(
  supabase: SupabaseClient,
  params: {
    period_type: MetricPeriodType;
    from?: number;
    to?: number;
    department_id?: string | null;
    subdepartment_id?: string | null;
    report_month?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    category?: MetricCategory | null;
  },
) {
  if (params.period_type === "monthly") {
    return await listMonthlyMetrics(supabase, params);
  }

  return await listDailyMetrics(supabase, params);
}

export async function createMetric(
  supabase: SupabaseClient,
  payload: CreateMetricInput,
  userId: string,
  supportsEquipment: boolean,
) {
  if (payload.period_type === "monthly") {
    const result = await supabase
      .from("department_metrics_monthly")
      .insert({
        report_month: payload.report_month,
        department_id: payload.department_id,
        subdepartment_id: payload.subdepartment_id ?? null,
        category: payload.category,
        ...buildMetricCategoryFields({
          category: payload.category,
          input: payload,
          includeDefaults: true,
          supportsEquipment,
        }),
        created_by: userId,
        updated_by: userId,
      })
      .select(monthlyMetricSelect)
      .single();

    if (result.error || !result.data) {
      return result;
    }

    return {
      data: normalizeMonthlyMetricRow(asMonthlyMetricRow(result.data)),
      error: null,
    };
  }

  const result = await supabase
    .from("department_metrics_daily")
    .insert({
      metric_date: payload.metric_date,
      department_id: payload.department_id,
      subdepartment_id: payload.subdepartment_id ?? null,
      ...buildMetricCategoryFields({
        category: payload.category,
        input: payload,
        includeDefaults: true,
        supportsEquipment,
      }),
      created_by: userId,
      updated_by: userId,
    })
    .select(dailyMetricSelect)
    .single();

  if (result.error || !result.data) {
    return result;
  }

  return {
    data: normalizeDailyMetricRow(asDailyMetricRow(result.data)),
    error: null,
  };
}

export async function getMetricById(supabase: SupabaseClient, id: string) {
  const dailyResult = await supabase
    .from("department_metrics_daily")
    .select(dailyMetricSelect)
    .eq("id", id)
    .single();

  if (!dailyResult.error && dailyResult.data) {
    return {
      data: normalizeDailyMetricRow(asDailyMetricRow(dailyResult.data)),
      error: null,
    };
  }

  if (dailyResult.error && dailyResult.error.code !== "PGRST116") {
    return dailyResult;
  }

  const monthlyResult = await supabase
    .from("department_metrics_monthly")
    .select(monthlyMetricSelect)
    .eq("id", id)
    .single();

  if (monthlyResult.error || !monthlyResult.data) {
    return monthlyResult;
  }

  return {
    data: normalizeMonthlyMetricRow(asMonthlyMetricRow(monthlyResult.data)),
    error: null,
  };
}

export async function getMetricByScope(
  supabase: SupabaseClient,
  params:
    | {
        period_type: "daily";
        metric_date: string;
        department_id: string;
        subdepartment_id?: string | null;
      }
    | {
        period_type: "monthly";
        report_month: string;
        department_id: string;
        subdepartment_id?: string | null;
        category: MetricCategory;
      },
) {
  if (params.period_type === "monthly") {
    let query = supabase
      .from("department_metrics_monthly")
      .select(monthlyMetricSelect)
      .eq("report_month", params.report_month)
      .eq("department_id", params.department_id)
      .eq("category", params.category);

    if (params.subdepartment_id) {
      query = query.eq("subdepartment_id", params.subdepartment_id);
    } else {
      query = query.is("subdepartment_id", null);
    }

    const result = await query.maybeSingle();

    if (result.error || !result.data) {
      return result;
    }

    return {
      data: normalizeMonthlyMetricRow(asMonthlyMetricRow(result.data)),
      error: null,
    };
  }

  let query = supabase
    .from("department_metrics_daily")
    .select(dailyMetricSelect)
    .eq("metric_date", params.metric_date)
    .eq("department_id", params.department_id);

  if (params.subdepartment_id) {
    query = query.eq("subdepartment_id", params.subdepartment_id);
  } else {
    query = query.is("subdepartment_id", null);
  }

  const result = await query.maybeSingle();

  if (result.error || !result.data) {
    return result;
  }

  return {
    data: normalizeDailyMetricRow(asDailyMetricRow(result.data)),
    error: null,
  };
}

export async function updateMetricById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateMetricInput,
  userId: string,
  supportsEquipment: boolean,
  periodType: MetricPeriodType,
) {
  if (periodType === "monthly") {
    const result = await supabase
      .from("department_metrics_monthly")
      .update({
        ...(payload.report_month !== undefined ? { report_month: payload.report_month } : {}),
        ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
        ...(payload.subdepartment_id !== undefined
          ? { subdepartment_id: payload.subdepartment_id }
          : {}),
        ...buildMetricCategoryFields({
          category: payload.category,
          input: payload,
          includeDefaults: false,
          supportsEquipment,
        }),
        updated_by: userId,
      })
      .eq("id", id)
      .select(monthlyMetricSelect)
      .single();

    if (result.error || !result.data) {
      return result;
    }

    return {
      data: normalizeMonthlyMetricRow(asMonthlyMetricRow(result.data)),
      error: null,
    };
  }

  const result = await supabase
    .from("department_metrics_daily")
    .update({
      ...(payload.metric_date !== undefined ? { metric_date: payload.metric_date } : {}),
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.subdepartment_id !== undefined
        ? { subdepartment_id: payload.subdepartment_id }
        : {}),
      ...buildMetricCategoryFields({
        category: payload.category,
        input: payload,
        includeDefaults: false,
        supportsEquipment,
      }),
      updated_by: userId,
    })
    .eq("id", id)
    .select(dailyMetricSelect)
    .single();

  if (result.error || !result.data) {
    return result;
  }

  return {
    data: normalizeDailyMetricRow(asDailyMetricRow(result.data)),
    error: null,
  };
}

export async function deleteMetricById(
  supabase: SupabaseClient,
  id: string,
  periodType: MetricPeriodType,
) {
  if (periodType === "monthly") {
    return await supabase
      .from("department_metrics_monthly")
      .delete()
      .eq("id", id)
      .select("id")
      .single();
  }

  return await supabase
    .from("department_metrics_daily")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}
