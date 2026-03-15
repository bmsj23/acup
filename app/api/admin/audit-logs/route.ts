import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getUserRole } from "@/lib/data/auth";
import { getPagination, createPagination } from "@/lib/data/pagination";

const ALLOWED_ACTIONS = new Set([
  "INSERT", "UPDATE", "DELETE", "VIEW", "DOWNLOAD", "LOGIN", "LOGOUT", "ACCESS_DENIED",
]);

const ALLOWED_TABLES = new Set([
  "announcements",
  "audit_logs",
  "department_memberships",
  "department_metrics_daily",
  "department_productivity_monthly",
  "departments",
  "equipment_assets",
  "equipment_utilization_monthly",
  "incidents",
  "profiles",
  "training_compliance_monthly",
  "training_modules",
  "transaction_category_entries",
]);

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthenticatedUser(supabase);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, error: roleError } = await getUserRole(supabase, user.id);
  if (roleError || role === "department_head") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const actionFilter = searchParams.get("action");
  const tableFilter = searchParams.get("table_name");
  const performedBySearch = searchParams.get("performed_by_name");

  // validate enum filters to prevent injection
  const safeAction = actionFilter && ALLOWED_ACTIONS.has(actionFilter) ? actionFilter : null;
  const safeTable = tableFilter && ALLOWED_TABLES.has(tableFilter) ? tableFilter : null;
  const normalizedPerformerSearch = performedBySearch?.trim() ?? "";

  const isCsv = format === "csv";
  const { page, limit, from, to } = isCsv
    ? { page: 1, limit: 5000, from: 0, to: 4999 }
    : getPagination(searchParams);

  let matchingProfileIds: string[] | null = null;

  if (normalizedPerformerSearch) {
    const wildcard = `%${normalizedPerformerSearch}%`;
    const [
      { data: fullNameMatches, error: fullNameError },
      { data: emailMatches, error: emailError },
    ] = await Promise.all([
      supabase.from("profiles").select("id").ilike("full_name", wildcard).limit(100),
      supabase.from("profiles").select("id").ilike("email", wildcard).limit(100),
    ]);

    if (fullNameError || emailError) {
      return NextResponse.json({ error: "Failed to filter audit logs" }, { status: 500 });
    }

    matchingProfileIds = Array.from(
      new Set([
        ...(fullNameMatches ?? []).map((row) => row.id),
        ...(emailMatches ?? []).map((row) => row.id),
      ]),
    );

    if (matchingProfileIds.length === 0) {
      if (isCsv) {
        const headers = ["Date/Time", "User", "Action", "Table", "Record ID", "IP Address", "User Agent", "Old Data", "New Data"];
        const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

        return new Response(headers.join(","), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      return NextResponse.json({
        data: [],
        pagination: createPagination(page, limit, 0),
      });
    }
  }

  let query = supabase
    .from("audit_logs")
    .select(
      `id, table_name, record_id, action, old_data, new_data, ip_address, user_agent, performed_at,
       profiles!audit_logs_performed_by_fkey(id, full_name, email)`,
      { count: "exact" },
    )
    .order("performed_at", { ascending: false })
    .range(from, to);

  if (startDate) query = query.gte("performed_at", `${startDate}T00:00:00.000Z`);
  if (endDate) query = query.lte("performed_at", `${endDate}T23:59:59.999Z`);
  if (safeAction) query = query.eq("action", safeAction);
  if (safeTable) query = query.eq("table_name", safeTable);
  if (matchingProfileIds) query = query.in("performed_by", matchingProfileIds);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }

  type AuditRow = typeof data extends (infer R)[] | null ? R : never;

  const filtered = data ?? [];

  if (isCsv) {
    const headers = ["Date/Time", "User", "Action", "Table", "Record ID", "IP Address", "User Agent", "Old Data", "New Data"];
    const rows = (filtered as AuditRow[]).map((row) => {
      const profile = row.profiles as { full_name?: string | null; email?: string | null } | null;
      return [
        escapeCsvField(row.performed_at),
        escapeCsvField(profile?.full_name ?? profile?.email ?? ""),
        escapeCsvField(row.action),
        escapeCsvField(row.table_name),
        escapeCsvField(row.record_id),
        escapeCsvField(row.ip_address),
        escapeCsvField(row.user_agent),
        escapeCsvField(row.old_data ? JSON.stringify(row.old_data) : ""),
        escapeCsvField(row.new_data ? JSON.stringify(row.new_data) : ""),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({
    data: filtered,
    pagination: createPagination(page, limit, count),
  });
}
