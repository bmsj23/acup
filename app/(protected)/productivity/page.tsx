import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { internalApiFetch } from "@/app/actions/internal-api";
import ProductivityClient from "@/components/productivity/productivity-client";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import type {
  ProductivityRecordItem,
  ProductivitySummaryResponse,
} from "@/types/monitoring";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ProductivityPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();
  const month = currentMonthKey();

  const summaryQueryString = new URLSearchParams({
    month,
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();
  const recordsQueryString = new URLSearchParams({
    report_month: `${month}-01`,
    limit: "100",
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();

  const [summaryResult, recordsResult] = await Promise.all([
    internalApiFetch(`/api/productivity/summary?${summaryQueryString}`),
    internalApiFetch(`/api/productivity?${recordsQueryString}`),
  ]);

  if (summaryResult.ok && summaryResult.data) {
    queryClient.setQueryData(
      ["productivity-summary", summaryQueryString],
      summaryResult.data as ProductivitySummaryResponse,
    );
  }

  if (recordsResult.ok && recordsResult.data) {
    queryClient.setQueryData(
      ["productivity-records", recordsQueryString],
      recordsResult.data as { data: ProductivityRecordItem[] },
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductivityClient
        role={scope.role}
        defaultDepartmentId={scope.defaultDepartmentId}
        availableDepartments={scope.availableDepartments}
      />
    </HydrationBoundary>
  );
}
