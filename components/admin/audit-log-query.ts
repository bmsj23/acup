export const AUDIT_LOG_PAGE_SIZE = 25;

type AuditLogQueryParams = {
  page: number;
  startDate: string;
  endDate: string;
  selectedAction: string;
  selectedTable: string;
  userSearch: string;
};

export function buildAuditLogsQueryString({
  page,
  startDate,
  endDate,
  selectedAction,
  selectedTable,
  userSearch,
}: AuditLogQueryParams) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(AUDIT_LOG_PAGE_SIZE));

  if (startDate) {
    params.set("start_date", startDate);
  }

  if (endDate) {
    params.set("end_date", endDate);
  }

  if (selectedAction) {
    params.set("action", selectedAction);
  }

  if (selectedTable) {
    params.set("table_name", selectedTable);
  }

  if (userSearch.trim()) {
    params.set("performed_by_name", userSearch.trim());
  }

  return params.toString();
}

export function getAuditLogsQueryKey(queryString: string) {
  return ["audit-logs", queryString] as const;
}
