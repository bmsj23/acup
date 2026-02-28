import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import {
  getIncidentById,
  updateIncidentById,
  updateIncidentSchema,
  deleteIncidentById,
} from "@/lib/data/incidents";
import { writeAuditLog } from "@/lib/data/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data, error } = await getIncidentById(supabase, id);

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Incident not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch incident", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
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

  const parsed = updateIncidentSchema.safeParse(body);
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

  const { data: existing } = await getIncidentById(supabase, id);

  const { data, error } = await updateIncidentById(supabase, id, parsed.data);

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Incident not found", code: "NOT_FOUND" },
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
      { error: "Failed to update incident", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  await writeAuditLog(supabase, request, {
    table_name: "incidents",
    record_id: id,
    action: "UPDATE",
    old_data: existing as Record<string, unknown> | null,
    new_data: data as Record<string, unknown>,
    performed_by: user.id,
  });

  return NextResponse.json({ data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: existing } = await getIncidentById(supabase, id);

  if (existing?.file_storage_path) {
    await supabase.storage
      .from("incident-files")
      .remove([existing.file_storage_path]);
  }

  const { error } = await deleteIncidentById(supabase, id);

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Incident not found", code: "NOT_FOUND" },
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
      { error: "Failed to delete incident", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  await writeAuditLog(supabase, request, {
    table_name: "incidents",
    record_id: id,
    action: "DELETE",
    old_data: existing as Record<string, unknown> | null,
    performed_by: user.id,
  });

  return NextResponse.json({ success: true });
}