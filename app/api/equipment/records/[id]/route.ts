import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  deleteEquipmentRecordById,
  getEquipmentAssetById,
  getEquipmentRecordById,
  updateEquipmentRecordById,
  updateEquipmentRecordSchema,
} from "@/lib/data/equipment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type EquipmentRecordShape = {
  equipment_asset_id: string;
  available_hours: number;
  actual_usage_hours: number;
  equipment_assets?: { department_id?: string } | null;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid equipment record id", code: "VALIDATION_ERROR" },
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

  const { data, error } = await getEquipmentRecordById(supabase, id);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Equipment record not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch equipment record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid equipment record id", code: "VALIDATION_ERROR" },
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

  const parsed = updateEquipmentRecordSchema.safeParse(body);
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

  const { data: existingRecordRaw, error: existingError } = await getEquipmentRecordById(supabase, id);
  if (existingError || !existingRecordRaw) {
    return NextResponse.json(
      { error: "Equipment record not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingRecord = existingRecordRaw as unknown as EquipmentRecordShape;

  const targetAssetId = parsed.data.equipment_asset_id ?? existingRecord.equipment_asset_id;
  const { data: targetAsset, error: assetError } = await getEquipmentAssetById(supabase, targetAssetId);

  if (assetError || !targetAsset) {
    return NextResponse.json(
      { error: "Equipment asset not found", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(targetAsset.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const availableHours = parsed.data.available_hours ?? existingRecord.available_hours;
  const actualUsageHours = parsed.data.actual_usage_hours ?? existingRecord.actual_usage_hours;
  if (actualUsageHours > availableHours) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: {
          actual_usage_hours: ["actual_usage_hours cannot exceed available_hours"],
        },
      },
      { status: 400 },
    );
  }

  const { data, error } = await updateEquipmentRecordById(
    supabase,
    id,
    parsed.data,
    user.id,
  );

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A record already exists for this equipment and month", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update equipment record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid equipment record id", code: "VALIDATION_ERROR" },
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

  const { data: existingRecordRaw, error: existingError } = await getEquipmentRecordById(supabase, id);
  if (existingError || !existingRecordRaw) {
    return NextResponse.json(
      { error: "Equipment record not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  const existingRecord = existingRecordRaw as unknown as EquipmentRecordShape;

  const targetDepartmentId = existingRecord.equipment_assets?.department_id ?? null;
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

  const { error } = await deleteEquipmentRecordById(supabase, id);
  if (error) {
    return NextResponse.json(
      { error: "Failed to delete equipment record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
