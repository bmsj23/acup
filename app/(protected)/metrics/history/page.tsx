import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { internalApiFetch } from "@/app/actions/internal-api";
import MetricsHistoryClient from "@/components/metrics/metrics-history-client";
import {
  buildMetricsHistoryQueryString,
  getMetricsHistoryQueryKey,
} from "@/components/metrics/metrics-history-query";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import type { MetricEntry, Pagination } from "@/components/metrics/types";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function MetricsHistoryPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();
  const currentMonth = currentMonthKey();
  const defaultQueryString = buildMetricsHistoryQueryString({
    page: 1,
    limit: 20,
    selectedPeriodType: "daily",
    selectedMonth: currentMonth,
    selectedDepartmentId: scope.defaultDepartmentId ?? "",
    selectedCategory: "all",
  });
  const metricsResult = await internalApiFetch(`/api/metrics?${defaultQueryString}`);

  if (metricsResult.ok && metricsResult.data) {
    queryClient.setQueryData(
      getMetricsHistoryQueryKey(defaultQueryString),
      metricsResult.data as { data: MetricEntry[]; pagination: Pagination },
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MetricsHistoryClient
        role={scope.role}
        defaultDepartmentId={scope.defaultDepartmentId}
        availableDepartments={scope.availableDepartments}
      />
    </HydrationBoundary>
  );
}
