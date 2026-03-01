import { redirect } from "next/navigation";
import { getCachedUser, getCachedProfile, getCachedMembership } from "@/lib/data/auth";
import { internalApiFetch } from "@/app/actions/internal-api";
import OperationsDashboardClient from "@/components/dashboard/operations-dashboard-client";
import type { UserRole } from "@/types/database";
import type { MetricsSummaryResponse } from "@/components/dashboard/types";

export default async function DashboardPage() {
  // reuses cached results from the protected layout — no duplicate db calls
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(user.id);

  if (!profile?.role) {
    redirect("/login");
  }

  const membership = await getCachedMembership(user.id);

  const month = new Date().toISOString().slice(0, 7);
  const deptId = membership?.department_id ?? null;

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