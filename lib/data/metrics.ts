import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import {
  createMetricSchema,
  updateMetricSchema,
} from "@/lib/data/metrics-action-helpers";

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;

const metricSelect = [
  "id",
  "metric_date",
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

function buildMetricCategoryFields(params: {
  category: CreateMetricInput["category"] | UpdateMetricInput["category"];
  input: CreateMetricInput | UpdateMetricInput;
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

export async function listMetrics(
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
    .select(metricSelect, { count: "exact" })
    .order("metric_date", { ascending: false });

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

  return await query;
}

export async function createMetric(
  supabase: SupabaseClient,
  payload: CreateMetricInput,
  userId: string,
  supportsEquipment: boolean,
) {
  return await supabase
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
    .select(metricSelect)
    .single();
}

export async function getMetricById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("department_metrics_daily")
    .select(metricSelect)
    .eq("id", id)
    .single();
}

export async function getMetricByScope(
  supabase: SupabaseClient,
  params: {
    metric_date: string;
    department_id: string;
    subdepartment_id?: string | null;
  },
) {
  let query = supabase
    .from("department_metrics_daily")
    .select(metricSelect)
    .eq("metric_date", params.metric_date)
    .eq("department_id", params.department_id);

  if (params.subdepartment_id) {
    query = query.eq("subdepartment_id", params.subdepartment_id);
  } else {
    query = query.is("subdepartment_id", null);
  }

  return await query.maybeSingle();
}

export async function updateMetricById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateMetricInput,
  userId: string,
  supportsEquipment: boolean,
) {
  return await supabase
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
    .select(metricSelect)
    .single();
}

export async function deleteMetricById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("department_metrics_daily")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}
