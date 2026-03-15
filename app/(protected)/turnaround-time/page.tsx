import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { internalApiFetch } from "@/app/actions/internal-api";
import TurnaroundTimeClient from "@/components/turnaround-time/turnaround-time-client";
import {
  buildTurnaroundTimeListQueryString,
  buildTurnaroundTimeSummaryQueryString,
  getTurnaroundTimeListQueryKey,
  getTurnaroundTimeSummaryQueryKey,
} from "@/components/turnaround-time/queries";
import type { TurnaroundTimeListResponse } from "@/components/turnaround-time/types";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import { getDepartmentCapabilities } from "@/lib/data/department-capabilities";
import type { TurnaroundTimeSummaryResponse } from "@/types/monitoring";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TurnaroundTimePage() {
  const scope = await getProtectedPageScope();
  const turnaroundDepartments = scope.availableDepartments.filter((department) =>
    getDepartmentCapabilities(department).supportsTurnaroundTime,
  );

  if (
    scope.role === "department_head"
    && !getDepartmentCapabilities(scope.defaultDepartment).supportsTurnaroundTime
  ) {
    redirect("/dashboard");
  }

  const queryClient = new QueryClient();
  const selectedMonth = currentMonthKey();
  const defaultDepartmentId =
    scope.role === "department_head" ? scope.defaultDepartmentId ?? "" : "";

  const summaryQueryString = buildTurnaroundTimeSummaryQueryString({
    selectedMonth,
    selectedDepartmentId: defaultDepartmentId,
    selectedSubdepartmentId: "",
    serviceFilter: "",
  });
  const listQueryString = buildTurnaroundTimeListQueryString({
    page: 1,
    limit: 20,
    selectedMonth,
    selectedDepartmentId: defaultDepartmentId,
    selectedSubdepartmentId: "",
    serviceFilter: "",
  });

  const [summaryResult, listResult] = await Promise.all([
    internalApiFetch(`/api/turnaround-time/summary?${summaryQueryString}`),
    internalApiFetch(`/api/turnaround-time?${listQueryString}`),
  ]);

  if (summaryResult.ok && summaryResult.data) {
    queryClient.setQueryData(
      getTurnaroundTimeSummaryQueryKey(summaryQueryString),
      summaryResult.data as TurnaroundTimeSummaryResponse,
    );
  }

  if (listResult.ok && listResult.data) {
    queryClient.setQueryData(
      getTurnaroundTimeListQueryKey(listQueryString),
      listResult.data as TurnaroundTimeListResponse,
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TurnaroundTimeClient
        role={scope.role}
        defaultDepartmentId={defaultDepartmentId}
        availableDepartments={turnaroundDepartments}
      />
    </HydrationBoundary>
  );
}
