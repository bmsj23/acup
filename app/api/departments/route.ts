import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { listDepartments } from "@/lib/data/departments";
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
  const activeFilter = searchParams.get("is_active");

  const { data, error, count } = await listDepartments(supabase, {
    from,
    to,
    is_active:
      activeFilter === "true"
        ? true
        : activeFilter === "false"
          ? false
          : null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch departments", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: createPagination(page, limit, count),
  });
}