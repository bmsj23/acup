import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { internalApiFetch } from "@/app/actions/internal-api";
import TrainingClient from "@/components/training/training-client";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import type {
  TrainingComplianceItem,
  TrainingModuleItem,
  TrainingSummaryResponse,
} from "@/types/monitoring";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TrainingPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();
  const month = currentMonthKey();

  const summaryQueryString = new URLSearchParams({
    month,
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();
  const modulesQueryString = new URLSearchParams({
    limit: "200",
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();
  const complianceQueryString = new URLSearchParams({
    limit: "200",
    report_month: `${month}-01`,
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();

  const [summaryResult, modulesResult, complianceResult] = await Promise.all([
    internalApiFetch(`/api/training/summary?${summaryQueryString}`),
    internalApiFetch(`/api/training/modules?${modulesQueryString}`),
    internalApiFetch(`/api/training/compliance?${complianceQueryString}`),
  ]);

  if (summaryResult.ok && summaryResult.data) {
    queryClient.setQueryData(
      ["training-summary", summaryQueryString],
      summaryResult.data as TrainingSummaryResponse,
    );
  }

  if (modulesResult.ok && modulesResult.data) {
    queryClient.setQueryData(
      ["training-modules", modulesQueryString],
      modulesResult.data as { data: TrainingModuleItem[] },
    );
  }

  if (complianceResult.ok && complianceResult.data) {
    queryClient.setQueryData(
      ["training-compliance", complianceQueryString],
      complianceResult.data as { data: TrainingComplianceItem[] },
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TrainingClient
        role={scope.role}
        defaultDepartmentId={scope.defaultDepartmentId}
        availableDepartments={scope.availableDepartments}
      />
    </HydrationBoundary>
  );
}
