import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { getDepartmentById } from "@/lib/data/departments";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import {
  getRoleScope,
  listScopedDepartments,
  resolveScopedDepartmentId,
} from "@/lib/data/monitoring";
import {
  createTurnaroundTimeEntry,
  createTurnaroundTimeEntrySchema,
  listTurnaroundTimeEntries,
} from "@/lib/data/turnaround-time";

type TurnaroundTimeListRow = {
  id: string;
  department_id: string;
  subdepartment_id: string | null;
  service_name: string;
  case_reference: string;
  started_at: string;
  completed_at: string;
  notes: string | null;
  recorded_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);
  const departmentId = searchParams.get("department_id");
  const subdepartmentId = searchParams.get("subdepartment_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const service = searchParams.get("service");

  if (departmentId && !isValidUuid(departmentId)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (subdepartmentId && !isValidUuid(subdepartmentId)) {
    return NextResponse.json(
      { error: "Invalid subdepartment id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const departmentScope = resolveScopedDepartmentId({
    role,
    memberDepartmentIds,
    requestedDepartmentId: departmentId,
  });

  if (departmentScope.forbidden) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const { data: departments, error: departmentsError } = await listScopedDepartments(supabase, {
    role,
    memberDepartmentIds,
  });

  if (departmentsError) {
    return NextResponse.json(
      { error: "Failed to fetch departments", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const turnaroundDepartments = (departments ?? []).filter((department) =>
    getDepartmentCapabilities(department).supportsTurnaroundTime,
  );
  const effectiveDepartmentId = departmentScope.effectiveDepartmentId;

  if (role === "department_head" && !effectiveDepartmentId) {
    return NextResponse.json(
      { error: "Forbidden", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (
    effectiveDepartmentId
    && !turnaroundDepartments.some((department) => department.id === effectiveDepartmentId)
  ) {
    return NextResponse.json(
      {
        error:
          role === "department_head"
            ? "Forbidden"
            : "Turnaround time is not enabled for this department",
        code: role === "department_head" ? "FORBIDDEN" : "VALIDATION_ERROR",
      },
      { status: role === "department_head" ? 403 : 400 },
    );
  }

  const { data, error, count } = await listTurnaroundTimeEntries(supabase, {
    from,
    to,
    department_id: effectiveDepartmentId,
    subdepartment_id: subdepartmentId,
    start_date: startDate,
    end_date: endDate,
    service,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch turnaround time entries", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  const entries = (data ?? []) as unknown as TurnaroundTimeListRow[];

  return NextResponse.json({
    data: entries.map((entry) => ({
      ...entry,
      duration_minutes:
        Math.max(
          0,
          Math.round(
            (new Date(entry.completed_at as string).getTime()
              - new Date(entry.started_at as string).getTime())
            / 60_000,
          ),
        ),
    })),
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

  const parsed = createTurnaroundTimeEntrySchema.safeParse(body);
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

  const { data: department, error: departmentError } = await getDepartmentById(
    supabase,
    parsed.data.department_id,
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

  const { data, error } = await createTurnaroundTimeEntry(
    supabase,
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
      { error: "Failed to create turnaround time entry", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
