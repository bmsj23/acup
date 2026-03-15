import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  getIncidentById,
  updateIncidentById,
  updateIncidentSchema,
  deleteIncidentById,
} from "@/lib/data/incidents";
import { writeAuditLog } from "@/lib/data/audit";

type RouteParams = { params: Promise<{ id: string }> };

function canAccessIncident(
  params: {
    role: "avp" | "division_head" | "department_head";
    userId: string;
    memberDepartmentIds: string[];
  },
  incident: {
    department_id?: string;
    reported_by?: string | null;
  } | null,
) {
  if (!incident) {
    return false;
  }

  if (params.role !== "department_head") {
    return true;
  }

  return (
    incident.reported_by === params.userId
    && !!incident.department_id
    && params.memberDepartmentIds.includes(incident.department_id)
  );
}

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

  const { role, memberDepartmentIds, error: scopeError } = await getRoleScope(
    supabase,
    user.id,
  );

  if (scopeError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
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

  if (
    !canAccessIncident(
      { role, userId: user.id, memberDepartmentIds },
      data as { department_id?: string; reported_by?: string | null } | null,
    )
  ) {
    return NextResponse.json(
      { error: "Incident not found", code: "NOT_FOUND" },
      { status: 404 },
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

  const { role, memberDepartmentIds, error: scopeError } = await getRoleScope(
    supabase,
    user.id,
  );

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

  if (
    !canAccessIncident(
      { role, userId: user.id, memberDepartmentIds },
      existing as { department_id?: string; reported_by?: string | null } | null,
    )
  ) {
    return NextResponse.json(
      { error: "Incident not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

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

  const { role, memberDepartmentIds, error: scopeError } = await getRoleScope(
    supabase,
    user.id,
  );

  if (scopeError || !role) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data: existing } = await getIncidentById(supabase, id);

  if (
    !canAccessIncident(
      { role, userId: user.id, memberDepartmentIds },
      existing as { department_id?: string; reported_by?: string | null } | null,
    )
  ) {
    return NextResponse.json(
      { error: "Incident not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

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
