import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetricCategory } from "@/lib/constants/metrics";
import type { UserRole } from "@/types/database";
import type {
  DashboardDailyTrendPoint,
  DashboardMetricSource,
  MonitoringDepartment,
} from "@/types/monitoring";

type DailyMetricsSummaryRow = {
  metric_date: string;
  department_id: string;
  revenue_total: number;
  self_pay_count: number;
  hmo_count: number;
  guarantee_letter_count: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in: number | null;
  census_inpatient: number | null;
  equipment_utilization_pct: number;
  medication_error_count: number | null;
};

type MonthlyMetricsSummaryRow = {
  report_month: string;
  department_id: string;
  category: MetricCategory;
  revenue_total: number;
  self_pay_count: number;
  hmo_count: number;
  guarantee_letter_count: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in: number | null;
  census_inpatient: number | null;
  equipment_utilization_pct: number;
  medication_error_count: number | null;
};

type MetricsSummaryParams = {
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
    self_pay_count: number;
    hmo_count: number;
    guarantee_letter_count: number;
    monthly_input_count: number;
    census_total: number;
    census_opd: number;
    census_er: number;
    census_walk_in: number;
    census_inpatient: number;
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
  category_sources: Record<MetricCategory, DashboardMetricSource>;
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

type AggregatedWindow = {
  totals: MetricsSummaryPayload["totals"];
  category_sources: Record<MetricCategory, DashboardMetricSource>;
  daily_trend: DashboardDailyTrendPoint[];
  department_performance: MetricsSummaryPayload["department_performance"];
};

const departmentHeadFallbackId = "00000000-0000-0000-0000-000000000000";

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function resolveCategorySource(sourceKinds: Set<"daily" | "monthly">): DashboardMetricSource {
  if (sourceKinds.has("daily") && sourceKinds.has("monthly")) {
    return "mixed";
  }

  if (sourceKinds.has("monthly")) {
    return "monthly";
  }

  return "daily";
}

function aggregateMetricsWindow(params: {
  dailyRows: DailyMetricsSummaryRow[];
  monthlyRows: MonthlyMetricsSummaryRow[];
  availableDepartments: MonitoringDepartment[];
  departmentId?: string | null;
}) {
  const departmentMetaMap = new Map(
    params.availableDepartments.map((department) => [department.id, department]),
  );
  const dailyRowsByDepartment = new Map<string, DailyMetricsSummaryRow[]>();
  const monthlyRowsByDepartmentAndCategory = new Map<string, MonthlyMetricsSummaryRow>();
  const categorySourceKinds = {
    revenue: new Set<"daily" | "monthly">(),
    census: new Set<"daily" | "monthly">(),
    operations: new Set<"daily" | "monthly">(),
  };

  for (const row of params.dailyRows) {
    const existing = dailyRowsByDepartment.get(row.department_id) ?? [];
    existing.push(row);
    dailyRowsByDepartment.set(row.department_id, existing);
  }

  for (const row of params.monthlyRows) {
    monthlyRowsByDepartmentAndCategory.set(`${row.department_id}:${row.category}`, row);
  }

  const departmentIds = new Set<string>([
    ...dailyRowsByDepartment.keys(),
    ...params.monthlyRows.map((row) => row.department_id),
  ]);

  if (params.departmentId) {
    departmentIds.add(params.departmentId);
  }

  const totals: MetricsSummaryPayload["totals"] = {
    revenue_total: 0,
    self_pay_count: 0,
    hmo_count: 0,
    guarantee_letter_count: 0,
    monthly_input_count: 0,
    census_total: 0,
    census_opd: 0,
    census_er: 0,
    census_walk_in: 0,
    census_inpatient: 0,
    equipment_utilization_pct: 0,
    medication_error_count: 0,
  };

  let equipmentUtilizationSum = 0;
  let equipmentUtilizationCount = 0;

  const dailyTrendMap = new Map<
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

  const departmentPerformance: MetricsSummaryPayload["department_performance"] = [];

  for (const departmentId of departmentIds) {
    const departmentRows = dailyRowsByDepartment.get(departmentId) ?? [];
    const revenueMonthly = monthlyRowsByDepartmentAndCategory.get(`${departmentId}:revenue`);
    const censusMonthly = monthlyRowsByDepartmentAndCategory.get(`${departmentId}:census`);
    const operationsMonthly = monthlyRowsByDepartmentAndCategory.get(`${departmentId}:operations`);
    const departmentName =
      departmentMetaMap.get(departmentId)?.name ?? "Unknown Department";

    let departmentRevenueTotal = 0;
    let departmentMonthlyInputTotal = 0;
    let departmentCensusTotal = 0;
    let departmentCensusOpdTotal = 0;
    let departmentCensusErTotal = 0;
    let departmentMedicationErrorTotal = 0;
    let departmentEquipmentUtilizationSum = 0;
    let departmentEquipmentUtilizationCount = 0;

    if (revenueMonthly) {
      categorySourceKinds.revenue.add("monthly");
      departmentRevenueTotal += toNumber(revenueMonthly.revenue_total);
      totals.revenue_total += toNumber(revenueMonthly.revenue_total);
      totals.self_pay_count += toNumber(revenueMonthly.self_pay_count);
      totals.hmo_count += toNumber(revenueMonthly.hmo_count);
      totals.guarantee_letter_count += toNumber(revenueMonthly.guarantee_letter_count);
    } else if (departmentRows.length > 0) {
      categorySourceKinds.revenue.add("daily");
      for (const row of departmentRows) {
        departmentRevenueTotal += toNumber(row.revenue_total);
        totals.revenue_total += toNumber(row.revenue_total);
        totals.self_pay_count += toNumber(row.self_pay_count);
        totals.hmo_count += toNumber(row.hmo_count);
        totals.guarantee_letter_count += toNumber(row.guarantee_letter_count);
      }
    }

    if (censusMonthly) {
      categorySourceKinds.census.add("monthly");
      departmentCensusTotal += toNumber(censusMonthly.census_total);
      departmentCensusOpdTotal += toNumber(censusMonthly.census_opd);
      departmentCensusErTotal += toNumber(censusMonthly.census_er);
      totals.census_total += toNumber(censusMonthly.census_total);
      totals.census_opd += toNumber(censusMonthly.census_opd);
      totals.census_er += toNumber(censusMonthly.census_er);
      totals.census_walk_in += toNumber(censusMonthly.census_walk_in);
      totals.census_inpatient += toNumber(censusMonthly.census_inpatient);
    } else if (departmentRows.length > 0) {
      categorySourceKinds.census.add("daily");
      for (const row of departmentRows) {
        departmentCensusTotal += toNumber(row.census_total);
        departmentCensusOpdTotal += toNumber(row.census_opd);
        departmentCensusErTotal += toNumber(row.census_er);
        totals.census_total += toNumber(row.census_total);
        totals.census_opd += toNumber(row.census_opd);
        totals.census_er += toNumber(row.census_er);
        totals.census_walk_in += toNumber(row.census_walk_in);
        totals.census_inpatient += toNumber(row.census_inpatient);
      }
    }

    if (operationsMonthly) {
      categorySourceKinds.operations.add("monthly");
      departmentMonthlyInputTotal += toNumber(operationsMonthly.monthly_input_count);
      departmentMedicationErrorTotal += toNumber(operationsMonthly.medication_error_count);
      departmentEquipmentUtilizationSum += toNumber(operationsMonthly.equipment_utilization_pct);
      departmentEquipmentUtilizationCount += 1;

      totals.monthly_input_count += toNumber(operationsMonthly.monthly_input_count);
      totals.medication_error_count += toNumber(operationsMonthly.medication_error_count);
      equipmentUtilizationSum += toNumber(operationsMonthly.equipment_utilization_pct);
      equipmentUtilizationCount += 1;
    } else if (departmentRows.length > 0) {
      categorySourceKinds.operations.add("daily");
      for (const row of departmentRows) {
        departmentMonthlyInputTotal += toNumber(row.monthly_input_count);
        departmentMedicationErrorTotal += toNumber(row.medication_error_count);
        departmentEquipmentUtilizationSum += toNumber(row.equipment_utilization_pct);
        departmentEquipmentUtilizationCount += 1;

        totals.monthly_input_count += toNumber(row.monthly_input_count);
        totals.medication_error_count += toNumber(row.medication_error_count);
        equipmentUtilizationSum += toNumber(row.equipment_utilization_pct);
        equipmentUtilizationCount += 1;
      }
    }

    const hasDepartmentMetrics =
      departmentRevenueTotal > 0
      || departmentMonthlyInputTotal > 0
      || departmentCensusTotal > 0
      || departmentMedicationErrorTotal > 0
      || departmentEquipmentUtilizationCount > 0
      || (params.departmentId !== null && params.departmentId !== undefined && params.departmentId === departmentId);

    if (hasDepartmentMetrics) {
      departmentPerformance.push({
        department_id: departmentId,
        department_name: departmentName,
        revenue_total: departmentRevenueTotal,
        monthly_input_count: departmentMonthlyInputTotal,
        census_total: departmentCensusTotal,
        census_opd: departmentCensusOpdTotal,
        census_er: departmentCensusErTotal,
        equipment_utilization_pct:
          departmentEquipmentUtilizationCount > 0
            ? departmentEquipmentUtilizationSum / departmentEquipmentUtilizationCount
            : 0,
        medication_error_count: departmentMedicationErrorTotal,
      });
    }
  }

  const revenueOverrideDepartments = new Set(
    params.monthlyRows
      .filter((row) => row.category === "revenue")
      .map((row) => row.department_id),
  );
  const censusOverrideDepartments = new Set(
    params.monthlyRows
      .filter((row) => row.category === "census")
      .map((row) => row.department_id),
  );
  const operationsOverrideDepartments = new Set(
    params.monthlyRows
      .filter((row) => row.category === "operations")
      .map((row) => row.department_id),
  );

  for (const row of params.dailyRows) {
    const daily = dailyTrendMap.get(row.metric_date) ?? {
      revenue_total: 0,
      monthly_input_count: 0,
      census_total: 0,
      census_opd: 0,
      census_er: 0,
      equipment_utilization_sum: 0,
      equipment_utilization_count: 0,
      medication_error_count: 0,
    };

    if (!revenueOverrideDepartments.has(row.department_id)) {
      daily.revenue_total += toNumber(row.revenue_total);
    }

    if (!censusOverrideDepartments.has(row.department_id)) {
      daily.census_total += toNumber(row.census_total);
      daily.census_opd += toNumber(row.census_opd);
      daily.census_er += toNumber(row.census_er);
    }

    if (!operationsOverrideDepartments.has(row.department_id)) {
      daily.monthly_input_count += toNumber(row.monthly_input_count);
      daily.equipment_utilization_sum += toNumber(row.equipment_utilization_pct);
      daily.equipment_utilization_count += 1;
      daily.medication_error_count += toNumber(row.medication_error_count);
    }

    dailyTrendMap.set(row.metric_date, daily);
  }

  totals.equipment_utilization_pct =
    equipmentUtilizationCount > 0
      ? equipmentUtilizationSum / equipmentUtilizationCount
      : 0;

  departmentPerformance.sort((left, right) => right.revenue_total - left.revenue_total);

  return {
    totals,
    category_sources: {
      revenue: resolveCategorySource(categorySourceKinds.revenue),
      census: resolveCategorySource(categorySourceKinds.census),
      operations: resolveCategorySource(categorySourceKinds.operations),
    },
    daily_trend: Array.from(dailyTrendMap.entries()).map(([date, value]) => ({
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
    })),
    department_performance: departmentPerformance,
  } satisfies AggregatedWindow;
}

export async function buildMetricsSummary(
  supabase: SupabaseClient,
  params: MetricsSummaryParams,
): Promise<MetricsSummaryPayload> {
  let currentDailyQuery = supabase
    .from("department_metrics_daily")
    .select(
      [
        "metric_date",
        "department_id",
        "revenue_total",
        "self_pay_count",
        "hmo_count",
        "guarantee_letter_count",
        "monthly_input_count",
        "census_total",
        "census_opd",
        "census_er",
        "census_walk_in",
        "census_inpatient",
        "equipment_utilization_pct",
        "medication_error_count",
      ].join(", "),
    )
    .gte("metric_date", params.start)
    .lte("metric_date", params.end)
    .is("subdepartment_id", null)
    .order("metric_date", { ascending: true });

  let previousDailyQuery = supabase
    .from("department_metrics_daily")
    .select(
      [
        "metric_date",
        "department_id",
        "revenue_total",
        "self_pay_count",
        "hmo_count",
        "guarantee_letter_count",
        "monthly_input_count",
        "census_total",
        "census_opd",
        "census_er",
        "census_walk_in",
        "census_inpatient",
        "equipment_utilization_pct",
        "medication_error_count",
      ].join(", "),
    )
    .gte("metric_date", params.prevStart)
    .lte("metric_date", params.prevEnd)
    .is("subdepartment_id", null);

  let currentMonthlyQuery = supabase
    .from("department_metrics_monthly")
    .select(
      [
        "report_month",
        "department_id",
        "category",
        "revenue_total",
        "self_pay_count",
        "hmo_count",
        "guarantee_letter_count",
        "monthly_input_count",
        "census_total",
        "census_opd",
        "census_er",
        "census_walk_in",
        "census_inpatient",
        "equipment_utilization_pct",
        "medication_error_count",
      ].join(", "),
    )
    .eq("report_month", params.reportMonth)
    .is("subdepartment_id", null);

  let previousMonthlyQuery = supabase
    .from("department_metrics_monthly")
    .select(
      [
        "report_month",
        "department_id",
        "category",
        "revenue_total",
        "self_pay_count",
        "hmo_count",
        "guarantee_letter_count",
        "monthly_input_count",
        "census_total",
        "census_opd",
        "census_er",
        "census_walk_in",
        "census_inpatient",
        "equipment_utilization_pct",
        "medication_error_count",
      ].join(", "),
    )
    .eq("report_month", params.prevReportMonth)
    .is("subdepartment_id", null);

  if (params.departmentId) {
    currentDailyQuery = currentDailyQuery.eq("department_id", params.departmentId);
    previousDailyQuery = previousDailyQuery.eq("department_id", params.departmentId);
    currentMonthlyQuery = currentMonthlyQuery.eq("department_id", params.departmentId);
    previousMonthlyQuery = previousMonthlyQuery.eq("department_id", params.departmentId);
  }

  if (params.role === "department_head") {
    const scopedDepartmentIds =
      params.memberDepartmentIds.length > 0
        ? params.memberDepartmentIds
        : [departmentHeadFallbackId];

    currentDailyQuery = currentDailyQuery.in("department_id", scopedDepartmentIds);
    previousDailyQuery = previousDailyQuery.in("department_id", scopedDepartmentIds);
    currentMonthlyQuery = currentMonthlyQuery.in("department_id", scopedDepartmentIds);
    previousMonthlyQuery = previousMonthlyQuery.in("department_id", scopedDepartmentIds);
  }

  const [
    { data: currentDailyRows, error: currentDailyError },
    { data: previousDailyRows, error: previousDailyError },
    { data: currentMonthlyRows, error: currentMonthlyError },
    { data: previousMonthlyRows, error: previousMonthlyError },
  ] = await Promise.all([
    currentDailyQuery,
    previousDailyQuery,
    currentMonthlyQuery,
    previousMonthlyQuery,
  ]);

  const error =
    currentDailyError
    ?? previousDailyError
    ?? currentMonthlyError
    ?? previousMonthlyError;
  if (error) {
    throw error;
  }

  const currentWindow = aggregateMetricsWindow({
    dailyRows: (currentDailyRows ?? []) as unknown as DailyMetricsSummaryRow[],
    monthlyRows: (currentMonthlyRows ?? []) as unknown as MonthlyMetricsSummaryRow[],
    availableDepartments: params.availableDepartments,
    departmentId: params.departmentId,
  });
  const previousWindow = aggregateMetricsWindow({
    dailyRows: (previousDailyRows ?? []) as unknown as DailyMetricsSummaryRow[],
    monthlyRows: (previousMonthlyRows ?? []) as unknown as MonthlyMetricsSummaryRow[],
    availableDepartments: params.availableDepartments,
    departmentId: params.departmentId,
  });

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
    totals: currentWindow.totals,
    best_performing_department: currentWindow.department_performance[0] ?? null,
    category_sources: currentWindow.category_sources,
    daily_trend: currentWindow.daily_trend,
    department_performance: currentWindow.department_performance,
    previous_totals: {
      revenue_total: previousWindow.totals.revenue_total,
      monthly_input_count: previousWindow.totals.monthly_input_count,
      census_total: previousWindow.totals.census_total,
      equipment_utilization_pct: previousWindow.totals.equipment_utilization_pct,
      medication_error_count: previousWindow.totals.medication_error_count,
    },
  };
}
