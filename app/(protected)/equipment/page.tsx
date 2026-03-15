import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { internalApiFetch } from "@/app/actions/internal-api";
import EquipmentClient from "@/components/equipment/equipment-client";
import { getProtectedPageScope } from "@/lib/data/page-scope";
import type {
  EquipmentAssetItem,
  EquipmentRecordItem,
  EquipmentSummaryResponse,
} from "@/types/monitoring";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function EquipmentPage() {
  const scope = await getProtectedPageScope();
  const queryClient = new QueryClient();
  const month = currentMonthKey();

  const summaryQueryString = new URLSearchParams({
    month,
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();
  const assetsQueryString = new URLSearchParams({
    limit: "200",
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();
  const recordsQueryString = new URLSearchParams({
    limit: "200",
    report_month: `${month}-01`,
    ...(scope.defaultDepartmentId ? { department_id: scope.defaultDepartmentId } : {}),
  }).toString();

  const [summaryResult, assetsResult, recordsResult] = await Promise.all([
    internalApiFetch(`/api/equipment/summary?${summaryQueryString}`),
    internalApiFetch(`/api/equipment/assets?${assetsQueryString}`),
    internalApiFetch(`/api/equipment/records?${recordsQueryString}`),
  ]);

  if (summaryResult.ok && summaryResult.data) {
    queryClient.setQueryData(
      ["equipment-summary", summaryQueryString],
      summaryResult.data as EquipmentSummaryResponse,
    );
  }

  if (assetsResult.ok && assetsResult.data) {
    queryClient.setQueryData(
      ["equipment-assets", assetsQueryString],
      assetsResult.data as { data: EquipmentAssetItem[] },
    );
  }

  if (recordsResult.ok && recordsResult.data) {
    queryClient.setQueryData(
      ["equipment-records", recordsQueryString],
      recordsResult.data as { data: EquipmentRecordItem[] },
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EquipmentClient
        role={scope.role}
        defaultDepartmentId={scope.defaultDepartmentId}
        availableDepartments={scope.availableDepartments}
      />
    </HydrationBoundary>
  );
}
