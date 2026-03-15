import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { internalApiFetch } from "@/app/actions/internal-api";
import OperationsDashboardClient from "@/components/dashboard/operations-dashboard-client";
import {
  buildDashboardScopeQueryString,
  getDashboardNonRevenueQueryKey,
  getDashboardOverviewQueryKey,
} from "@/components/dashboard/queries";
import { getCachedMembership, getCachedProfile, getCachedUser } from "@/lib/data/auth";
import { NON_REVENUE_DEPARTMENT_CODES } from "@/lib/constants/departments";
import type { UserRole } from "@/types/database";
import type {
  DashboardNonRevenueResponse,
  DashboardOverviewResponse,
} from "@/types/monitoring";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(user.id);

  if (!profile?.role) {
    redirect("/login");
  }

  const membership = await getCachedMembership(user.id);
  const month = currentMonthKey();
  const defaultDepartmentId = membership?.department_id ?? null;
  const departmentCode = (
    membership?.departments as { code?: string } | null
  )?.code;
  const defaultDashboardView =
    departmentCode
    && NON_REVENUE_DEPARTMENT_CODES.includes(departmentCode as never)
      ? "non-revenue"
      : "revenue";

  const queryClient = new QueryClient();
  const queryString = buildDashboardScopeQueryString(
    month,
    defaultDepartmentId ?? "",
  );

  const overviewResult = await internalApiFetch(
    `/api/dashboard/overview?${queryString}`,
  );

  if (overviewResult.ok && overviewResult.data) {
    queryClient.setQueryData(
      getDashboardOverviewQueryKey(month, defaultDepartmentId ?? ""),
      overviewResult.data as DashboardOverviewResponse,
    );
  }

  if (
    profile.role === "avp"
    || profile.role === "division_head"
    || defaultDashboardView === "non-revenue"
  ) {
    const nonRevenueResult = await internalApiFetch(
      `/api/dashboard/non-revenue?${queryString}`,
    );

    if (nonRevenueResult.ok && nonRevenueResult.data) {
      queryClient.setQueryData(
        getDashboardNonRevenueQueryKey(month, defaultDepartmentId ?? ""),
        nonRevenueResult.data as DashboardNonRevenueResponse,
      );
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OperationsDashboardClient
        role={profile.role as UserRole}
        defaultDepartmentId={defaultDepartmentId}
        month={month}
        defaultDashboardView={defaultDashboardView}
      />
    </HydrationBoundary>
  );
}
