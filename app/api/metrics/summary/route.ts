import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getUserRole, isValidUuid } from "@/lib/data/auth";

type MetricRow = {
  metric_date: string;
  department_id: string;
  subdepartment_id: string | null;
  revenue_total: number;
  monthly_input_count: number;
  census_total: number;
  census_opd: number;
  census_er: number;
  equipment_utilization_pct: number;
};

type DepartmentRow = {
  id: string;
  name: string;
  code: string;
};

function getMonthRange(monthParam?: string | null) {
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : fallbackMonth;

  const startDate = new Date(`${month}-01T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);

  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  const prevStartDate = new Date(startDate);
  prevStartDate.setUTCMonth(prevStartDate.getUTCMonth() - 1);
  const prevEndDate = new Date(startDate);
  prevEndDate.setUTCDate(0);

  const prevStart = prevStartDate.toISOString().slice(0, 10);
  const prevEnd = prevEndDate.toISOString().slice(0, 10);

  return { month, start, end, prevStart, prevEnd };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { role, error: roleError } = await getUserRole(supabase, user.id);
  if (roleError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { month, start, end, prevStart, prevEnd } = getMonthRange(searchParams.get("month"));
  const departmentIdFilter = searchParams.get("department_id");

  if (departmentIdFilter && !isValidUuid(departmentIdFilter)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", user.id);

  if (membershipError) {
    return NextResponse.json(
      { error: "Failed to load memberships", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const memberDepartmentIds = (memberships ?? []).map((item) => item.department_id);

  if (
    role === "department_head"
    && departmentIdFilter
    && !memberDepartmentIds.includes(departmentIdFilter)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  let effectiveDepartmentId = departmentIdFilter;
  if (role === "department_head" && !effectiveDepartmentId) {
    effectiveDepartmentId = memberDepartmentIds[0] ?? null;
  }

  let departmentQuery = supabase
    .from("departments")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (role === "department_head") {
    departmentQuery = departmentQuery.in("id", memberDepartmentIds);
  }

  const { data: departments, error: departmentsError } = await departmentQuery;

  if (departmentsError) {
    return NextResponse.json(
      { error: "Failed to fetch departments", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  let metricsQuery = supabase
    .from("department_metrics_daily")
    .select(
      "metric_date, department_id, subdepartment_id, revenue_total, monthly_input_count, census_total, census_opd, census_er, equipment_utilization_pct",
    )
    .gte("metric_date", start)
    .lte("metric_date", end)
    .is("subdepartment_id", null)
    .order("metric_date", { ascending: true });

  if (effectiveDepartmentId) {
    metricsQuery = metricsQuery.eq("department_id", effectiveDepartmentId);
  }

  if (role === "department_head") {
    metricsQuery = metricsQuery.in("department_id", memberDepartmentIds);
  }

  const { data: metricsRows, error: metricsError } = await metricsQuery;

  if (metricsError) {
    return NextResponse.json(
      { error: "Failed to fetch metrics summary", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  // fetch previous month metrics for trend calculation
  let prevMetricsQuery = supabase
    .from("department_metrics_daily")
    .select(
      "revenue_total, monthly_input_count, census_total, equipment_utilization_pct",
    )
    .gte("metric_date", prevStart)
    .lte("metric_date", prevEnd)
    .is("subdepartment_id", null);

  if (effectiveDepartmentId) {
    prevMetricsQuery = prevMetricsQuery.eq("department_id", effectiveDepartmentId);
  }

  if (role === "department_head") {
    prevMetricsQuery = prevMetricsQuery.in("department_id", memberDepartmentIds);
  }

  const { data: prevRows } = await prevMetricsQuery;

  let prevRevenue = 0;
  let prevInputs = 0;
  let prevCensus = 0;
  let prevEquipmentSum = 0;

  for (const row of (prevRows ?? []) as MetricRow[]) {
    prevRevenue += Number(row.revenue_total);
    prevInputs += row.monthly_input_count;
    prevCensus += row.census_total;
    prevEquipmentSum += Number(row.equipment_utilization_pct);
  }

  const prevEquipmentAvg = (prevRows ?? []).length > 0
    ? prevEquipmentSum / (prevRows ?? []).length
    : 0;

  const rows = (metricsRows ?? []) as MetricRow[];
  const departmentMap = new Map<string, DepartmentRow>(
    (departments ?? []).map((dept) => [dept.id, dept]),
  );

  let revenueTotal = 0;
  let monthlyInputTotal = 0;
  let censusTotal = 0;
  let censusOpdTotal = 0;
  let censusErTotal = 0;
  let equipmentUtilizationSum = 0;

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
    }
  >();

  for (const row of rows) {
    revenueTotal += Number(row.revenue_total);
    monthlyInputTotal += row.monthly_input_count;
    censusTotal += row.census_total;
    censusOpdTotal += row.census_opd;
    censusErTotal += row.census_er;
    equipmentUtilizationSum += Number(row.equipment_utilization_pct);

    const daily = dailyMap.get(row.metric_date) ?? {
      revenue_total: 0,
      monthly_input_count: 0,
      census_total: 0,
      census_opd: 0,
      census_er: 0,
      equipment_utilization_sum: 0,
      equipment_utilization_count: 0,
    };

    daily.revenue_total += Number(row.revenue_total);
    daily.monthly_input_count += row.monthly_input_count;
    daily.census_total += row.census_total;
    daily.census_opd += row.census_opd;
    daily.census_er += row.census_er;
    daily.equipment_utilization_sum += Number(row.equipment_utilization_pct);
    daily.equipment_utilization_count += 1;

    dailyMap.set(row.metric_date, daily);

    const departmentName = departmentMap.get(row.department_id)?.name ?? "Unknown Department";

    const dept = departmentMapAgg.get(row.department_id) ?? {
      department_id: row.department_id,
      department_name: departmentName,
      revenue_total: 0,
      monthly_input_count: 0,
      census_total: 0,
      census_opd: 0,
      census_er: 0,
      equipment_utilization_sum: 0,
      equipment_utilization_count: 0,
    };

    dept.revenue_total += Number(row.revenue_total);
    dept.monthly_input_count += row.monthly_input_count;
    dept.census_total += row.census_total;
    dept.census_opd += row.census_opd;
    dept.census_er += row.census_er;
    dept.equipment_utilization_sum += Number(row.equipment_utilization_pct);
    dept.equipment_utilization_count += 1;

    departmentMapAgg.set(row.department_id, dept);
  }

  const averageEquipmentUtilization = rows.length > 0 ? equipmentUtilizationSum / rows.length : 0;

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
  }));

  const departmentPerformance = Array.from(departmentMapAgg.values())
    .map((dept) => ({
      department_id: dept.department_id,
      department_name: dept.department_name,
      revenue_total: dept.revenue_total,
      monthly_input_count: dept.monthly_input_count,
      census_total: dept.census_total,
      census_opd: dept.census_opd,
      census_er: dept.census_er,
      equipment_utilization_pct:
        dept.equipment_utilization_count > 0
          ? dept.equipment_utilization_sum / dept.equipment_utilization_count
          : 0,
    }))
    .sort((a, b) => b.revenue_total - a.revenue_total);

  return NextResponse.json({
    filters: {
      month,
      department_id: effectiveDepartmentId,
      available_departments: departments ?? [],
    },
    role_scope: {
      role,
      member_department_ids: memberDepartmentIds,
    },
    totals: {
      revenue_total: revenueTotal,
      monthly_input_count: monthlyInputTotal,
      census_total: censusTotal,
      census_opd: censusOpdTotal,
      census_er: censusErTotal,
      equipment_utilization_pct: averageEquipmentUtilization,
    },
    best_performing_department: departmentPerformance[0] ?? null,
    daily_trend: dailyTrend,
    department_performance: departmentPerformance,
    previous_totals: {
      revenue_total: prevRevenue,
      monthly_input_count: prevInputs,
      census_total: prevCensus,
      equipment_utilization_pct: prevEquipmentAvg,
    },
  });
}
