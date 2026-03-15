import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import IncidentsClient from "@/components/incidents/incidents-client";
import {
  buildIncidentListQueryString,
  getIncidentDepartmentsQueryKey,
  getIncidentListQueryKey,
} from "@/components/incidents/queries";
import { internalApiFetch } from "@/app/actions/internal-api";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import type { DepartmentItem, IncidentsResponse } from "@/components/incidents/types";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function IncidentsPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();
  const listQueryString = buildIncidentListQueryString({
    page: 1,
    limit: 10,
    search: "",
    resolutionFilter: "open",
    incidentTypeFilter: "all",
    departmentFilter: "all",
    selectedMonth: currentMonthKey(),
    monthFilterActive: false,
  });

  const [incidentsResult, departmentsResult] = await Promise.all([
    internalApiFetch(`/api/incidents?${listQueryString}`),
    internalApiFetch("/api/departments?limit=200"),
  ]);

  if (incidentsResult.ok && incidentsResult.data) {
    queryClient.setQueryData(
      getIncidentListQueryKey(listQueryString),
      incidentsResult.data as IncidentsResponse,
    );
  }

  if (departmentsResult.ok && departmentsResult.data) {
    queryClient.setQueryData(
      getIncidentDepartmentsQueryKey(),
      ((departmentsResult.data as { data?: DepartmentItem[] }).data ?? []) as DepartmentItem[],
    );
  }

  const userDepartmentName =
    scope.availableDepartments.find(
      (department) => department.id === scope.defaultDepartmentId,
    )?.name ?? null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IncidentsClient
        role={scope.role}
        userDepartmentId={scope.defaultDepartmentId}
        userDepartmentName={userDepartmentName}
      />
    </HydrationBoundary>
  );
}
