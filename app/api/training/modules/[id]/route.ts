import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  deleteTrainingModuleById,
  getTrainingModuleById,
  updateTrainingModuleById,
  updateTrainingModuleSchema,
} from "@/lib/data/training";
import { TRAINING_BUCKET } from "@/lib/constants/training";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TrainingModuleShape = {
  is_system_wide: boolean;
  department_id: string | null;
  material_storage_path: string;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training module id", code: "VALIDATION_ERROR" },
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

  const { data, error } = await getTrainingModuleById(supabase, id);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Training module not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch training module", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training module id", code: "VALIDATION_ERROR" },
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

  const parsed = updateTrainingModuleSchema.safeParse(body);
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

  const { data: existingModuleRaw, error: existingError } = await getTrainingModuleById(supabase, id);
  if (existingError || !existingModuleRaw) {
    return NextResponse.json(
      { error: "Training module not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingModule = existingModuleRaw as unknown as TrainingModuleShape;

  if (
    role === "department_head"
    && (
      existingModule.is_system_wide
      || !existingModule.department_id
      || !memberDepartmentIds.includes(existingModule.department_id)
    )
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const targetIsSystemWide = parsed.data.is_system_wide ?? existingModule.is_system_wide;
  const targetDepartmentId = parsed.data.department_id ?? existingModule.department_id;

  if (role === "department_head" && targetIsSystemWide) {
    return NextResponse.json(
      { error: "Department heads cannot publish system-wide modules", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (
    role === "department_head"
    && targetDepartmentId
    && !memberDepartmentIds.includes(targetDepartmentId)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (!targetIsSystemWide && !targetDepartmentId) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { department_id: ["Department-scoped modules require a department"] },
      },
      { status: 400 },
    );
  }

  const { data, error } = await updateTrainingModuleById(supabase, id, {
    ...parsed.data,
    department_id: targetIsSystemWide ? null : targetDepartmentId,
    is_system_wide: targetIsSystemWide,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update training module", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid training module id", code: "VALIDATION_ERROR" },
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

  const { data: existingModuleRaw, error: existingError } = await getTrainingModuleById(supabase, id);
  if (existingError || !existingModuleRaw) {
    return NextResponse.json(
      { error: "Training module not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingModule = existingModuleRaw as unknown as TrainingModuleShape;

  if (
    role === "department_head"
    && (
      existingModule.is_system_wide
      || !existingModule.department_id
      || !memberDepartmentIds.includes(existingModule.department_id)
    )
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { error } = await deleteTrainingModuleById(supabase, id);
  if (error) {
    return NextResponse.json(
      { error: "Failed to delete training module", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  await admin.storage
    .from(TRAINING_BUCKET)
    .remove([existingModule.material_storage_path]);

  return new NextResponse(null, { status: 204 });
}
