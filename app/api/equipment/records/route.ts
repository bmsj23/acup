import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  createEquipmentRecord,
  createEquipmentRecordSchema,
  getEquipmentAssetById,
  listEquipmentRecords,
} from "@/lib/data/equipment";

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
  const equipmentAssetId = searchParams.get("equipment_asset_id");
  const departmentId = searchParams.get("department_id");
  const reportMonth = searchParams.get("report_month");

  if (equipmentAssetId && !isValidUuid(equipmentAssetId)) {
    return NextResponse.json(
      { error: "Invalid equipment asset id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (departmentId && !isValidUuid(departmentId)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
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

  let equipmentAssetIds: string[] | null = null;
  if (departmentId) {
    const { data: assets, error: assetsError } = await supabase
      .from("equipment_assets")
      .select("id")
      .eq("department_id", departmentId);

    if (assetsError) {
      return NextResponse.json(
        { error: "Failed to fetch equipment records", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }

    equipmentAssetIds = (assets ?? []).map((asset) => asset.id);

    if (equipmentAssetIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: createPagination(page, limit, 0),
      });
    }
  }

  if (equipmentAssetId && equipmentAssetIds && !equipmentAssetIds.includes(equipmentAssetId)) {
    return NextResponse.json({
      data: [],
      pagination: createPagination(page, limit, 0),
    });
  }

  const { data, error, count } = await listEquipmentRecords(supabase, {
    from,
    to,
    equipment_asset_id: equipmentAssetId,
    equipment_asset_ids: equipmentAssetIds,
    report_month: reportMonth,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch equipment records", code: "INTERNAL_ERROR" },
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

  const parsed = createEquipmentRecordSchema.safeParse(body);
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

  const { data: asset, error: assetError } = await getEquipmentAssetById(
    supabase,
    parsed.data.equipment_asset_id,
  );

  if (assetError || !asset) {
    return NextResponse.json(
      { error: "Equipment asset not found", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(asset.department_id)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data, error } = await createEquipmentRecord(supabase, parsed.data, user.id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A record already exists for this equipment and month", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create equipment record", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
