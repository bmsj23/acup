import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import { listSubdepartments } from "@/lib/data/subdepartments";
import { createPagination, getPagination } from "@/lib/data/pagination";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);
  const departmentIdFilter = searchParams.get("department_id");
  const isActiveFilter = searchParams.get("is_active");

  if (departmentIdFilter && !isValidUuid(departmentIdFilter)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { data, error, count } = await listSubdepartments(supabase, {
    from,
    to,
    department_id: departmentIdFilter,
    is_active:
      isActiveFilter === "true"
        ? true
        : isActiveFilter === "false"
          ? false
          : null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch subdepartments", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: createPagination(page, limit, count),
  });
}
