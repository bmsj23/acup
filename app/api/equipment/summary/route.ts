import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import {
  buildEquipmentSummary,
} from "@/lib/data/equipment";
import {
  buildMonthRange,
  getRoleScope,
  listScopedDepartments,
  resolveScopedDepartmentId,
} from "@/lib/data/monitoring";

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
  const departmentId = searchParams.get("department_id");

  if (departmentId && !isValidUuid(departmentId)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
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

  try {
    const summary = await buildEquipmentSummary(supabase, {
      month: monthRange.month,
      reportMonth: monthRange.reportMonth,
      prevReportMonth: monthRange.prevReportMonth,
      departmentId: departmentScope.effectiveDepartmentId,
    });

    return NextResponse.json(
      {
        filters: {
          month: monthRange.month,
          report_month: monthRange.reportMonth,
          department_id: departmentScope.effectiveDepartmentId,
          available_departments: departments ?? [],
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
      { error: "Failed to fetch equipment summary", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
