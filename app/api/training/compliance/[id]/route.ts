import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  deleteTrainingComplianceById,
  getTrainingComplianceById,
  getTrainingModuleById,
  updateTrainingComplianceById,
  updateTrainingComplianceSchema,
} from "@/lib/data/training";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TrainingComplianceShape = {
  department_id: string;
  training_module_id: string;
  assigned_staff_count: number;
  completed_staff_count: number;
};

type TrainingModuleShape = {
  is_system_wide: boolean;
  department_id: string | null;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training compliance id", code: "VALIDATION_ERROR" },
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

  const { data, error } = await getTrainingComplianceById(supabase, id);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Training compliance record not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch training compliance record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training compliance id", code: "VALIDATION_ERROR" },
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

  const parsed = updateTrainingComplianceSchema.safeParse(body);
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

  const { data: existingRecordRaw, error: existingError } = await getTrainingComplianceById(supabase, id);
  if (existingError || !existingRecordRaw) {
    return NextResponse.json(
      { error: "Training compliance record not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingRecord = existingRecordRaw as unknown as TrainingComplianceShape;

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

  const targetModuleId = parsed.data.training_module_id ?? existingRecord.training_module_id;
  const { data: moduleRaw, error: moduleError } = await getTrainingModuleById(supabase, targetModuleId);
  if (moduleError || !moduleRaw) {
    return NextResponse.json(
      { error: "Training module not found", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  const trainingModule = moduleRaw as unknown as TrainingModuleShape;

  if (
    !trainingModule.is_system_wide
    && trainingModule.department_id !== targetDepartmentId
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

  const assignedStaffCount = parsed.data.assigned_staff_count ?? existingRecord.assigned_staff_count;
  const completedStaffCount = parsed.data.completed_staff_count ?? existingRecord.completed_staff_count;
  if (completedStaffCount > assignedStaffCount) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: {
          completed_staff_count: ["completed_staff_count cannot exceed assigned_staff_count"],
        },
      },
      { status: 400 },
    );
  }

  const { data, error } = await updateTrainingComplianceById(
    supabase,
    id,
    parsed.data,
    user.id,
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A compliance record already exists for this module, department, and month", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update training compliance record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training compliance id", code: "VALIDATION_ERROR" },
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

  const { data: existingRecordRaw, error: existingError } = await getTrainingComplianceById(supabase, id);
  if (existingError || !existingRecordRaw) {
    return NextResponse.json(
      { error: "Training compliance record not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingRecord = existingRecordRaw as unknown as TrainingComplianceShape;

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(existingRecord.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { error } = await deleteTrainingComplianceById(supabase, id);
  if (error) {
    return NextResponse.json(
      { error: "Failed to delete training compliance record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
