import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/data/auth";
import {
  createAnnouncement,
  createAnnouncementSchema,
  listAnnouncements,
} from "@/lib/data/announcements";
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
  const searchFilter = searchParams.get("search");
  const priorityFilter = searchParams.get("priority");
  const departmentIdFilter = searchParams.get("department_id");
  const systemWideFilter = searchParams.get("is_system_wide");

  const { data, error, count } = await listAnnouncements(supabase, {
    from,
    to,
    search: searchFilter,
    priority: priorityFilter,
    department_id: departmentIdFilter,
    is_system_wide:
      systemWideFilter === "true"
        ? true
        : systemWideFilter === "false"
          ? false
          : null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch announcements", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = createAnnouncementSchema.safeParse(body);
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

  const payload = parsed.data;

  const { data, error } = await createAnnouncement(supabase, payload, user.id);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create announcement", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}