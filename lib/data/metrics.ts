import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import {
  createMetricSchema,
  updateMetricSchema,
} from "@/lib/data/metrics-action-helpers";

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;

const metricSelect =
  "id, metric_date, department_id, subdepartment_id, revenue_total, pharmacy_revenue_inpatient, pharmacy_revenue_opd, monthly_input_count, census_total, census_opd, census_er, census_walk_in, census_inpatient, equipment_utilization_pct, notes, created_by, updated_by, created_at, updated_at";

export async function listMetrics(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    subdepartment_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  },
) {
  let query = supabase
    .from("department_metrics_daily")
    .select(metricSelect, { count: "exact" })
    .order("metric_date", { ascending: false })
    .range(params.from, params.to);

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
) {
  return await supabase
    .from("department_metrics_daily")
    .insert({
      metric_date: payload.metric_date,
      department_id: payload.department_id,
      subdepartment_id: payload.subdepartment_id ?? null,
      revenue_total: payload.revenue_total,
      pharmacy_revenue_inpatient: payload.pharmacy_revenue_inpatient ?? null,
      pharmacy_revenue_opd: payload.pharmacy_revenue_opd ?? null,
      monthly_input_count: payload.monthly_input_count,
      census_total: payload.census_total,
      census_opd: payload.census_opd,
      census_er: payload.census_er,
      census_walk_in: payload.census_walk_in ?? null,
      census_inpatient: payload.census_inpatient ?? null,
      equipment_utilization_pct: payload.equipment_utilization_pct,
      notes: payload.notes ?? null,
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

export async function updateMetricById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateMetricInput,
  userId: string,
) {
  return await supabase
    .from("department_metrics_daily")
    .update({
      ...(payload.metric_date !== undefined ? { metric_date: payload.metric_date } : {}),
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.subdepartment_id !== undefined
        ? { subdepartment_id: payload.subdepartment_id }
        : {}),
      ...(payload.revenue_total !== undefined ? { revenue_total: payload.revenue_total } : {}),
      ...(payload.pharmacy_revenue_inpatient !== undefined
        ? { pharmacy_revenue_inpatient: payload.pharmacy_revenue_inpatient }
        : {}),
      ...(payload.pharmacy_revenue_opd !== undefined
        ? { pharmacy_revenue_opd: payload.pharmacy_revenue_opd }
        : {}),
      ...(payload.monthly_input_count !== undefined
        ? { monthly_input_count: payload.monthly_input_count }
        : {}),
      ...(payload.census_total !== undefined ? { census_total: payload.census_total } : {}),
      ...(payload.census_opd !== undefined ? { census_opd: payload.census_opd } : {}),
      ...(payload.census_er !== undefined ? { census_er: payload.census_er } : {}),
      ...(payload.census_walk_in !== undefined
        ? { census_walk_in: payload.census_walk_in }
        : {}),
      ...(payload.census_inpatient !== undefined
        ? { census_inpatient: payload.census_inpatient }
        : {}),
      ...(payload.equipment_utilization_pct !== undefined
        ? { equipment_utilization_pct: payload.equipment_utilization_pct }
        : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
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
