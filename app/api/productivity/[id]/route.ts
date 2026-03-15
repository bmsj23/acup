import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  deleteProductivityRecordById,
  getProductivityRecordById,
  updateProductivityRecordById,
  updateProductivityRecordSchema,
} from "@/lib/data/productivity";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProductivityRecordShape = {
  department_id: string;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid productivity record id", code: "VALIDATION_ERROR" },
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

  const { data, error } = await getProductivityRecordById(supabase, id);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Productivity record not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch productivity record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid productivity record id", code: "VALIDATION_ERROR" },
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

  const parsed = updateProductivityRecordSchema.safeParse(body);
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

  const { data: existingRecordRaw, error: existingError } = await getProductivityRecordById(supabase, id);
  if (existingError || !existingRecordRaw) {
    return NextResponse.json(
      { error: "Productivity record not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingRecord = existingRecordRaw as unknown as ProductivityRecordShape;

  const targetDepartmentId = parsed.data.department_id ?? existingRecord.department_id;
  if (
    role === "department_head"
    && !memberDepartmentIds.includes(targetDepartmentId)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data, error } = await updateProductivityRecordById(
    supabase,
    id,
    parsed.data,
    user.id,
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A productivity record already exists for this department and month", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update productivity record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid productivity record id", code: "VALIDATION_ERROR" },
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

  const { data: existingRecordRaw, error: existingError } = await getProductivityRecordById(supabase, id);
  if (existingError || !existingRecordRaw) {
    return NextResponse.json(
      { error: "Productivity record not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingRecord = existingRecordRaw as unknown as ProductivityRecordShape;

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(existingRecord.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { error } = await deleteProductivityRecordById(supabase, id);
  if (error) {
    return NextResponse.json(
      { error: "Failed to delete productivity record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
