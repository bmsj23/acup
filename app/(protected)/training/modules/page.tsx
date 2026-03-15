import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { internalApiFetch } from "@/app/actions/internal-api";
import TrainingModulesClient from "@/components/training/training-modules-client";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import type { TrainingModuleItem } from "@/types/monitoring";

export default async function TrainingModulesPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();

  const modulesQueryString = new URLSearchParams({
    limit: "200",
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();

  const modulesResult = await internalApiFetch(
    `/api/training/modules?${modulesQueryString}`,
  );

  if (modulesResult.ok && modulesResult.data) {
    queryClient.setQueryData(
      ["training-modules", modulesQueryString],
      modulesResult.data as { data: TrainingModuleItem[] },
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TrainingModulesClient
        role={scope.role}
        defaultDepartmentId={scope.defaultDepartmentId}
        availableDepartments={scope.availableDepartments}
      />
    </HydrationBoundary>
  );
}
