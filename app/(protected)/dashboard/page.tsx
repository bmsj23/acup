import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { internalApiFetch } from "@/app/actions/internal-api";
import OperationsDashboardClient from "@/components/dashboard/operations-dashboard-client";
import type { UserRole } from "@/types/database";
import type { MetricsSummaryResponse } from "@/components/dashboard/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("department_memberships")
    .select("department_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  const month = new Date().toISOString().slice(0, 7);
  const deptId = memberships?.[0]?.department_id ?? null;

  // pre-fetch dashboard data server-side to eliminate client-side loading delay
  const params = new URLSearchParams({ month });
  if (deptId && profile.role === "department_head") params.set("department_id", deptId);

  const [summaryResult, incidentsResult] = await Promise.all([
    internalApiFetch(`/api/metrics/summary?${params.toString()}`),
    internalApiFetch("/api/incidents?is_resolved=false&limit=5"),
  ]);

  const initialSummary = summaryResult.ok
    ? (summaryResult.data as MetricsSummaryResponse)
    : null;

  const initialIncidents = incidentsResult.ok
    ? ((incidentsResult.data as { data?: { id: string; sbar_situation: string; date_of_incident: string; departments?: { name: string } | null }[] })?.data ?? [])
    : [];

  return (
    <OperationsDashboardClient
      role={profile.role as UserRole}
      defaultDepartmentId={deptId}
      month={month}
      initialSummary={initialSummary}
      initialIncidents={initialIncidents}
    />
  );
}