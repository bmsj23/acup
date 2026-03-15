import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { internalApiFetch } from "@/app/actions/internal-api";
import AnnouncementsClient from "@/components/announcements/announcements-client";
import type {
  AnnouncementsResponse,
  DepartmentItem,
} from "@/components/announcements/types";
import { getProtectedPageScope } from "@/lib/data/page-scope";

export default async function AnnouncementsPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();
  const userDepartmentId = scope.defaultDepartmentId;
  const userDepartmentName =
    scope.availableDepartments.find((department) => department.id === userDepartmentId)?.name ??
    null;

  const defaultQueryString = new URLSearchParams({
    page: "1",
    limit: "8",
  }).toString();

  const [announcementsResult, departmentsResult] = await Promise.all([
    internalApiFetch(`/api/announcements?${defaultQueryString}`),
    internalApiFetch("/api/departments?limit=200"),
  ]);

  if (announcementsResult.ok && announcementsResult.data) {
    queryClient.setQueryData(
      ["announcements", defaultQueryString],
      announcementsResult.data as AnnouncementsResponse,
    );
  }

  if (departmentsResult.ok && departmentsResult.data) {
    queryClient.setQueryData(
      ["departments"],
      ((departmentsResult.data as { data?: DepartmentItem[] }).data ?? []) as DepartmentItem[],
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnnouncementsClient
        role={scope.role}
        userDepartmentId={userDepartmentId}
        userDepartmentName={userDepartmentName}
      />
    </HydrationBoundary>
  );
}
