import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, isValidUuid } from "@/lib/data/auth";
import {
  getDepartmentById,
  listDepartmentMembers,
} from "@/lib/data/departments";
import { createPagination, getPagination } from "@/lib/data/pagination";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { error: "Invalid department id", code: "VALIDATION_ERROR" },
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

  const { data: department, error: departmentError } = await getDepartmentById(
    supabase,
    id,
  );

  if (departmentError || !department) {
    return NextResponse.json(
      { error: "Department not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, from, to } = getPagination(searchParams);

  const { data: memberships, error, count } = await listDepartmentMembers(
    supabase,
    {
      department_id: id,
      from,
      to,
    },
  );

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch department members", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: memberships ?? [],
    pagination: createPagination(page, limit, count),
  });
}