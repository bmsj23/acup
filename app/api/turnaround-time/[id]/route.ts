import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getDepartmentById } from "@/lib/data/departments";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import { getRoleScope } from "@/lib/data/monitoring";
import {
  deleteTurnaroundTimeEntryById,
  getTurnaroundTimeEntryById,
  updateTurnaroundTimeEntryById,
  updateTurnaroundTimeEntrySchema,
  validateTurnaroundTimeUpdateWindow,
} from "@/lib/data/turnaround-time";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TurnaroundTimeEntryShape = {
  id: string;
  department_id: string;
  started_at: string;
  completed_at: string;
};

function canAccessEntry(
  role: "avp" | "division_head" | "department_head",
  memberDepartmentIds: string[],
  departmentId: string,
) {
  return role !== "department_head" || memberDepartmentIds.includes(departmentId);
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid turnaround time entry id", code: "VALIDATION_ERROR" },
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

  const { data: entryRaw, error } = await getTurnaroundTimeEntryById(supabase, id);

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Turnaround time entry not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch turnaround time entry", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const entry = (entryRaw ?? null) as unknown as TurnaroundTimeEntryShape | null;

  if (!entry) {
    return NextResponse.json(
      { error: "Turnaround time entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!canAccessEntry(role, memberDepartmentIds, entry.department_id)) {
    return NextResponse.json(
      { error: "Turnaround time entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: entry });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid turnaround time entry id", code: "VALIDATION_ERROR" },
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

  const parsed = updateTurnaroundTimeEntrySchema.safeParse(body);
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

  const { data: existingRaw, error: existingError } = await getTurnaroundTimeEntryById(
    supabase,
    id,
  );

  const existing = (existingRaw ?? null) as unknown as TurnaroundTimeEntryShape | null;

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Turnaround time entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!canAccessEntry(role, memberDepartmentIds, existing.department_id)) {
    return NextResponse.json(
      { error: "Turnaround time entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const nextDepartmentId = parsed.data.department_id ?? existing.department_id;

  if (
    role === "department_head"
    && !memberDepartmentIds.includes(nextDepartmentId)
  ) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data: department, error: departmentError } = await getDepartmentById(
    supabase,
    nextDepartmentId,
  );

  if (departmentError || !department) {
    return NextResponse.json(
      { error: "Department not found", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (!getDepartmentCapabilities(department).supportsTurnaroundTime) {
    return NextResponse.json(
      {
        error: "Turnaround time is not enabled for this department",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const startedAt = parsed.data.started_at ?? existing.started_at;
  const completedAt = parsed.data.completed_at ?? existing.completed_at;

  if (!validateTurnaroundTimeUpdateWindow(startedAt, completedAt)) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: {
          completed_at: ["completed_at must be on or after started_at"],
        },
      },
      { status: 400 },
    );
  }

  const { data, error } = await updateTurnaroundTimeEntryById(
    supabase,
    id,
    parsed.data,
    user.id,
  );

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update turnaround time entry", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid turnaround time entry id", code: "VALIDATION_ERROR" },
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

  const { data: existingRaw, error: existingError } = await getTurnaroundTimeEntryById(
    supabase,
    id,
  );

  const existing = (existingRaw ?? null) as unknown as TurnaroundTimeEntryShape | null;

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Turnaround time entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!canAccessEntry(role, memberDepartmentIds, existing.department_id)) {
    return NextResponse.json(
      { error: "Turnaround time entry not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const { error } = await deleteTurnaroundTimeEntryById(supabase, id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete turnaround time entry", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
