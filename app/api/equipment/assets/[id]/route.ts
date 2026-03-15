import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getRoleScope, isLeadershipRole } from "@/lib/data/monitoring";
import {
  deleteEquipmentAssetById,
  getEquipmentAssetById,
  updateEquipmentAssetById,
  updateEquipmentAssetSchema,
} from "@/lib/data/equipment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid equipment asset id", code: "VALIDATION_ERROR" },
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

  const { data, error } = await getEquipmentAssetById(supabase, id);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Equipment asset not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch equipment asset", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid equipment asset id", code: "VALIDATION_ERROR" },
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

  const { role, error: scopeError } = await getRoleScope(supabase, user.id);
  if (scopeError || !role || !isLeadershipRole(role)) {
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

  const parsed = updateEquipmentAssetSchema.safeParse(body);
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

  const { data, error } = await updateEquipmentAssetById(supabase, id, parsed.data);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Equipment asset not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Equipment asset already exists in this department", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update equipment asset", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid equipment asset id", code: "VALIDATION_ERROR" },
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

  const { role, error: scopeError } = await getRoleScope(supabase, user.id);
  if (scopeError || !role || !isLeadershipRole(role)) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { error } = await deleteEquipmentAssetById(supabase, id);
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Equipment asset not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete equipment asset", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
