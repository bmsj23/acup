import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEquipmentSummary } from "@/lib/data/equipment";
import { buildMetricsSummary } from "@/lib/data/metrics-summary";
import type { UserRole } from "@/types/database";
import type {
  DashboardNonRevenueResponse,
  DashboardOverviewResponse,
  MonitoringDepartment,
} from "@/types/monitoring";

type DashboardScopeParams = {
  month: string;
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  reportMonth: string;
  prevReportMonth: string;
  role: UserRole;
  memberDepartmentIds: string[];
  availableDepartments: MonitoringDepartment[];
  departmentId?: string | null;
};

const departmentHeadFallbackId = "00000000-0000-0000-0000-000000000000";

export async function buildDashboardOverview(
  supabase: SupabaseClient,
  params: DashboardScopeParams,
): Promise<DashboardOverviewResponse> {
  const [metricsSummary, equipmentSummary, openIncidentCountResult, unresolvedPreviewResult] =
    await Promise.all([
      buildMetricsSummary(supabase, {
        month: params.month,
        start: params.start,
        end: params.end,
        prevStart: params.prevStart,
        prevEnd: params.prevEnd,
        role: params.role,
        memberDepartmentIds: params.memberDepartmentIds,
        availableDepartments: params.availableDepartments,
        departmentId: params.departmentId,
      }),
      buildEquipmentSummary(supabase, {
        month: params.month,
        reportMonth: params.reportMonth,
        prevReportMonth: params.prevReportMonth,
        departmentId: params.departmentId,
      }),
      (() => {
        let query = supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("is_resolved", false);

        if (params.departmentId) {
          query = query.eq("department_id", params.departmentId);
        }

        return query;
      })(),
      (() => {
        let query = supabase
          .from("incidents")
          .select("id, sbar_situation, date_of_incident, departments!department_id(name, code)")
          .eq("is_resolved", false)
          .order("date_of_incident", { ascending: false })
          .limit(5);

        if (params.departmentId) {
          query = query.eq("department_id", params.departmentId);
        }

        return query;
      })(),
    ]);

  const incidentError = openIncidentCountResult.error ?? unresolvedPreviewResult.error;
  if (incidentError) {
    throw incidentError;
  }

  return {
    ...metricsSummary,
    totals: {
      ...metricsSummary.totals,
      equipment_utilization_pct: equipmentSummary.totals.utilization_pct,
      open_incidents_count: openIncidentCountResult.count ?? 0,
    },
    previous_totals: {
      ...metricsSummary.previous_totals,
      equipment_utilization_pct: equipmentSummary.previous_totals.utilization_pct,
    },
    unresolved_preview: (unresolvedPreviewResult.data ?? []).map((item) => {
      const departments = Array.isArray(item.departments)
        ? item.departments[0]
        : item.departments;

      return {
        id: item.id as string,
        sbar_situation: item.sbar_situation as string,
        date_of_incident: item.date_of_incident as string,
        departments: departments
          ? {
              name: (departments as { name?: string }).name ?? "Unknown Department",
              code: (departments as { code?: string }).code,
            }
          : null,
      };
    }),
    legacy_metrics: {
      equipment_utilization_pct: metricsSummary.totals.equipment_utilization_pct,
    },
  };
}

export async function buildDashboardNonRevenueSummary(
  supabase: SupabaseClient,
  params: Omit<DashboardScopeParams, "prevStart" | "prevEnd" | "reportMonth" | "prevReportMonth">,
): Promise<DashboardNonRevenueResponse> {
  const metricsSummary = await buildMetricsSummary(supabase, {
    month: params.month,
    start: params.start,
    end: params.end,
    prevStart: params.start,
    prevEnd: params.end,
    role: params.role,
    memberDepartmentIds: params.memberDepartmentIds,
    availableDepartments: params.availableDepartments,
    departmentId: params.departmentId,
  });

  let transactionQuery = supabase
    .from("transaction_category_entries")
    .select("category, count, metric_date")
    .gte("metric_date", params.start)
    .lte("metric_date", params.end)
    .order("metric_date", { ascending: true });

  if (params.departmentId) {
    transactionQuery = transactionQuery.eq("department_id", params.departmentId);
  } else if (params.role === "department_head") {
    transactionQuery = transactionQuery.in(
      "department_id",
      params.memberDepartmentIds.length > 0
        ? params.memberDepartmentIds
        : [departmentHeadFallbackId],
    );
  }

  const { data: transactionRows, error } = await transactionQuery;
  if (error) {
    throw error;
  }

  const categoryTotals = new Map<string, number>();
  const dailyTotals = new Map<string, number>();

  for (const row of transactionRows ?? []) {
    const category = row.category as string;
    const count = Number(row.count ?? 0);
    const metricDate = row.metric_date as string;

    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + count);
    dailyTotals.set(metricDate, (dailyTotals.get(metricDate) ?? 0) + count);
  }

  const categorySummary = Array.from(categoryTotals.entries())
    .map(([category, totalCount]) => ({
      category,
      total_count: totalCount,
    }))
    .sort((left, right) => right.total_count - left.total_count);

  return {
    filters: {
      month: params.month,
      department_id: params.departmentId ?? null,
    },
    totals: {
      transaction_total: categorySummary.reduce(
        (sum, item) => sum + item.total_count,
        0,
      ),
      medication_error_count: metricsSummary.totals.medication_error_count,
      category_count: categorySummary.length,
    },
    category_summary: categorySummary,
    daily_totals: Array.from(dailyTotals.entries()).map(([date, total]) => ({
      date,
      total,
    })),
  };
}
