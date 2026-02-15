import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import {
  deleteMetricById,
  getMetricById,
  updateMetricById,
} from "@/lib/data/metrics";
import { updateMetricSchema } from "@/lib/data/metrics-action-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
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

  const { data, error } = await getMetricById(supabase, id);

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

  return NextResponse.json({ data });
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

  const { data: existingMetric, error: existingMetricError } = await getMetricById(
    supabase,
    id,
  );

  if (existingMetricError || !existingMetric) {
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

  const censusTotal = payload.census_total ?? existingMetric.census_total;
  const censusOpd = payload.census_opd ?? existingMetric.census_opd;
  const censusEr = payload.census_er ?? existingMetric.census_er;

  if (censusOpd + censusEr > censusTotal) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { census_total: ["census_opd + census_er must not exceed census_total"] },
      },
      { status: 400 },
    );
  }

  const censusWalkIn = payload.census_walk_in ?? existingMetric.census_walk_in;
  const censusInpatient = payload.census_inpatient ?? existingMetric.census_inpatient;

  if (
    censusWalkIn !== null
    && censusWalkIn !== undefined
    && censusInpatient !== null
    && censusInpatient !== undefined
    && censusWalkIn + censusInpatient > censusTotal
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
    const departmentId = payload.department_id ?? existingMetric.department_id;

    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("code")
      .eq("id", departmentId)
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

  const { data, error } = await updateMetricById(supabase, id, payload, user.id);

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

  const { error } = await deleteMetricById(supabase, id);

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

  return new NextResponse(null, { status: 204 });
}
