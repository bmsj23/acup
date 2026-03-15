import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import {
  buildMonthRange,
  getRoleScope,
  listScopedDepartments,
  resolveScopedDepartmentId,
} from "@/lib/data/monitoring";
import { buildTurnaroundTimeSummary } from "@/lib/data/turnaround-time";

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
  const departmentId = searchParams.get("department_id");
  const subdepartmentId = searchParams.get("subdepartment_id");
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

  const monthRange = buildMonthRange(searchParams.get("month"));
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

  try {
    const summary = await buildTurnaroundTimeSummary(supabase, {
      startDate: monthRange.start,
      endDate: monthRange.end,
      departmentId: effectiveDepartmentId,
      subdepartmentId,
      service,
    });

    return NextResponse.json(
      {
        filters: {
          month: monthRange.month,
          department_id: effectiveDepartmentId,
          subdepartment_id: subdepartmentId,
          service,
          available_departments: turnaroundDepartments,
        },
        role_scope: {
          role,
          member_department_ids: memberDepartmentIds,
        },
        ...summary,
      },
      {
        headers: {
          "Cache-Control": monthRange.isPastMonth
            ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
            : "private, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch turnaround time summary", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
