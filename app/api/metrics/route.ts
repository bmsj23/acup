import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import {
  createMetric,
  getMetricByScope,
  listMetrics,
  updateMetricById,
} from "@/lib/data/metrics";
import { createMetricSchema } from "@/lib/data/metrics-action-helpers";
import { getDepartmentById } from "@/lib/data/departments";
import {
  getRoleScope,
  resolveScopedDepartmentId,
} from "@/lib/data/monitoring";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import { METRIC_CATEGORIES, type MetricCategory } from "@/lib/constants/metrics";
import { listTransactionCategories, upsertTransactionCategories } from "@/lib/data/transaction-categories";

type MetricRow = {
  id: string;
  metric_date: string;
  department_id: string;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in: number | null;
  census_inpatient: number | null;
  departments?: {
    name?: string;
    code?: string;
    is_revenue?: boolean | null;
    is_census?: boolean | null;
    supports_turnaround_time?: boolean | null;
  } | null;
};

function hasPharmacyOnlyFields(payload: {
  pharmacy_revenue_inpatient?: number | null;
  pharmacy_revenue_opd?: number | null;
}) {
  return (
    payload.pharmacy_revenue_inpatient !== undefined
    || payload.pharmacy_revenue_opd !== undefined
  ) && (
    payload.pharmacy_revenue_inpatient !== null
    || payload.pharmacy_revenue_opd !== null
  );
}

function validateCensusTotals(payload: {
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in?: number | null;
  census_inpatient?: number | null;
}) {
  if (payload.census_opd + payload.census_er > payload.census_total) {
    return {
      census_total: ["census_opd + census_er must not exceed census_total"],
    };
  }

  if (
    payload.census_walk_in !== null
    && payload.census_walk_in !== undefined
    && payload.census_inpatient !== null
    && payload.census_inpatient !== undefined
    && payload.census_walk_in + payload.census_inpatient > payload.census_total
  ) {
    return {
      census_total: ["census_walk_in + census_inpatient must not exceed census_total"],
    };
  }

  return null;
}

function applyCategoryFilter(rows: MetricRow[], category: MetricCategory | null) {
  if (!category) {
    return rows;
  }

  return rows.filter((row) => {
    const capabilities = getDepartmentCapabilities(row.departments);

    if (category === "revenue") {
      return capabilities.supportsRevenue;
    }

    if (category === "census") {
      return capabilities.supportsCensus;
    }

    return true;
  });
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

  const { role, memberDepartmentIds, error: scopeError } = await getRoleScope(supabase, user.id);
  if (scopeError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);
  const departmentIdFilter = searchParams.get("department_id");
  const subdepartmentIdFilter = searchParams.get("subdepartment_id");
  const startDateFilter = searchParams.get("start_date");
  const endDateFilter = searchParams.get("end_date");
  const categoryFilter = searchParams.get("category");

  if (departmentIdFilter && !isValidUuid(departmentIdFilter)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (subdepartmentIdFilter && !isValidUuid(subdepartmentIdFilter)) {
    return NextResponse.json(
      { error: "Invalid subdepartment id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (
    categoryFilter
    && !METRIC_CATEGORIES.includes(categoryFilter as MetricCategory)
  ) {
    return NextResponse.json(
      { error: "Invalid metrics category", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const departmentScope = resolveScopedDepartmentId({
    role,
    memberDepartmentIds,
    requestedDepartmentId: departmentIdFilter,
  });

  if (departmentScope.forbidden) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const effectiveDepartmentId =
    role === "department_head"
      ? departmentScope.effectiveDepartmentId
      : departmentIdFilter;

  const metricsResult = await listMetrics(supabase, {
    ...(categoryFilter ? {} : { from, to }),
    department_id: effectiveDepartmentId,
    subdepartment_id: subdepartmentIdFilter,
    start_date: startDateFilter,
    end_date: endDateFilter,
  });

  if (metricsResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch metrics", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const metricsRows = (metricsResult.data ?? []) as unknown as MetricRow[];
  const filteredRows = applyCategoryFilter(
    metricsRows,
    (categoryFilter as MetricCategory | null) ?? null,
  );
  const visibleRows = categoryFilter
    ? filteredRows.slice(from, to + 1)
    : filteredRows;

  const transactionResult = await listTransactionCategories(supabase, {
    department_id: effectiveDepartmentId ?? undefined,
    start_date: startDateFilter ?? undefined,
    end_date: endDateFilter ?? undefined,
  });

  const transactionMap = new Map<string, Array<{ category: string; count: number }>>();
  for (const row of transactionResult.data ?? []) {
    const key = `${row.metric_date}:${row.department_id}`;
    const existing = transactionMap.get(key) ?? [];
    existing.push({
      category: row.category as string,
      count: Number(row.count ?? 0),
    });
    transactionMap.set(key, existing);
  }

  return NextResponse.json({
    data: visibleRows.map((row) => ({
      ...row,
      transaction_entries: transactionMap.get(`${row.metric_date}:${row.department_id}`) ?? [],
    })),
    pagination: createPagination(
      page,
      limit,
      categoryFilter ? filteredRows.length : metricsResult.count,
    ),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { role, memberDepartmentIds, error: scopeError } = await getRoleScope(supabase, user.id);
  if (scopeError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = createMetricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(payload.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data: department, error: departmentError } = await getDepartmentById(
    supabase,
    payload.department_id,
  );

  if (departmentError || !department) {
    return NextResponse.json(
      { error: "Department not found", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const capabilities = getDepartmentCapabilities(department);

  if (payload.category === "revenue" && !capabilities.supportsRevenue) {
    return NextResponse.json(
      { error: "Revenue metrics are not available for this department", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (payload.category === "census" && !capabilities.supportsCensus) {
    return NextResponse.json(
      { error: "Census metrics are not available for this department", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (payload.category === "revenue" && payload.revenue) {
    if (hasPharmacyOnlyFields(payload.revenue) && department.code !== "PHAR") {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: {
            department_id: ["pharmacy revenue channels are only valid for Pharmacy"],
          },
        },
        { status: 400 },
      );
    }
  }

  if (payload.category === "census" && payload.census) {
    const censusErrorDetails = validateCensusTotals(payload.census);
    if (censusErrorDetails) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: censusErrorDetails,
        },
        { status: 400 },
      );
    }
  }

  if (
    payload.category === "operations"
    && payload.operations?.equipment_utilization_pct !== undefined
    && !capabilities.supportsEquipment
  ) {
    return NextResponse.json(
      {
        error: "Equipment utilization is not available for this department",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  if (
    payload.category === "operations"
    && payload.operations?.transaction_entries
    && !capabilities.usesTransactionCategories
  ) {
    return NextResponse.json(
      {
        error: "Transaction-category operations are only available for Medical Records",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const { data: existingMetricRaw } = await getMetricByScope(supabase, {
    metric_date: payload.metric_date,
    department_id: payload.department_id,
    subdepartment_id: payload.subdepartment_id ?? null,
  });

  const existingMetric = (existingMetricRaw ?? null) as unknown as { id: string } | null;

  const result = existingMetric
    ? await updateMetricById(supabase, existingMetric.id, payload, user.id, capabilities.supportsEquipment)
    : await createMetric(supabase, payload, user.id, capabilities.supportsEquipment);

  const { data, error } = result;

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: existingMetric ? "Failed to update metric" : "Failed to create metric", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  if (
    payload.category === "operations"
    && payload.operations?.transaction_entries
    && capabilities.usesTransactionCategories
  ) {
    const transactionResultForUpsert = await upsertTransactionCategories(
      supabase,
      {
        metric_date: payload.metric_date,
        department_id: payload.department_id,
        entries: payload.operations.transaction_entries,
      },
      user.id,
    );

    if (transactionResultForUpsert.error) {
      return NextResponse.json(
        { error: "Failed to save transaction categories", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data }, { status: existingMetric ? 200 : 201 });
}
