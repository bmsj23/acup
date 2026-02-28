import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getUserRole } from "@/lib/data/auth";
import {
  batchTransactionCategoriesSchema,
  listTransactionCategories,
  upsertTransactionCategories,
} from "@/lib/data/transaction-categories";
import { createPagination, getPagination } from "@/lib/data/pagination";
import { writeAuditLog } from "@/lib/data/audit";

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

  const { data, error, count } = await listTransactionCategories(supabase, {
    department_id: searchParams.get("department_id") ?? undefined,
    start_date: searchParams.get("start_date") ?? undefined,
    end_date: searchParams.get("end_date") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    from,
    to,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch transaction categories", code: "INTERNAL_ERROR" },
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

  const { role, error: roleError } = await getUserRole(supabase, user.id);
  if (roleError || !role) {
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

  const parsed = batchTransactionCategoriesSchema.safeParse(body);
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

  const { data, error } = await upsertTransactionCategories(
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
      { error: "Failed to save transaction categories", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }

  await writeAuditLog(supabase, request, {
    table_name: "transaction_category_entries",
    record_id: parsed.data.department_id,
    action: "INSERT",
    new_data: parsed.data as unknown as Record<string, unknown>,
    performed_by: user.id,
  });

  return NextResponse.json({ data }, { status: 201 });
}