import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  createTrainingCompliance,
  createTrainingComplianceSchema,
  getTrainingModuleById,
  listTrainingCompliance,
} from "@/lib/data/training";

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
  const departmentId = searchParams.get("department_id");
  const trainingModuleId = searchParams.get("training_module_id");
  const reportMonth = searchParams.get("report_month");

  if (departmentId && !isValidUuid(departmentId)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (trainingModuleId && !isValidUuid(trainingModuleId)) {
    return NextResponse.json(
      { error: "Invalid training module id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (
    role === "department_head"
    && departmentId
    && !memberDepartmentIds.includes(departmentId)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data, error, count } = await listTrainingCompliance(supabase, {
    from,
    to,
    department_id:
      role === "department_head" && !departmentId
        ? memberDepartmentIds[0] ?? null
        : departmentId,
    training_module_id: trainingModuleId,
    report_month: reportMonth,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch training compliance", code: "INTERNAL_ERROR" },
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

  const parsed = createTrainingComplianceSchema.safeParse(body);
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

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(parsed.data.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data: moduleRaw, error: moduleError } = await getTrainingModuleById(
    supabase,
    parsed.data.training_module_id,
  );

  if (moduleError || !moduleRaw) {
    return NextResponse.json(
      { error: "Training module not found", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  const trainingModule = moduleRaw as unknown as {
    is_system_wide: boolean;
    department_id: string | null;
  };

  if (
    !trainingModule.is_system_wide
    && trainingModule.department_id !== parsed.data.department_id
  ) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: {
          department_id: ["Department-scoped modules can only record compliance for their own department"],
        },
      },
      { status: 400 },
    );
  }

  const { data, error } = await createTrainingCompliance(supabase, parsed.data, user.id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A compliance record already exists for this module, department, and month", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create compliance record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
