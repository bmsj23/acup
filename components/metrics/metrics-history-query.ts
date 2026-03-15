type MetricsHistoryQueryParams = {
  page: number;
  limit: number;
  selectedMonth: string;
  selectedDepartmentId: string;
};

export function buildMetricsHistoryQueryString({
  page,
  limit,
  selectedMonth,
  selectedDepartmentId,
}: MetricsHistoryQueryParams) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (selectedDepartmentId) {
    params.set("department_id", selectedDepartmentId);
  }

  const [year, month] = selectedMonth.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  params.set("start_date", startDate);
  params.set("end_date", endDate);

  return params.toString();
}

export function getMetricsHistoryQueryKey(queryString: string) {
  return ["metrics", queryString] as const;
}
