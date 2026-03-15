import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function isLeadershipRole(role: UserRole | null | undefined): role is "avp" | "division_head" {
  return role === "avp" || role === "division_head";
}

export function normalizeMonthKey(raw?: string | null): string {
  const match = raw?.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

export function toReportMonthDate(month: string): string {
  return `${month}-01`;
}

export function toMonthKeyFromDate(value: string): string {
  return value.slice(0, 7);
}

export function shiftMonthKey(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(month: string) {
  const [, monthValue] = month.split("-").map(Number);
  return MONTH_LABELS[monthValue - 1] ?? month;
}

export function buildTrailingMonths(month: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const nextMonth = shiftMonthKey(month, index - (count - 1));

    return {
      month: nextMonth,
      report_month: toReportMonthDate(nextMonth),
    };
  });
}

export function buildMonthRange(monthParam?: string | null) {
  const month = normalizeMonthKey(monthParam);
  const [year, monthIndex] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthIndex - 1, 1));
  const endDate = new Date(Date.UTC(year, monthIndex, 0));
  const prevStartDate = new Date(Date.UTC(year, monthIndex - 2, 1));
  const prevEndDate = new Date(Date.UTC(year, monthIndex - 1, 0));
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return {
    month,
    reportMonth: toReportMonthDate(month),
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
    prevMonth: shiftMonthKey(month, -1),
    prevReportMonth: toReportMonthDate(shiftMonthKey(month, -1)),
    prevStart: prevStartDate.toISOString().slice(0, 10),
    prevEnd: prevEndDate.toISOString().slice(0, 10),
    isPastMonth: month < currentMonth,
    currentMonth,
  };
}

export function percentageFromRatio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function ratePerThousand(numerator: number, denominator: number | null) {
  if (!denominator || denominator <= 0) {
    return null;
  }

  return Number(((numerator / denominator) * 1000).toFixed(2));
}

export function roundToTwo(value: number) {
  return Number(value.toFixed(2));
}

export async function getRoleScope(
  supabase: SupabaseClient,
  userId: string,
) {
  const [{ data: profile, error: profileError }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", userId).single(),
      supabase
        .from("department_memberships")
        .select("department_id")
        .eq("user_id", userId)
        .order("joined_at", { ascending: true }),
    ]);

  const role = (profile?.role as UserRole | undefined) ?? null;
  const memberDepartmentIds = (memberships ?? []).map((membership) => membership.department_id);

  return {
    role,
    memberDepartmentIds,
    primaryDepartmentId: memberDepartmentIds[0] ?? null,
    error: profileError ?? membershipError ?? null,
  };
}

export function resolveScopedDepartmentId(params: {
  role: UserRole;
  memberDepartmentIds: string[];
  requestedDepartmentId?: string | null;
}) {
  const { role, memberDepartmentIds, requestedDepartmentId } = params;

  if (role !== "department_head") {
    return {
      forbidden: false,
      effectiveDepartmentId: requestedDepartmentId ?? null,
    };
  }

  if (
    requestedDepartmentId
    && !memberDepartmentIds.includes(requestedDepartmentId)
  ) {
    return {
      forbidden: true,
      effectiveDepartmentId: null,
    };
  }

  return {
    forbidden: false,
    effectiveDepartmentId: requestedDepartmentId ?? memberDepartmentIds[0] ?? null,
  };
}

export async function listScopedDepartments(
  supabase: SupabaseClient,
  params: {
    role: UserRole;
    memberDepartmentIds: string[];
  },
) {
  let query = supabase
    .from("departments")
    .select("id, name, code, is_active, is_census, is_revenue, supports_turnaround_time")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (params.role === "department_head") {
    query = query.in(
      "id",
      params.memberDepartmentIds.length > 0
        ? params.memberDepartmentIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  }

  return await query;
}
