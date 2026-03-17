import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import {
  deleteMetricById,
  getMetricById,
  updateMetricById,
} from "@/lib/data/metrics";
import { updateMetricSchema } from "@/lib/data/metrics-action-helpers";
import type { MetricCategory, MetricPeriodType } from "@/lib/constants/metrics";
import { getRoleScope } from "@/lib/data/monitoring";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import { deleteTransactionCategoryById, listTransactionCategories, upsertTransactionCategories } from "@/lib/data/transaction-categories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MetricShape = {
  id: string;
  period_type: MetricPeriodType;
  category: MetricCategory | null;
  metric_date: string | null;
  report_month: string | null;
  department_id: string;
  subdepartment_id: string | null;
  census_total: number;
  census_opd: number;
  census_er: number;
  census_walk_in: number | null;
  census_inpatient: number | null;
  departments?: {
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

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid metric id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: metricRaw, error } = await getMetricById(supabase, id);

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Metric not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch metric", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const metric = (metricRaw ?? null) as unknown as MetricShape | null;

  if (!metric) {
    return NextResponse.json(
      { error: "Metric not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      ...metric,
      transaction_entries:
        metric.period_type === "daily" && metric.metric_date
          ? (
              await listTransactionCategories(supabase, {
                department_id: metric.department_id,
                start_date: metric.metric_date,
                end_date: metric.metric_date,
              })
            ).data?.map((row) => ({
              category: row.category as string,
              count: Number(row.count ?? 0),
            })) ?? []
          : [],
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid metric id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

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

  const parsed = updateMetricSchema.safeParse(body);
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

  const { data: existingMetricRaw, error: existingMetricError } = await getMetricById(
    supabase,
    id,
  );

  if (existingMetricError || !existingMetricRaw) {
    if (existingMetricError?.code === "PGRST116") {
      return NextResponse.json(
        { error: "Metric not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (existingMetricError?.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch metric", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const existingMetric = existingMetricRaw as unknown as MetricShape;

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(existingMetric.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const capabilities = getDepartmentCapabilities(existingMetric.departments);

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

  if (payload.category === "revenue" && payload.revenue && hasPharmacyOnlyFields(payload.revenue) && existingMetric.departments?.code !== "PHAR") {
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

  if (payload.category === "census" && payload.census) {
    const censusErrorDetails = validateCensusTotals({
      census_total: payload.census.census_total ?? existingMetric.census_total,
      census_opd: payload.census.census_opd ?? existingMetric.census_opd,
      census_er: payload.census.census_er ?? existingMetric.census_er,
      census_walk_in: payload.census.census_walk_in ?? existingMetric.census_walk_in,
      census_inpatient: payload.census.census_inpatient ?? existingMetric.census_inpatient,
    });

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
    payload.period_type !== existingMetric.period_type
  ) {
    return NextResponse.json(
      {
        error: "Metric period type cannot be changed",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
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
    && existingMetric.period_type === "monthly"
  ) {
    return NextResponse.json(
      {
        error: "Monthly transaction-category entries are not available",
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

  const { data, error } = await updateMetricById(
    supabase,
    id,
    payload,
    user.id,
    capabilities.supportsEquipment,
    existingMetric.period_type,
  );

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Metric not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update metric", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  if (
    existingMetric.period_type === "daily"
    && payload.category === "operations"
    && payload.operations?.transaction_entries
    && capabilities.usesTransactionCategories
  ) {
    const transactionResult = await upsertTransactionCategories(
      supabase,
      {
        metric_date: existingMetric.metric_date!,
        department_id: existingMetric.department_id,
        entries: payload.operations.transaction_entries,
      },
      user.id,
    );

    if (transactionResult.error) {
      return NextResponse.json(
        { error: "Failed to save transaction categories", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid metric id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: existingMetricRaw } = await getMetricById(supabase, id);
  const existingMetric = (existingMetricRaw ?? null) as MetricShape | null;

  const { error } = await deleteMetricById(
    supabase,
    id,
    existingMetric?.period_type ?? "daily",
  );

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Metric not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete metric", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  if (
    existingMetric
    && existingMetric.period_type === "daily"
    && existingMetric.metric_date
    && getDepartmentCapabilities(existingMetric.departments).usesTransactionCategories
  ) {
    const transactionRows = await listTransactionCategories(supabase, {
      department_id: existingMetric.department_id,
      start_date: existingMetric.metric_date,
      end_date: existingMetric.metric_date,
    });

    for (const row of transactionRows.data ?? []) {
      await deleteTransactionCategoryById(supabase, row.id as string);
    }
  }

  return new NextResponse(null, { status: 204 });
}
