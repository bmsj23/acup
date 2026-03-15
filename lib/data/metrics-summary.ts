import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";
import type {
  DashboardDailyTrendPoint,
  MonitoringDepartment,
} from "@/types/monitoring";

type MetricSummaryRow = {
  metric_date: string;
  department_id: string;
  subdepartment_id: string | null;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
  medication_error_count: number | null;
};

type MetricsSummaryParams = {
  month: string;
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
  role: UserRole;
  memberDepartmentIds: string[];
  availableDepartments: MonitoringDepartment[];
  departmentId?: string | null;
};

type MetricsSummaryPayload = {
  filters: {
    month: string;
    department_id: string | null;
    available_departments: MonitoringDepartment[];
  };
  role_scope: {
    role: UserRole;
    member_department_ids: string[];
  };
  totals: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    equipment_utilization_pct: number;
    medication_error_count: number;
  };
  best_performing_department: {
    department_id: string;
    department_name: string;
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    equipment_utilization_pct: number;
    medication_error_count: number;
  } | null;
  daily_trend: DashboardDailyTrendPoint[];
  department_performance: {
    department_id: string;
    department_name: string;
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    equipment_utilization_pct: number;
    medication_error_count: number;
  }[];
  previous_totals: {
    revenue_total: number;
    monthly_input_count: number;
    census_total: number;
    equipment_utilization_pct: number;
    medication_error_count: number;
  };
};

const departmentHeadFallbackId = "00000000-0000-0000-0000-000000000000";

export async function buildMetricsSummary(
  supabase: SupabaseClient,
  params: MetricsSummaryParams,
): Promise<MetricsSummaryPayload> {
  let metricsQuery = supabase
    .from("department_metrics_daily")
    .select(
      [
        "metric_date",
        "department_id",
        "subdepartment_id",
        "revenue_total",
        "monthly_input_count",
        "census_total",
        "census_opd",
        "census_er",
        "equipment_utilization_pct",
        "medication_error_count",
      ].join(", "),
    )
    .gte("metric_date", params.start)
    .lte("metric_date", params.end)
    .is("subdepartment_id", null)
    .order("metric_date", { ascending: true });

  let previousMetricsQuery = supabase
    .from("department_metrics_daily")
    .select(
      [
        "revenue_total",
        "monthly_input_count",
        "census_total",
        "equipment_utilization_pct",
        "medication_error_count",
      ].join(", "),
    )
    .gte("metric_date", params.prevStart)
    .lte("metric_date", params.prevEnd)
    .is("subdepartment_id", null);

  if (params.departmentId) {
    metricsQuery = metricsQuery.eq("department_id", params.departmentId);
    previousMetricsQuery = previousMetricsQuery.eq("department_id", params.departmentId);
  }

  if (params.role === "department_head") {
    const scopedDepartmentIds =
      params.memberDepartmentIds.length > 0
        ? params.memberDepartmentIds
        : [departmentHeadFallbackId];

    metricsQuery = metricsQuery.in("department_id", scopedDepartmentIds);
    previousMetricsQuery = previousMetricsQuery.in("department_id", scopedDepartmentIds);
  }

  const [{ data: metricsRows, error: metricsError }, { data: previousRows, error: previousError }] =
    await Promise.all([metricsQuery, previousMetricsQuery]);

  const error = metricsError ?? previousError;
  if (error) {
    throw error;
  }

  const rows = (metricsRows ?? []) as unknown as MetricSummaryRow[];
  const previousMetricRows = (previousRows ?? []) as unknown as MetricSummaryRow[];

  let previousRevenueTotal = 0;
  let previousMonthlyInputTotal = 0;
  let previousCensusTotal = 0;
  let previousEquipmentUtilizationSum = 0;
  let previousMedicationErrorTotal = 0;

  for (const row of previousMetricRows) {
    previousRevenueTotal += Number(row.revenue_total);
    previousMonthlyInputTotal += row.monthly_input_count;
    previousCensusTotal += row.census_total;
    previousEquipmentUtilizationSum += Number(row.equipment_utilization_pct);
    previousMedicationErrorTotal += Number(row.medication_error_count ?? 0);
  }

  let revenueTotal = 0;
  let monthlyInputTotal = 0;
  let censusTotal = 0;
  let censusOpdTotal = 0;
  let censusErTotal = 0;
  let equipmentUtilizationSum = 0;
  let medicationErrorTotal = 0;

  const dailyMap = new Map<
    string,
    {
      revenue_total: number;
      monthly_input_count: number;
      census_total: number;
      census_opd: number;
      census_er: number;
      equipment_utilization_sum: number;
      equipment_utilization_count: number;
      medication_error_count: number;
    }
  >();

  const departmentMapAgg = new Map<
    string,
    {
      department_id: string;
      department_name: string;
      revenue_total: number;
      monthly_input_count: number;
      census_total: number;
      census_opd: number;
      census_er: number;
      equipment_utilization_sum: number;
      equipment_utilization_count: number;
      medication_error_count: number;
    }
  >();

  const departmentMetaMap = new Map(
    params.availableDepartments.map((department) => [department.id, department]),
  );

  for (const row of rows) {
    const medicationErrors = Number(row.medication_error_count ?? 0);

    revenueTotal += Number(row.revenue_total);
    monthlyInputTotal += row.monthly_input_count;
    censusTotal += row.census_total;
    censusOpdTotal += row.census_opd;
    censusErTotal += row.census_er;
    equipmentUtilizationSum += Number(row.equipment_utilization_pct);
    medicationErrorTotal += medicationErrors;

    const daily = dailyMap.get(row.metric_date) ?? {
      revenue_total: 0,
      monthly_input_count: 0,
      census_total: 0,
      census_opd: 0,
      census_er: 0,
      equipment_utilization_sum: 0,
      equipment_utilization_count: 0,
      medication_error_count: 0,
    };

    daily.revenue_total += Number(row.revenue_total);
    daily.monthly_input_count += row.monthly_input_count;
    daily.census_total += row.census_total;
    daily.census_opd += row.census_opd;
    daily.census_er += row.census_er;
    daily.equipment_utilization_sum += Number(row.equipment_utilization_pct);
    daily.equipment_utilization_count += 1;
    daily.medication_error_count += medicationErrors;
    dailyMap.set(row.metric_date, daily);

    const departmentName =
      departmentMetaMap.get(row.department_id)?.name ?? "Unknown Department";
    const department = departmentMapAgg.get(row.department_id) ?? {
      department_id: row.department_id,
      department_name: departmentName,
      revenue_total: 0,
      monthly_input_count: 0,
      census_total: 0,
      census_opd: 0,
      census_er: 0,
      equipment_utilization_sum: 0,
      equipment_utilization_count: 0,
      medication_error_count: 0,
    };

    department.revenue_total += Number(row.revenue_total);
    department.monthly_input_count += row.monthly_input_count;
    department.census_total += row.census_total;
    department.census_opd += row.census_opd;
    department.census_er += row.census_er;
    department.equipment_utilization_sum += Number(row.equipment_utilization_pct);
    department.equipment_utilization_count += 1;
    department.medication_error_count += medicationErrors;
    departmentMapAgg.set(row.department_id, department);
  }

  const averageEquipmentUtilization =
    rows.length > 0 ? equipmentUtilizationSum / rows.length : 0;
  const previousAverageEquipmentUtilization =
    previousMetricRows.length > 0
      ? previousEquipmentUtilizationSum / previousMetricRows.length
      : 0;

  const dailyTrend = Array.from(dailyMap.entries()).map(([date, value]) => ({
    date,
    revenue_total: value.revenue_total,
    monthly_input_count: value.monthly_input_count,
    census_total: value.census_total,
    census_opd: value.census_opd,
    census_er: value.census_er,
    equipment_utilization_pct:
      value.equipment_utilization_count > 0
        ? value.equipment_utilization_sum / value.equipment_utilization_count
        : 0,
    medication_error_count: value.medication_error_count,
  }));

  const departmentPerformance = Array.from(departmentMapAgg.values())
    .map((department) => ({
      department_id: department.department_id,
      department_name: department.department_name,
      revenue_total: department.revenue_total,
      monthly_input_count: department.monthly_input_count,
      census_total: department.census_total,
      census_opd: department.census_opd,
      census_er: department.census_er,
      equipment_utilization_pct:
        department.equipment_utilization_count > 0
          ? department.equipment_utilization_sum / department.equipment_utilization_count
          : 0,
      medication_error_count: department.medication_error_count,
    }))
    .sort((left, right) => right.revenue_total - left.revenue_total);

  return {
    filters: {
      month: params.month,
      department_id: params.departmentId ?? null,
      available_departments: params.availableDepartments,
    },
    role_scope: {
      role: params.role,
      member_department_ids: params.memberDepartmentIds,
    },
    totals: {
      revenue_total: revenueTotal,
      monthly_input_count: monthlyInputTotal,
      census_total: censusTotal,
      census_opd: censusOpdTotal,
      census_er: censusErTotal,
      equipment_utilization_pct: averageEquipmentUtilization,
      medication_error_count: medicationErrorTotal,
    },
    best_performing_department: departmentPerformance[0] ?? null,
    daily_trend: dailyTrend,
    department_performance: departmentPerformance,
    previous_totals: {
      revenue_total: previousRevenueTotal,
      monthly_input_count: previousMonthlyInputTotal,
      census_total: previousCensusTotal,
      equipment_utilization_pct: previousAverageEquipmentUtilization,
      medication_error_count: previousMedicationErrorTotal,
    },
  };
}
