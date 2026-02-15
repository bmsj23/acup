import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import {
  createMetric,
  listMetrics,
} from "@/lib/data/metrics";
import { createMetricSchema } from "@/lib/data/metrics-action-helpers";

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

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);
  const departmentIdFilter = searchParams.get("department_id");
  const subdepartmentIdFilter = searchParams.get("subdepartment_id");
  const startDateFilter = searchParams.get("start_date");
  const endDateFilter = searchParams.get("end_date");

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

  const { data, error, count } = await listMetrics(supabase, {
    from,
    to,
    department_id: departmentIdFilter,
    subdepartment_id: subdepartmentIdFilter,
    start_date: startDateFilter,
    end_date: endDateFilter,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch metrics", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: createPagination(page, limit, count),
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

  if (payload.census_opd + payload.census_er > payload.census_total) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { census_total: ["census_opd + census_er must not exceed census_total"] },
      },
      { status: 400 },
    );
  }

  if (
    payload.census_walk_in !== null
    && payload.census_walk_in !== undefined
    && payload.census_inpatient !== null
    && payload.census_inpatient !== undefined
    && payload.census_walk_in + payload.census_inpatient > payload.census_total
  ) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: {
          census_total: [
            "census_walk_in + census_inpatient must not exceed census_total",
          ],
        },
      },
      { status: 400 },
    );
  }

  if (hasPharmacyOnlyFields(payload)) {
    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("code")
      .eq("id", payload.department_id)
      .single();

    if (departmentError || !department) {
      return NextResponse.json(
        { error: "Department not found", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (department.code !== "PHAR") {
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

  const { data, error } = await createMetric(supabase, payload, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create metric", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
