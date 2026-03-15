import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { internalApiFetch } from "@/app/actions/internal-api";
import AuditLogClient from "@/components/admin/audit-log-client";
import {
  buildAuditLogsQueryString,
  getAuditLogsQueryKey,
} from "@/components/admin/audit-log-query";
import { getProtectedPageScope } from "@/lib/data/page-scope";

type AuditLogProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type AuditLogEntry = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string;
  profiles: AuditLogProfile | null;
};

type AuditLogsResponse = {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export default async function AuditPage() {
  const scope = await getProtectedPageScope();

  if (scope.role === "department_head") {
    redirect("/dashboard");
  }

  const queryClient = new QueryClient();
  const defaultQueryString = buildAuditLogsQueryString({
    page: 1,
    startDate: "",
    endDate: "",
    selectedAction: "",
    selectedTable: "",
    userSearch: "",
  });
  const auditLogsResult = await internalApiFetch(
    `/api/admin/audit-logs?${defaultQueryString}`,
  );

  if (auditLogsResult.ok && auditLogsResult.data) {
    queryClient.setQueryData(
      getAuditLogsQueryKey(defaultQueryString),
      auditLogsResult.data as AuditLogsResponse,
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuditLogClient />
    </HydrationBoundary>
  );
}
